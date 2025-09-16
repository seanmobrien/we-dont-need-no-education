/**
 * @fileoverview Stream Chunk Handlers for Chat History Middleware
 *
 * This module provides utility functions for handling different types of streaming chunks
 * in the chat history middleware. Each handler is responsible for processing a specific
 * type of stream chunk and updating the database accordingly.
 *
 * @module lib/ai/middleware/chat-history/stream-handlers
 * @version 1.0.0
 * @since 2025-07-17
 */

import type {
  LanguageModelV2ToolResultPart,
  LanguageModelV2StreamPart,
  LanguageModelV2ToolCall,
} from '@ai-sdk/provider';
import { chatMessages, chatTurns, tokenUsage } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import {
  ChatMessagesType,
  DbTransactionType,
  drizDb,
  schema,
} from '@/lib/drizzle-db';
import { log } from '@/lib/logger';
import { getNextSequence } from './utility';
import type { StreamHandlerContext, StreamHandlerResult } from './types';
import { instrumentStreamChunk } from './instrumentation';
import { ensureCreateResult } from './stream-handler-result';
import { reserveMessageIds } from './import-incoming-message';
import { LoggedError } from '@/lib/react-util/errors/logged-error';

// ---------------------------------------------------------------------------
// Lightweight per-id buffers for explicit streaming types
// ---------------------------------------------------------------------------
/**
 * Unique symbol used to store a Map of open text buffers on the context.
 *
 * The map is keyed by chunk id and stores the accumulated text until a
 * corresponding `text-end` event is received.
 */
const OPEN_TEXT_SYM = Symbol.for('chat-history.openTextBuffers');

/**
 * Unique symbol used to store a Map of open reasoning buffers on the context.
 *
 * The map is keyed by chunk id and stores the accumulated reasoning content
 * until a corresponding `reasoning-end` event is received.
 */
const OPEN_REASONING_SYM = Symbol.for('chat-history.openReasoningBuffers');

/**
 * Unique symbol used to store a Map of open tool-input buffers on the context.
 *
 * The map is keyed by chunk id and stores an object containing the tool name
 * (if provided) and the raw input value until `tool-input-end` finalizes it.
 */
const OPEN_TOOL_INPUT_SYM = Symbol.for('chat-history.openToolInputBuffers');

/**
 * Buffer structure used during streaming to accumulate tool input.
 * - `toolName` may be undefined if not provided by the stream part
 * - `value` contains the raw concatenated input text (possibly JSON)
 */
type ToolInputBuffer = { toolName?: string; value: string };

/**
 * Gets the per-context map that tracks in-progress text buffers.
 * Creates the map on first access.
 *
 * @param context - Current stream handler context
 * @returns Map keyed by part id with accumulated text
 */
function getOpenText(context: StreamHandlerContext): Map<string, string> {
  const bag = context as unknown as Record<PropertyKey, unknown>;
  if (!bag[OPEN_TEXT_SYM]) {
    bag[OPEN_TEXT_SYM] = new Map<string, string>();
  }
  return bag[OPEN_TEXT_SYM] as Map<string, string>;
}

/**
 * Gets the per-context map that tracks in-progress reasoning buffers.
 * Creates the map on first access.
 *
 * @param context - Current stream handler context
 * @returns Map keyed by part id with accumulated reasoning text
 */
function getOpenReasoning(context: StreamHandlerContext): Map<string, string> {
  const bag = context as unknown as Record<PropertyKey, unknown>;
  if (!bag[OPEN_REASONING_SYM]) {
    bag[OPEN_REASONING_SYM] = new Map<string, string>();
  }
  return bag[OPEN_REASONING_SYM] as Map<string, string>;
}

/**
 * Gets the per-context map that tracks in-progress tool-input buffers.
 * Creates the map on first access.
 *
 * @param context - Current stream handler context
 * @returns Map keyed by part id with `{ toolName?, value }`
 */
function getOpenToolInput(
  context: StreamHandlerContext,
): Map<string, ToolInputBuffer> {
  const bag = context as unknown as Record<PropertyKey, unknown>;
  if (!bag[OPEN_TOOL_INPUT_SYM]) {
    bag[OPEN_TOOL_INPUT_SYM] = new Map<string, ToolInputBuffer>();
  }
  return bag[OPEN_TOOL_INPUT_SYM] as Map<string, ToolInputBuffer>;
}

/**
 * Flushes any generated content parts accumulated in `context.generatedJSON`
 * as a pending assistant message, then resets message state for subsequent parts.
 *
 * Behavior:
 * - Reserves a new `messageId` when one isn't already present (assistant reply
 *   in-progress) and writes a `chatMessages` row with `statusId: 2` (pending/in-progress),
 *   `role: 'assistant'`, and the JSON content.
 * - After a successful transaction, clears `context.messageId`, increments
 *   `context.currentMessageOrder`, and resets `context.generatedJSON`.
 *
 * Errors are captured via `LoggedError.isTurtlesAllTheWayDownBaby` and do not
 * throw out of this function.
 *
 * @param context - Current stream handler context containing accumulated parts
 */
const flushMessageParts = async ({
  context,
}: {
  context: StreamHandlerContext;
}) => {
  const { messageId, chatId, turnId, generatedJSON, currentMessageOrder } =
    context;
  if (!generatedJSON || !generatedJSON.length) {
    return;
  }
  await drizDb().transaction(async (tx) => {
    try {
      // Reserve message ID for pending assistant response
      let thisMessageId: number | undefined;
      if (!messageId) {
        const [tempMessageId] = await reserveMessageIds(
          tx,
          chatId,
          Number(turnId),
          1,
        );
        thisMessageId = tempMessageId;
        context.messageId = thisMessageId;
      } else {
        thisMessageId = messageId!;
      }
      await tx
        .insert(schema.chatMessages)
        .values({
          chatId: chatId!,
          turnId: Number(turnId!),
          messageId: thisMessageId!,
          role: 'assistant',
          content: JSON.stringify(generatedJSON),
          messageOrder: currentMessageOrder,
          statusId: 2, // pending/in-progress
        })
        // Use returning() to align with existing mocked insert chain in tests
        .returning()
        .execute();
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        data: {
          chatId,
          turnId,
          messageId,
          generatedJSON,
        },
      });
    }
  });
  // if we committed OK, clear out pending message id and bump order
  context.messageId = undefined;
  context.currentMessageOrder++;
  context.generatedJSON = [];
};

/**
 * Marks the specified assistant message as in-progress/complete according to
 * the middleware's status semantics.
 *
 * This updates the `chat_messages` row identified by (chatId, turnId, messageId)
 * and sets `statusId: 2`. Intended to close out a reserved/previous message
 * before attaching results or moving to the next one.
 *
 * @param tx - Active Drizzle transaction
 * @param messageId - The message id to mark as complete/pending
 * @param chatId - Chat identifier
 * @param turnId - Turn identifier
 * @returns Promise resolving to true on successful update
 * @throws Error when `messageId` is not provided
 */
const completePendingMessage = async ({
  tx,
  messageId,
  chatId,
  turnId,
}: {
  tx: DbTransactionType;
  messageId: number | undefined;
  chatId: string;
  turnId: number;
}) => {
  if (!messageId) {
    throw new Error('No messageId provided to completePendingMessage');
  }
  // Close out next message
  await tx
    .update(chatMessages)
    .set({
      statusId: 2,
    })
    .where(
      and(
        eq(chatMessages.chatId, chatId),
        eq(chatMessages.turnId, turnId),
        eq(chatMessages.messageId, messageId),
      ),
    );
  return true;
};

/**
 * Handles tool-call stream chunks by creating new tool message records.
 *
 * This function processes tool call chunks from the AI model, creating new
 * message records in the database to track tool invocations and their parameters.
 * Each tool call gets its own message with a complete status.
 *
 * @param chunk - The tool-call stream chunk
 * @param context - The current stream handler context
 * @returns Promise resolving to the updated context and success status
 *
 * @example
 * ```typescript
 * const result = await handleToolCall(
 *   {
 *     type: 'tool-call',
 *     toolName: 'search',
 *     args: { query: 'example' }
 *   },
 *   {
 *     chatId: 'chat-123',
 *     turnId: 1,
 *     currentMessageOrder: 2,
 *     generatedText: 'Hello'
 *   }
 * );
 * console.log(result.currentMessageOrder); // 3
 * ```
 */
export const handleToolCall = async (
  chunk: Extract<LanguageModelV2ToolCall, { type: 'tool-call' }>,
  context: StreamHandlerContext,
): Promise<StreamHandlerResult> => {
  ensureCreateResult(context);
  try {
    const { chatId, turnId, generatedText, currentMessageOrder, toolCalls } =
      context;
    await drizDb().transaction(async (tx) => {
      await flushMessageParts({ context });
      // Generate next message ID for the tool call
      const nextMessageId = await getNextSequence({
        tx,
        tableName: 'chat_messages',
        chatId,
        turnId: Number(turnId),
        count: 1,
      }).then((ids) => ids[0]);
      // Safely parse input JSON if present; tolerate empty/invalid inputs
      let parsedInput: unknown = undefined;
      const rawInput = (chunk.input ?? '').toString();
      const trimmed = rawInput.trim();
      if (trimmed.length > 0) {
        try {
          parsedInput = JSON.parse(rawInput);
        } catch {
          // keep as undefined; DB column may be JSON-only
          parsedInput = undefined;
        }
      }

      const toolCall = (
        await tx
          .insert(chatMessages)
          .values({
            chatId,
            turnId: Number(turnId),
            role: 'tool',
            content: generatedText,
            messageId: nextMessageId,
            providerId: chunk.toolCallId,
            toolName: chunk.toolName,
            functionCall: parsedInput ?? null,
            messageOrder: currentMessageOrder,
            statusId: 1, // complete status for tool calls
          })
          .returning()
          .execute()
      ).at(0);
      if (toolCall) {
        if (!toolCall.providerId) {
          log((l) =>
            l.warn(
              'Tool call was not assigned a provider id, result resolution may fail.',
              toolCall,
            ),
          );
        }
        toolCalls.set(toolCall.providerId ?? '[missing]', toolCall);
      } else {
        log((l) =>
          l.error('Failed to create tool call message', {
            log: true,
            data: {
              chatId,
              turnId,
              toolName: chunk.toolName,
              args: chunk.input,
              generatedText,
            },
          }),
        );
      }
    });

    return context.createResult({
      currentMessageId: undefined,
      currentMessageOrder: currentMessageOrder + 1,
      generatedText: '',
    });
  } catch (error) {
    log((l) =>
      l.error('Error handling tool-call chunk', {
        error,
        turnId: context.turnId,
        chatId: context.chatId,
        toolName: chunk.toolName,
        args: chunk.input,
      }),
    );
    return context.createResult(false);
  }
};

/**
 * Finds a pending tool call record associated with the given result chunk.
 *
 * Lookup strategy:
 * 1) Check the in-memory `toolCalls` map for `toolCallId`
 * 2) Query the database by `(chatId, providerId)`
 * 3) Fallback: if a `[missing]` placeholder exists in the map and the
 *    `toolName` matches, adopt it and update its `providerId`
 *
 * @param params.chunk - The incoming tool result part
 * @param params.toolCalls - In-memory map of known tool calls by provider id
 * @param params.chatId - Chat id for DB lookup
 * @param params.tx - Database transaction to perform the query
 * @returns The matched pending tool call row, or undefined if not found
 */
const findPendingToolCall = async ({
  chunk: { toolCallId, toolName },
  toolCalls,
  chatId,
  tx,
}: {
  chunk: LanguageModelV2ToolResultPart;
  toolCalls: Map<string, ChatMessagesType>;
  chatId: string;
  tx: DbTransactionType;
}) => {
  let pendingCall =
    toolCalls.get(toolCallId) ??
    (await tx
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.chatId, chatId),
          eq(chatMessages.providerId, toolCallId),
        ),
      )
      .limit(1)
      .execute()
      .then((x) => x.at(0)));
  if (!pendingCall) {
    const maybeMatch = toolCalls.get('[missing]');
    if (maybeMatch && maybeMatch.toolName === toolName) {
      pendingCall = maybeMatch;
      pendingCall.providerId = toolCallId;
      toolCalls.set(pendingCall.providerId, pendingCall);
      toolCalls.delete('[missing]');
    }
  }
  return pendingCall;
};

/**
 * Appends a tool error to the current turn and marks the turn as error.
 *
 * Reads the existing `chat_turns` row, extends the `errors` array with the
 * serialized tool result output, and sets `statusId: 3`.
 *
 * @param tx - Database transaction
 * @param chatId - Chat identifier
 * @param turnId - Turn identifier
 * @param chunk - Tool result part containing the error output
 */
const setTurnError = async ({
  tx,
  chatId,
  turnId,
  chunk,
}: {
  tx: DbTransactionType;
  chatId: string;
  turnId: number;
  chunk: LanguageModelV2ToolResultPart;
}) => {
  try {
    const turn = await tx
      .select({
        errors: chatTurns.errors,
        statusId: chatTurns.statusId,
      })
      .from(chatTurns)
      .where(and(eq(chatTurns.chatId, chatId), eq(chatTurns.turnId, turnId)))
      .limit(1)
      .execute()
      .then((x) => x.at(0));
    if (!turn) {
      log((l) =>
        l.warn('Turn not found when saving tool result', { chatId, turnId }),
      );
      return;
    }
    await tx
      .update(chatTurns)
      .set({
        errors: [
          ...(turn.errors ? Array.from(turn.errors) : []),
          JSON.stringify(chunk.output),
        ],
        statusId: 3,
      })
      .where(and(eq(chatTurns.chatId, chatId), eq(chatTurns.turnId, turnId)));
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      data: {
        chatId,
        turnId,
        toolName: chunk.toolName,
        providerId: chunk.toolCallId,
      },
      message: 'Error setting turn error from tool result',
    });
  }
};

/**
 * Handles tool-result stream chunks by updating the originating tool call
 * message with the tool's output and any provider metadata, and by setting
 * error status on the turn when appropriate.
 *
 * Steps:
 * - Flush any buffered assistant parts so DB state is consistent
 * - Complete the pending assistant message if one exists
 * - Find the originating tool call (memory or DB fallback)
 * - Update the message `statusId` (2 success, 3 error), `toolResult`,
 *   `metadata`, and append any concurrent generated text to `content`
 * - On error outputs, also record the error on the turn via `setTurnError`
 *
 * Returns a result that clears `currentMessageId` and `generatedText` to
 * prepare for subsequent parts.
 *
 * @param chunk - Tool result part emitted by the provider
 * @param context - Current stream handler context
 * @returns A `StreamHandlerResult` indicating success and updated fields
 */
export const handleToolResult = async (
  chunk: LanguageModelV2ToolResultPart,
  context: StreamHandlerContext,
): Promise<StreamHandlerResult> => {
  ensureCreateResult(context);
  try {
    const { chatId, turnId, generatedText, messageId, toolCalls } = context;
    flushMessageParts({ context });
    await drizDb().transaction(async (tx) => {
      await completePendingMessage({
        tx,
        messageId,
        chatId,
        turnId: Number(turnId),
      });
      // Match against a pending tool call
      const pendingCall = await findPendingToolCall({
        chatId,
        toolCalls,
        chunk,
        tx,
      });
      if (pendingCall) {
        const metadata: Record<PropertyKey, unknown> = pendingCall.metadata
          ? { ...pendingCall.metadata }
          : {};
        let statusId = 2;
        if (
          chunk.output.type === 'error-json' ||
          chunk.output.type === 'error-text'
        ) {
          statusId = 3;
          metadata.toolErrorResult = chunk.output;
          await setTurnError({ tx, chatId, turnId: Number(turnId), chunk });
        }
        if (chunk.providerOptions) {
          metadata.toolResultProviderMeta = chunk.providerOptions;
        }
        await tx
          .update(chatMessages)
          .set({
            statusId,
            toolResult: !!chunk.output ? JSON.stringify(chunk.output) : null,
            metadata: metadata,
            content: `${pendingCall.content ?? ''}\n${generatedText}`,
          })
          .where(
            and(
              eq(chatMessages.chatId, chatId),
              eq(chatMessages.turnId, Number(turnId)),
              eq(chatMessages.messageId, pendingCall.messageId),
            ),
          );
      } else {
        log((l) =>
          l.warn('No pending tool call found for chunk', {
            chatId,
            turnId,
            toolName: chunk.toolName,
            providerId: chunk.toolCallId,
          }),
        );
      }
    });

    return context.createResult({
      currentMessageId: undefined,
      generatedText: '',
    });
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      data: {
        chatId: context.chatId,
        turnId: context.turnId,
        toolName: chunk.toolName,
        providerId: chunk.toolCallId,
      },
      message: 'Error handling tool-result chunk',
    });
    return context.createResult(false);
  }
};

/**
 * Handles finish stream chunks by recording token usage statistics.
 *
 * This function processes the final chunk from the AI model stream, recording
 * token usage statistics including prompt tokens, completion tokens, and total
 * token count for billing and analytics purposes.
 *
 * @param chunk - The finish stream chunk
 * @param context - The current stream handler context
 * @returns Promise resolving to the updated context and success status
 *
 * @example
 * ```typescript
 * const result = await handleFinish(
 *   {
 *     type: 'finish',
 *     usage: {
 *       promptTokens: 50,
 *       completionTokens: 25
 *     }
 *   },
 *   {
 *     chatId: 'chat-123',
 *     turnId: 1,
 *     currentMessageOrder: 3,
 *     generatedText: 'Hello world'
 *   }
 * );
 * console.log(result.success); // true
 * ```
 */
export async function handleFinish(
  chunk: Extract<LanguageModelV2StreamPart, { type: 'finish' }>,
  context: StreamHandlerContext,
): Promise<StreamHandlerResult> {
  ensureCreateResult(context);
  try {
    // Save token usage if available
    if (
      chunk.usage &&
      context.turnId &&
      ((chunk.usage.inputTokens ?? 0) > 0 ||
        (chunk.usage.outputTokens ?? 0) > 0 ||
        context.messageId !== undefined)
    ) {
      await drizDb().transaction(async (tx) => {
        if (context.messageId) {
          await tx
            .update(chatMessages)
            .set({
              statusId: 2,
            })
            .where(
              and(
                eq(chatMessages.chatId, context.chatId),
                eq(chatMessages.turnId, Number(context.turnId)),
                eq(chatMessages.messageId, context.messageId),
              ),
            );
        }
        await tx.insert(tokenUsage).values({
          chatId: context.chatId,
          turnId: Number(context.turnId),
          promptTokens: chunk.usage.inputTokens,
          completionTokens: chunk.usage.outputTokens,
          totalTokens: chunk.usage.totalTokens,
        });
      });
    }
    // Tests expect currentMessageId to be undefined in the finish result
    return context.createResult({ currentMessageId: undefined });
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      data: {
        chatId: context.chatId,
        turnId: context.turnId,
        usage: chunk.usage,
      },
      source: 'chat-middleware::stream-handler:handleFinish',
    });
    log((l) =>
      l.error('Error handling finish chunk', {
        error,
        turnId: context.turnId,
        chatId: context.chatId,
        usage: chunk.usage,
      }),
    );
    return context.createResult(false);
  }
}

/**
 * Main dispatcher function that routes stream chunks to appropriate handlers.
 *
 * This function acts as a central dispatcher, examining the chunk type and
 * routing it to the appropriate specialized handler function. It provides
 * a unified interface for processing all types of stream chunks.
 *
 * @param chunk - The stream chunk to process
 * @param context - The current stream handler context
 * @returns Promise resolving to the updated context and success status
 *
 * @example
 * ```typescript
 * const result = await processStreamChunk(chunk, context);
 * if (result.success) {
 *   // Update context with new values
 *   context.currentMessageOrder = result.currentMessageOrder;
 *   context.generatedText = result.generatedText;
 * }
 * ```
 */
export async function processStreamChunk(
  chunk: LanguageModelV2StreamPart | LanguageModelV2ToolResultPart,
  context: StreamHandlerContext,
): Promise<StreamHandlerResult> {
  ensureCreateResult(context);
  return await instrumentStreamChunk(chunk.type, context, async () => {
    switch (chunk.type) {
      // ----- Text parts -----
      case 'text-start': {
        const { id } = chunk as Extract<
          LanguageModelV2StreamPart,
          { type: 'text-start' }
        >;
        getOpenText(context).set(id, '');
        return context.createResult(true);
      }
      case 'text-delta': {
        const { id, delta } = chunk as Extract<
          LanguageModelV2StreamPart,
          { type: 'text-delta' }
        >;
        const map = getOpenText(context);
        if (!map.has(id)) map.set(id, '');
        map.set(id, (map.get(id) || '') + delta);
        return context.createResult({
          generatedText: context.generatedText + delta,
        });
      }
      case 'text-end': {
        const { id } = chunk as Extract<
          LanguageModelV2StreamPart,
          { type: 'text-end' }
        >;
        const map = getOpenText(context);
        const text = map.get(id) || '';
        map.delete(id);
        if (text) context.generatedJSON.push({ type: 'text', text });
        return context.createResult(true);
      }

      // ----- Reasoning parts -----
      case 'reasoning-start': {
        const { id } = chunk as Extract<
          LanguageModelV2StreamPart,
          { type: 'reasoning-start' }
        >;
        getOpenReasoning(context).set(id, '');
        return context.createResult(true);
      }
      case 'reasoning-delta': {
        const { id, delta } = chunk as Extract<
          LanguageModelV2StreamPart,
          { type: 'reasoning-delta' }
        >;
        const map = getOpenReasoning(context);
        if (!map.has(id)) map.set(id, '');
        map.set(id, (map.get(id) || '') + delta);
        return context.createResult(true);
      }
      case 'reasoning-end': {
        const { id } = chunk as Extract<
          LanguageModelV2StreamPart,
          { type: 'reasoning-end' }
        >;
        const map = getOpenReasoning(context);
        const text = map.get(id) || '';
        map.delete(id);
        if (text) context.generatedJSON.push({ type: 'reasoning', text });
        return context.createResult(true);
      }

      // ----- Tool input (pre tool-call) -----
      case 'tool-input-start': {
        const { id, toolName } = chunk as Extract<
          LanguageModelV2StreamPart,
          { type: 'tool-input-start' }
        >;
        getOpenToolInput(context).set(id, { toolName, value: '' });
        return context.createResult(true);
      }
      case 'tool-input-delta': {
        const { id, delta } = chunk as Extract<
          LanguageModelV2StreamPart,
          { type: 'tool-input-delta' }
        >;
        const map = getOpenToolInput(context);
        const buf = map.get(id) || { value: '' };
        buf.value = (buf.value || '') + delta;
        map.set(id, buf);
        return context.createResult(true);
      }
      case 'tool-input-end': {
        const { id } = chunk as Extract<
          LanguageModelV2StreamPart,
          { type: 'tool-input-end' }
        >;
        const map = getOpenToolInput(context);
        const buf = map.get(id);
        if (buf) {
          const t = (buf.value ?? '').trim();
          if (t.length > 0) {
            let input: unknown = buf.value;
            if (
              (t.startsWith('{') && t.endsWith('}')) ||
              (t.startsWith('[') && t.endsWith(']'))
            ) {
              try {
                input = JSON.parse(buf.value);
              } catch {
                /* keep raw */
              }
            }
            context.generatedJSON.push({
              type: 'tool-input',
              id,
              ...(buf.toolName ? { toolName: buf.toolName } : {}),
              input,
            });
          }
          map.delete(id);
        }
        return context.createResult(true);
      }

      case 'tool-call':
        return await handleToolCall(chunk, context);

      case 'tool-result':
        if (!('output' in chunk)) {
          log((l) =>
            l.warn('Received tool result without output', {
              chunk,
              context,
            }),
          );
          return context.createResult({
            generatedText: context.generatedText + JSON.stringify(chunk),
          });
        }
        return await handleToolResult(chunk, context);

      case 'finish':
        return await handleFinish(chunk, context);

      // ----- Other parts and fallback handling -----
      case 'file':
      case 'source':
      case 'raw':
      case 'response-metadata':
      case 'stream-start': {
        // Store as-is for observability; these are not text content
        context.generatedJSON.push(chunk as Record<string, unknown>);
        return context.createResult(true);
      }

      case 'error': {
        // Append to text for visibility, and store raw
        context.generatedText =
          context.generatedText +
          JSON.stringify(chunk as Record<string, unknown>);
        context.generatedJSON.push(chunk as Record<string, unknown>);
        const result = context.createResult(true);
        (
          result as unknown as {
            chatId: string;
            turnId: number;
            messageId?: number;
          }
        ).chatId = context.chatId;
        (
          result as unknown as {
            chatId: string;
            turnId: number;
            messageId?: number;
          }
        ).turnId = context.turnId;
        (
          result as unknown as {
            chatId: string;
            turnId: number;
            messageId?: number;
          }
        ).messageId = context.messageId;
        return result;
      }

      default: {
        // Unknown chunk: append to text to match existing tests
        const appended =
          context.generatedText +
          JSON.stringify(chunk as Record<string, unknown>);
        context.generatedText = appended;
        const result = context.createResult({
          generatedText: appended,
        });
        (
          result as unknown as {
            chatId: string;
            turnId: number;
            messageId?: number;
          }
        ).chatId = context.chatId;
        (
          result as unknown as {
            chatId: string;
            turnId: number;
            messageId?: number;
          }
        ).turnId = context.turnId;
        (
          result as unknown as {
            chatId: string;
            turnId: number;
            messageId?: number;
          }
        ).messageId = context.messageId;
        return result;
      }
    }
  });
}
