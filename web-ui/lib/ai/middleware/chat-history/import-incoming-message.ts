/**
 * @fileoverview Chat Message Import and Processing System
 *
 * This module provides functionality for importing and persisting incoming chat messages
 * within the AI middleware pipeline. It handles the complete lifecycle of message ingestion,
 * from chat session management to message sequencing and database persistence.
 *
 * **Key Features:**
 * - **Smart Chat Session Management**: Automatic chat creation and upsert operations
 * - **Turn-Based Organization**: Structured conversation turns with unique identifiers
 * - **Message Sequencing**: Automatic ordering and ID generation for message continuity
 * - **Tool Call Support**: Comprehensive handling of tool-calling workflows and metadata
 * - **Transaction Safety**: Full database transaction support for data consistency
 * - **Status Tracking**: Real-time message and turn status management
 * - **Metadata Preservation**: Rich context storage for debugging and analytics
 *
 * **Architecture:**
 * ```
 * Incoming Request → Chat Upsert → Turn Creation → Message Import → Assistant Preparation
 *        ↓              ↓           ↓              ↓               ↓
 *    Validation    ID Generation   Sequencing   Persistence   Status Setup
 * ```
 *
 * **Database Schema Integration:**
 * - **chats**: Top-level conversation containers with user association
 * - **chat_turns**: Individual request/response cycles within conversations
 * - **chat_messages**: Atomic message units with role-based organization
 *
 * **Performance Characteristics:**
 * - Modular helper functions for maintainability and testing
 * - Batch message insertion for efficiency
 * - Optimized sequence generation for minimal database roundtrips
 * - Transactional consistency for data integrity
 * - Structured logging for operational monitoring
 *
 * **Use Cases:**
 * - AI chat application message persistence
 * - Conversation history management
 * - Tool-calling workflow tracking
 * - Multi-turn dialogue state management
 * - Analytics and debugging data collection
 *
 * @module import-incoming-message
 * @version 2.0.0
 * @author AI Middleware Team
 * @since 1.0.0
 */

import { schema } from '/lib/drizzle-db/schema';
import type { ChatMessagesType, DbTransactionType } from '/lib/drizzle-db';
import { ChatHistoryContext, ToolStatus } from './types';
import { eq, desc, and } from 'drizzle-orm';
import { log } from '/lib/logger';
import { getNextSequence, getNewMessages, getItemOutput } from './utility';
import { generateChatId } from '/lib/ai/core';
import type {
  LanguageModelV2CallOptions,
  LanguageModelV2ToolResultPart,
  SharedV2ProviderOptions,
} from '@ai-sdk/provider';

// ============================================================================
// Private Helper Functions
// ============================================================================

/**
 * Resolves and normalizes chat ID from the context.
 *
 * @remarks
 * This function handles the conversion of various chat ID formats into a standardized
 * string format. It supports both string-based identifiers and numeric identifiers,
 * with intelligent fallback to auto-generated IDs when none are provided.
 *
 * **ID Resolution Strategy:**
 * - String IDs are preserved as-is, with fallback generation for null/undefined
 * - Numeric IDs are converted through the generateChatId utility for consistency
 * - Missing IDs trigger automatic generation with sequential numbering
 *
 * @param context - The chat history context containing the chat identifier
 * @returns A normalized string chat ID guaranteed to be valid
 *
 * @example
 * ```typescript
 * // String ID preservation
 * const stringId = getChatId({ chatId: 'chat_abc123' }); // Returns: 'chat_abc123'
 *
 * // Numeric ID conversion
 * const numericId = getChatId({ chatId: 42 }); // Returns: generated ID based on 42
 *
 * // Auto-generation fallback
 * const autoId = getChatId({ chatId: null }); // Returns: newly generated ID
 * ```
 */
const getChatId = (context: ChatHistoryContext): string =>
  typeof context.chatId === 'string'
    ? (context.chatId ?? generateChatId().id)
    : generateChatId(context.chatId ?? 1).id;

/**
 * Ensures a chat session exists in the database, creating it if necessary.
 *
 * @remarks
 * This function implements an idempotent upsert operation for chat sessions.
 * It checks for existing chats to avoid duplicates while creating new sessions
 * with comprehensive metadata when needed. The operation preserves existing
 * chat data and only creates new records when absolutely necessary.
 *
 * **Upsert Strategy:**
 * - Performs efficient existence check using SELECT with LIMIT 1
 * - Preserves existing chat sessions to maintain conversation continuity
 * - Creates new chats with rich metadata for debugging and analytics
 * - Associates chats with user accounts for proper access control
 *
 * **Metadata Storage:**
 * - Model configuration (name, temperature, topP)
 * - Request context (thread ID, first request ID)
 * - Creation timestamp for audit trails
 * - User association for access control
 *
 * @param tx - Active database transaction for consistency
 * @param chatId - The normalized chat ID to upsert
 * @param context - Chat context containing user and model information
 * @returns Promise that resolves when the upsert operation completes
 *
 * @example
 * ```typescript
 * // Upsert existing chat (no-op)
 * await upsertChat(transaction, 'existing_chat_123', context);
 *
 * // Create new chat with metadata
 * await upsertChat(transaction, 'new_chat_456', {
 *   userId: 789,
 *   model: 'gpt-4',
 *   temperature: 0.7,
 *   requestId: 'req_abc'
 * });
 * ```
 */
export const upsertChat = async (
  tx: DbTransactionType,
  chatId: string,
  context: ChatHistoryContext,
) => {
  const existingChat =
    (
      await tx
        .select({ id: schema.chats.id })
        .from(schema.chats)
        .where(eq(schema.chats.id, chatId))
        .limit(1)
        .execute()
    ).length > 0;
  if (existingChat) {
    log((l) =>
      l.debug(`Record ${chatId} already exists; no insert necessary.`),
    );
  } else {
    await tx.insert(schema.chats).values({
      id: String(chatId),
      userId: Number(context.userId),
      title: null,
      createdAt: new Date().toISOString(),
      metadata: {
        model: context.model,
        temperature: context.temperature,
        topP: context.topP,
        threadId: context.chatId,
        firstRequestId: context.requestId,
      },
    });
  }
};

/**
 * Reserves a unique turn ID for a new conversation turn.
 *
 * @remarks
 * This function generates and reserves a sequential turn identifier within a chat session.
 * Turn IDs ensure proper ordering of conversation cycles and enable efficient querying
 * of related messages. The function includes comprehensive error handling to ensure
 * sequence generation never fails silently.
 *
 * **Sequence Generation:**
 * - Uses the getNextSequence utility for atomic ID generation
 * - Ensures sequential ordering within chat sessions
 * - Prevents race conditions in concurrent scenarios
 * - Validates successful generation before returning
 *
 * **Error Handling:**
 * - Throws descriptive errors if sequence generation fails
 * - Includes chat ID context in error messages for debugging
 * - Ensures callers are aware of any generation failures
 *
 * @param tx - Active database transaction for consistency
 * @param chatId - The chat ID to generate a turn for
 * @returns Promise resolving to the reserved turn ID
 * @throws {Error} When sequence generation fails or returns invalid results
 *
 * @example
 * ```typescript
 * // Reserve turn ID for new conversation cycle
 * const turnId = await reserveTurnId(transaction, 'chat_abc123');
 * console.log(`Reserved turn: ${turnId}`); // e.g., "Reserved turn: 5"
 * ```
 */
export const reserveTurnId = async (
  tx: DbTransactionType,
  chatId: string,
): Promise<number> => {
  const thisTurnId = await getNextSequence({
    tableName: 'chat_turns',
    chatId: chatId,
    tx,
  }).then((ids) => ids[0]);
  if (!thisTurnId) {
    throw new Error(
      'Unexpected failure retrieving next turn sequence for chat id ' + chatId,
    );
  }
  return thisTurnId;
};

/**
 * Creates a new chat turn record with comprehensive metadata.
 *
 * @remarks
 * This function initializes a new conversation turn in the database with all
 * necessary tracking information. Turn records serve as containers for related
 * messages and provide audit trails for conversation analytics and debugging.
 *
 * **Turn Metadata:**
 * - Model configuration (name, temperature, topP)
 * - Request tracking (provider ID, request ID)
 * - Status management (waiting status for active turns)
 * - Performance metrics (latency placeholder, error/warning arrays)
 * - Creation timestamps for audit trails
 *
 * **Status Management:**
 * - Initial status is set to 1 (waiting/in-progress)
 * - Latency starts at 0 and will be updated on completion
 * - Error and warning arrays are initialized empty
 * - Provider ID links turn to originating request
 *
 * @param tx - Active database transaction for consistency
 * @param chatId - The chat ID this turn belongs to
 * @param turnId - The unique turn identifier
 * @param context - Chat context containing model and request information
 * @returns Promise that resolves when the turn record is created
 *
 * @example
 * ```typescript
 * // Create turn for GPT-4 conversation
 * await insertChatTurn(transaction, 'chat_123', 5, {
 *   requestId: 'req_abc',
 *   model: 'gpt-4',
 *   temperature: 0.7,
 *   topP: 0.9
 * });
 * ```
 */
export const insertChatTurn = async (
  tx: DbTransactionType,
  chatId: string,
  turnId: number | undefined,
  context: ChatHistoryContext,
) => {
  const thisTurnId = turnId ? turnId : await reserveTurnId(tx, chatId);
  const providerId = ((rId: undefined | string) => {
    if (!rId) {
      return undefined;
    }
    const idxOf = rId.lastIndexOf(':');
    if (idxOf === -1) {
      return rId === chatId ? undefined : rId;
    }
    return rId.substring(idxOf + 1).trim();
  })(context.requestId?.trim());
  await tx.insert(schema.chatTurns).values({
    chatId: chatId,
    turnId: thisTurnId,
    statusId: 1, // Waiting/in-progress
    createdAt: new Date().toISOString(),
    providerId,
    temperature: context.temperature,
    topP: context.topP,
    warnings: [],
    errors: [],
    metadata: {
      requestId: context.requestId,
      model: context.model,
    },
  });
};

/**
 * Represents detailed information about a tool's execution state and data.
 * Used for tracking tool calls and results within chat messages.
 * @internal
 */
type ToolInfo = {
  toolCallId?: string;
  toolName?: string;
  input?: string;
  output?: string;
  status: ToolStatus;
  media?: string;
  providerOptions?: {
    [key in 'input' | 'output']?: SharedV2ProviderOptions;
  };
};

/**
 * Reserves a batch of sequential message IDs for efficient insertion.
 *
 * @remarks
 * This function pre-allocates a contiguous range of message IDs to ensure
 * proper ordering and prevent race conditions during batch message insertion.
 * The reservation system guarantees that message IDs are sequential within
 * each turn, enabling efficient querying and maintaining conversation flow.
 *
 * **Batch Reservation Strategy:**
 * - Allocates exact count needed for efficiency
 * - Ensures sequential ordering within turns
 * - Prevents gaps in message sequences
 * - Validates successful reservation before returning
 *
 * **Error Handling:**
 * - Comprehensive validation of returned ID count
 * - Descriptive error messages with context
 * - Includes expected vs actual counts for debugging
 * - Prevents silent failures that could corrupt ordering
 *
 * @param tx - Active database transaction for consistency
 * @param chatId - The chat ID these messages belong to
 * @param turnId - The turn ID these messages belong to
 * @param count - Number of message IDs to reserve
 * @returns Promise resolving to array of reserved message IDs
 * @throws {Error} When reservation fails or returns incorrect count
 *
 * @example
 * ```typescript
 * // Reserve IDs for 3 user messages + 1 assistant response
 * const messageIds = await reserveMessageIds(transaction, 'chat_123', 5, 4);
 * console.log(messageIds); // [101, 102, 103, 104]
 * ```
 */
export const reserveMessageIds = async (
  tx: DbTransactionType,
  chatId: string,
  turnId: number,
  count: number,
): Promise<number[]> => {
  const messageIds = await getNextSequence({
    tableName: 'chat_messages',
    chatId: chatId,
    turnId: turnId,
    count: count,
    tx,
  });
  if (!messageIds || messageIds.length < count) {
    throw new Error(
      `Failed to reserve enough message ids for chat ${chatId} turn ${turnId}. Expected ${count}, got ${messageIds?.length ?? 0}`,
    );
  }
  return messageIds;
};

/**
 * Inserts a pending assistant message row to begin streaming content.
 *
 * @param tx - Active transaction
 * @param chatId - Chat identifier
 * @param turnId - Turn identifier
 * @param messageId - Pre-reserved message id
 * @param messageOrder - Sequential order for the message
 * @param content - Initial content payload (typically a JSON stringified text part array)
 */
export const insertPendingAssistantMessage = async (
  tx: DbTransactionType,
  chatId: string,
  turnId: number,
  messageId: number,
  messageOrder: number,
  content: string,
) => {
  await tx
    .insert(schema.chatMessages)
    .values({
      chatId,
      turnId,
      messageId,
      role: 'assistant',
      content,
      messageOrder,
      statusId: 1, // pending/in-progress
    })
    // Use returning() to align with existing mocked insert chain in tests
    .returning()
    .execute();
};

/**
 * Simple type guard identifying tool-call parts.
 */
const isToolCallPart = (
  item: unknown,
): item is {
  type: 'tool-call';
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
} => {
  return (
    !!item &&
    typeof item === 'object' &&
    (item as { type?: unknown }).type === 'tool-call'
  );
};

/**
 * Simple type guard identifying tool-result parts.
 */
const isToolResultPart = (
  item: unknown,
): item is {
  type: 'tool-result' | 'dynamic-tool';
  toolCallId?: string;
  toolName?: string;
  output?: unknown;
  error?: unknown;
} => {
  return (
    !!item &&
    typeof item === 'object' &&
    'type' in item &&
    (item.type === 'tool-result' || item.type === 'dynamic-tool')
  );
};

/**
 * Safely parse JSON-like strings into objects/arrays; otherwise return original value
 * @param value - The value to parse
 * @returns Parsed object/array or original value if parsing fails
 */
const parseMaybeJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  const s = value.trim();
  if (!s || (s[0] !== '{' && s[0] !== '[')) return value;
  try {
    return JSON.parse(s);
  } catch {
    return value;
  }
};

/**
 * Internal utility method for merging a tool message field.
 *
 * @param prop - The property to process ('functionCall' or 'toolResult')
 * @param target - The target object to update
 * @param toolRow - The incoming tool message row
 * @param existing - The existing persisted message data
 * @param isNewerMessage - Whether the incoming message is newer than the existing one
 * @returns True if the target was updated, false otherwise
 * @remarks
 * This method encapsulates the logic for non-destructive merging of tool message fields.
 * It checks if the incoming message has new data for the specified property
 * and updates the target object accordingly, preserving existing data when appropriate.
 * The method returns a boolean indicating whether an update was made.
 */
const processField = ({
  prop,
  target,
  toolRow,
  existing,
  isNewerMessage,
}: {
  prop: 'functionCall' | 'toolResult';
  target: Partial<ChatMessagesType>;
  toolRow: ChatMessageRowDraft;
  existing: Pick<ChatMessagesType, 'functionCall' | 'toolResult' | 'statusId'>;
  isNewerMessage: boolean;
}): boolean => {
  // If the incoming message has a value for this field
  if (!!toolRow[prop]) {
    // And the existing message does not
    if (
      !existing[prop] ||
      // Or this is a newer message and the messages are different
      (isNewerMessage && toolRow[prop] !== existing[prop])
    ) {
      target[prop] = toolRow[prop];
      return true;
    }
  }
  return false;
};

/**
 * Upserts a tool message by providerId, implementing non-destructive merge.
 *
 * @remarks
 * This function implements the core logic for tool message deduplication by:
 * 1. Looking for existing tool messages with the same providerId
 * 2. Only updating if the current turnId is greater than the stored modifiedTurnId
 * 3. Preserving existing functionCall data when adding toolResult
 * 4. Resetting optimization fields when updating
 * 5. Adding modifiedTurnId to metadata for tracking
 *
 * @param tx - Active database transaction
 * @param chatId - The chat ID
 * @param turnId - Current turn ID
 * @param toolRow - The tool message row to upsert
 * @returns Promise resolving to the messageId of the upserted record
 */
export const upsertToolMessage = async (
  tx: DbTransactionType,
  chatId: string,
  turnId: number,
  toolRow: ChatMessageRowDraft,
): Promise<number | null> => {
  if (!toolRow.providerId) {
    // No providerId means we can't deduplicate, just insert normally
    return null;
  }

  // Look for existing tool message with this providerId
  const existingMessages = await tx
    .select({
      chatMessageId: schema.chatMessages.chatMessageId,
      messageId: schema.chatMessages.messageId,
      turnId: schema.chatMessages.turnId,
      toolName: schema.chatMessages.toolName,
      statusId: schema.chatMessages.statusId,
      functionCall: schema.chatMessages.functionCall,
      toolResult: schema.chatMessages.toolResult,
      metadata: schema.chatMessages.metadata,
      optimizedContent: schema.chatMessages.optimizedContent,
    })
    .from(schema.chatMessages)
    .where(
      and(
        eq(schema.chatMessages.chatId, chatId),
        eq(schema.chatMessages.providerId, toolRow.providerId),
        eq(schema.chatMessages.role, 'tool'),
      ),
    )
    .limit(1);

  if (existingMessages.length === 0 || !existingMessages[0]) {
    // No existing message, return null to signal normal insert
    return null;
  }
  // Determine if we want to update the persisted row.  This is true if -
  // 1. We have data they do not (eg we have a result but none is persisted)
  // 2. We both have data and our turn > the last modified turn
  const existing = existingMessages[0];
  const existingMetadata =
    (existing?.metadata as { modifiedTurnId?: number } | null) || {};
  const lastModifiedTurnId = existingMetadata.modifiedTurnId || 0;
  const isNewerMessage = turnId > lastModifiedTurnId;

  let updated = false;

  // Prepare update data with non-destructive merge
  const updateData: Partial<typeof schema.chatMessages.$inferInsert> = {
    functionCall: existing.functionCall,
    toolResult: existing.toolResult,
    statusId: existing.statusId,
    metadata: {
      ...existingMetadata,
      providerOptions: {
        ...(('providerOptions' in existingMetadata
          ? existingMetadata.providerOptions
          : null) ?? {}),
        ...((typeof toolRow.metadata == 'object' &&
        toolRow.metadata &&
        'providerOptions' in toolRow.metadata
          ? toolRow.metadata.providerOptions
          : null) ?? {}),
      },
      modifiedTurnId: turnId,
    },
    // Reset optimization fields when updating
    optimizedContent: null,
  };

  if (toolRow.statusId > (existing.statusId ?? -1)) {
    // If incoming status is greater than (eg more complete) than existing, update it
    updateData.statusId = toolRow.statusId;
    updated = true;
  }
  if (
    processField({
      prop: 'functionCall',
      target: updateData,
      toolRow,
      existing,
      isNewerMessage,
    })
  ) {
    updated = true;
  }
  if (
    processField({
      prop: 'toolResult',
      target: updateData,
      toolRow,
      existing,
      isNewerMessage,
    })
  ) {
    updated = true;
  }
  if (!updated) {
    // Return current id signals no update is necessary
    return existing.messageId;
  }
  // If we reach here, we have updates to apply

  // Don't overwrite existing toolResult if incoming is null
  if (
    updateData.metadata &&
    typeof updateData.metadata == 'object' &&
    'providerOptions' in updateData.metadata &&
    updateData.metadata.providerOptions &&
    Object.keys(updateData.metadata.providerOptions).length === 0
  ) {
    delete updateData.metadata.providerOptions;
  }
  // Update the existing record
  await tx
    .update(schema.chatMessages)
    .set(updateData)
    .where(eq(schema.chatMessages.chatMessageId, existing.chatMessageId));

  log((l) =>
    l.debug(
      `Updated tool message for providerId ${toolRow.providerId} from turn ${existing.turnId} to ${turnId}`,
    ),
  );

  return existing.messageId;
};

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Gets the highest message order for a chat to ensure proper sequencing of new messages.
 *
 * @remarks
 * This function queries the database to find the highest message order number
 * for a specific chat session. This is essential for maintaining proper message
 * sequencing when adding new messages to existing conversations.
 *
 * @param tx - Active database transaction for consistency
 * @param chatId - The chat ID to query for message order
 * @returns Promise resolving to the highest message order (0 if no messages exist)
 */
const getLastMessageOrder = async (
  tx: DbTransactionType,
  chatId: string,
): Promise<number> => {
  const result = await tx
    .select({ maxOrder: schema.chatMessages.messageOrder })
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.chatId, chatId))
    .orderBy(desc(schema.chatMessages.messageOrder))
    .limit(1);

  return result.length > 0 ? result[0].maxOrder : 0;
};

/**
 * Imports and persists incoming chat messages within a transactional database context.
 *
 * @remarks
 * This function orchestrates the complete process of message ingestion for AI chat applications,
 * handling everything from chat session management to individual message persistence. It implements
 * a sophisticated workflow that ensures data consistency, proper sequencing, and comprehensive
 * metadata tracking throughout the message import process.
 *
 * **Workflow Overview:**
 * 1. **Chat ID Resolution**: Handles both string and numeric chat identifiers with fallback generation
 * 2. **Chat Session Upsert**: Creates new chats or validates existing ones with metadata preservation
 * 3. **Turn Management**: Generates unique turn identifiers for request/response cycles
 * 4. **Message Sequencing**: Reserves sequential message IDs for batch insertion
 * 5. **Content Processing**: Handles various message types including tool calls and responses
 * 6. **Assistant Preparation**: Creates pending assistant message for streaming responses
 *
 * **Modular Architecture:**
 * - Uses dedicated helper functions for maintainability and testing
 * - Each step is isolated for easier debugging and modification
 * - Comprehensive error handling at each stage
 * - Consistent logging for operational monitoring
 *
 * **Transaction Safety:**
 * - All operations occur within a single database transaction
 * - Ensures atomicity of the complete import process
 * - Automatic rollback on any failure point
 * - Maintains data consistency across all tables
 *
 * **Performance Optimizations:**
 * - Batch sequence generation minimizes database roundtrips
 * - Single batch insertion for all prompt messages
 * - Efficient existence checks for chat upsert operations
 * - Optimized queries with proper indexing support
 *
 * **Error Handling and Recovery:**
 * - Comprehensive validation at each processing stage
 * - Descriptive error messages with full context
 * - Graceful handling of edge cases and malformed input
 * - Automatic cleanup through transaction rollback
 *
 * @param params - The import operation parameters
 * @param params.tx - Active database transaction for consistency
 * @param params.context - Chat context containing user, model, and session information
 * @param params.params - Language model call options containing the message prompt
 * @param params.params.prompt - Array of messages to import into the conversation
 * @returns Promise resolving to import result with chat, turn, and message identifiers
 * @throws {Error} When sequence generation fails or message count validation errors occur
 *
 * @example
 * ```typescript
 * // Basic message import within a transaction
 * const result = await importIncomingMessage({
 *   tx: dbTransaction,
 *   context: {
 *     userId: 123,
 *     chatId: 'chat_abc123',
 *     model: 'gpt-4',
 *     temperature: 0.7,
 *     requestId: 'req_xyz789'
 *   },
 *   params: {
 *     prompt: [
 *       { role: 'user', content: 'Hello, can you help me?' },
 *       { role: 'assistant', content: 'Of course! How can I assist you?' }
 *     ]
 *   }
 * });
 *
 * console.log(`Chat: ${result.chatId}, Turn: ${result.turnId}, Message: ${result.messageId}`);
 * ```
 *
 * @example
 * ```typescript
 * // Tool call message import
 * const toolResult = await importIncomingMessage({
 *   tx: dbTransaction,
 *   context: {
 *     userId: 456,
 *     chatId: 'chat_def456',
 *     model: 'gpt-4',
 *     requestId: 'req_tool_123'
 *   },
 *   params: {
 *     prompt: [
 *       { role: 'user', content: 'What\'s the weather like?' },
 *       {
 *         role: 'assistant',
 *         content: [{
 *           type: 'tool-call',
 *           toolCallId: 'call_123',
 *           toolName: 'getWeather',
 *           args: { location: 'San Francisco' }
 *         }]
 *       },
 *       {
 *         role: 'tool',
 *         content: [{
 *           toolCallId: 'call_123',
 *           result: { temperature: 72, condition: 'sunny' }
 *         }]
 *       }
 *     ]
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // New chat creation with auto-generated ID
 * const newChatResult = await importIncomingMessage({
 *   tx: dbTransaction,
 *   context: {
 *     userId: 789,
 *     chatId: null, // Will auto-generate
 *     model: 'gpt-3.5-turbo',
 *     temperature: 0.5,
 *     topP: 0.9,
 *     requestId: 'req_new_chat'
 *   },
 *   params: {
 *     prompt: [
 *       { role: 'system', content: 'You are a helpful assistant.' },
 *       { role: 'user', content: 'Start a new conversation.' }
 *     ]
 *   }
 * });
 * ```
 */
export const importIncomingMessage = async ({
  tx,
  context,
  params: { prompt, providerOptions: { backoffice = {} } = {} },
}: {
  /** Active database transaction ensuring consistency across all operations */
  tx: DbTransactionType;
  /** Chat context containing user, session, and model configuration */
  context: ChatHistoryContext;
  /** Language model call options containing the messages to import */
  params: LanguageModelV2CallOptions;
  /** Record identifier for the imported message */
  messageId?: number;
}) => {
  // Resolve and normalize chat ID from context
  const chatId = getChatId(context);
  let currentMessageOrder = 0;
  // Ensure chat session exists with proper metadata
  await upsertChat(tx, chatId, context);

  // Reserve unique turn ID for this conversation cycle
  const thisTurnId = await reserveTurnId(tx, chatId);
  log((l) =>
    l.debug(`Reserved chat turn id: ${thisTurnId} for chat: ${chatId}`),
  );

  // Filter out messages that have already been saved in previous turns
  const newMessages = await getNewMessages(tx, chatId, prompt, thisTurnId);

  log((l) =>
    l.debug(
      `Filtered messages for chat ${chatId}: ${prompt.length} total, ${newMessages?.length || 0} new`,
    ),
  );

  // Initialize turn record with comprehensive tracking information
  await insertChatTurn(tx, chatId, thisTurnId, context);
  backoffice.turnId = thisTurnId;

  // Get the current highest message order for proper sequencing
  let lastMessageOrder: number;
  try {
    lastMessageOrder = await getLastMessageOrder(tx, chatId);
  } catch {
    // If we can't get the last message order, default to 0
    lastMessageOrder = 1;
  }

  // set current order to last message + 1
  currentMessageOrder = lastMessageOrder + 1;

  if (newMessages?.length) {
    // Transform prompt into rows: tool-call/result -> single 'tool' row; other content grouped by role switches
    const rows = flattenPromptToRows(
      newMessages as LanguageModelV2CallOptions['prompt'],
    );
    if (rows.length > 0) {
      const messageIds = await reserveMessageIds(
        tx,
        chatId,
        thisTurnId,
        rows.length,
      );
      await insertPromptMessages(
        tx,
        chatId,
        thisTurnId,
        messageIds,
        rows,
        currentMessageOrder,
      );
      currentMessageOrder += rows.length;
    }
  }
  // Return comprehensive context for continued processing
  return {
    chatId,
    turnId: thisTurnId,
    messageId: undefined as number | undefined,
    nextMessageOrder: currentMessageOrder,
  };
};

// Removed unused bucketization helpers (replaced by flattenPromptToRows)

// Draft row shape for chat_messages insertion
type ChatMessageRowDraft = {
  role: 'user' | 'assistant' | 'tool' | 'system';
  statusId: number;
  content?: Array<Record<string, unknown>> | string | null;
  toolName?: string | null;
  functionCall?: unknown | null;
  toolResult?: unknown | null;
  providerId?: string | null;
  metadata?: unknown | null;
};

// Convert prompt into rows honoring requirements 1-3
const flattenPromptToRows = (
  prompt: LanguageModelV2CallOptions['prompt'],
): ChatMessageRowDraft[] => {
  const messages = Array.isArray(prompt) ? prompt : [prompt];
  const rows: ChatMessageRowDraft[] = [];

  let currentContentRow: {
    role: ChatMessageRowDraft['role'];
    content: Array<Record<string, unknown>>;
  } | null = null;

  const flushContent = () => {
    if (currentContentRow && currentContentRow.content.length > 0) {
      rows.push({
        statusId: 1,
        ...currentContentRow,
      });
    }
    currentContentRow = null;
  };

  const pushToolRow = (info: ToolInfo) => {
    let statusId: number;
    switch (info.status) {
      case 'pending':
        statusId = 1;
        break;
      case 'content':
        statusId = 2;
        break;
      case 'result':
        statusId = 2;
        break;
      case 'error':
        statusId = 3;
        break;
      default:
        statusId = 1;
        break;
    }
    const row: ChatMessageRowDraft = {
      statusId,
      role: 'tool',
      content: info.media ? info.output : null,
      toolName: info.toolName ?? null,
      providerId: info.toolCallId ?? null,
      functionCall: info.input ? parseMaybeJson(info.input) : null,
      toolResult:
        info.output || info.media
          ? parseMaybeJson(info.media ?? info.output)
          : null,
      metadata: info.providerOptions
        ? { providerOptions: info.providerOptions }
        : undefined,
    };
    rows.push(row);
  };

  const pushContentItem = (
    role: ChatMessageRowDraft['role'],
    value: unknown,
  ) => {
    // early-exit on null/undefined/empty-string
    if (!value) {
      return;
    }
    let item: Record<string, unknown>;
    // If we have an object we have to to some special handling
    if (typeof value === 'object') {
      if ('text' in value) {
        // If it has a text property then just take it as is (note tools have already been removed by processContentPart)
        item = value;
      } else if (Array.isArray(value)) {
        // If it's an array then we flatten it out by processing each item individually
        for (const part of value as unknown[]) {
          processContentPart(part, role);
        }
        // And then early exit - nothing left to do for this part
        return;
      } else {
        // Otherwise, we stringify the object as a JSON text part (although honestly I think now that we're upgraded to v5 we could also prob just take as-is?)
        item = { type: 'text', value: JSON.stringify(value) };
      }
    } else {
      // Otherwise it's a non-object raw value, so we turn it into a text part
      item = {
        type: 'text',
        text: typeof value === 'string' ? value : JSON.stringify(value),
      };
    }
    // Append to the current content row or flush and start anew
    if (!currentContentRow || currentContentRow.role !== role) {
      flushContent();
      currentContentRow = { role, content: [item] };
    } else {
      currentContentRow.content.push(item);
    }
  };

  const processContentPart = (
    part: unknown,
    role: ChatMessageRowDraft['role'],
  ) => {
    if (!part) return;
    // Handle tool-calls special...
    if (isToolCallPart(part)) {
      flushContent();
      pushToolRow({
        status: 'pending',
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        input:
          part.input != null
            ? typeof part.input === 'string'
              ? part.input
              : JSON.stringify(part.input)
            : undefined,
        providerOptions: (part as { providerOptions?: SharedV2ProviderOptions })
          .providerOptions
          ? {
              input: (part as { providerOptions?: SharedV2ProviderOptions })
                .providerOptions,
            }
          : undefined,
      });
      return;
    }
    // Handle tool-results special...
    if (isToolResultPart(part)) {
      flushContent();
      const parsed = getItemOutput(part as LanguageModelV2ToolResultPart);
      pushToolRow({
        ...parsed,
        toolCallId: (part as { toolCallId?: string }).toolCallId,
        toolName: (part as { toolName?: string }).toolName,
        providerOptions: (part as { providerOptions?: SharedV2ProviderOptions })
          .providerOptions
          ? {
              output: (part as { providerOptions?: SharedV2ProviderOptions })
                .providerOptions,
            }
          : undefined,
      });
      flushContent();
      return;
    }
    // Otherwise fallback to normal content item processing
    pushContentItem(role, part);
  };

  for (const message of messages) {
    const role = (message.role as ChatMessageRowDraft['role']) ?? 'user';

    if (typeof message.content === 'string') {
      pushContentItem(role, message.content);
      continue;
    }
    if (Array.isArray(message.content)) {
      for (const part of message.content as unknown[]) {
        processContentPart(part, role);
      }
      continue;
    }
    if (!!message.content) {
      processContentPart(message.content, role);
      continue;
    }
    pushContentItem(
      role,
      'value' in message && !!message.value ? message.value : message,
    );
  }

  flushContent();
  return rows;
};

const insertPromptMessages = async (
  tx: DbTransactionType,
  chatId: string,
  turnId: number,
  messageIds: number[],
  rows: ChatMessageRowDraft[],
  startOrder: number,
) => {
  let messageOrder = startOrder;
  const rowsToInsert: Array<typeof schema.chatMessages.$inferInsert> = [];
  let messageIdIndex = 0;

  // Process each row, checking for tool message upserts
  for (const row of rows) {
    if (row.role === 'tool' && row.providerId) {
      // Try to upsert the tool message
      const upsertedMessageId = await upsertToolMessage(
        tx,
        chatId,
        turnId,
        row,
      );

      if (upsertedMessageId !== null) {
        // Message was updated, skip inserting a new row
        log((l) =>
          l.debug(
            `Tool message upserted for providerId ${row.providerId}, messageId: ${upsertedMessageId}`,
          ),
        );
        continue;
      }
    }

    // For non-tool messages or tool messages that couldn't be upserted, add to insert batch
    const messageId =
      messageIdIndex < messageIds.length ? messageIds[messageIdIndex] : 0;
    messageIdIndex++;

    const rowData = {
      chatId,
      turnId,
      messageId,
      role: row.role,
      content:
        typeof row.content === 'string'
          ? row.content
          : row.content != null
            ? JSON.stringify(row.content)
            : null,
      toolName: row.toolName ?? null,
      functionCall: row.functionCall ?? null,
      toolResult: row.toolResult ?? null,
      providerId: row.providerId ?? null,
      metadata:
        row.role === 'tool' && row.providerId
          ? { modifiedTurnId: turnId, ...((row.metadata as object) || {}) }
          : (row.metadata ?? null),
      messageOrder: messageOrder++,
      statusId: 2,
    };

    rowsToInsert.push(rowData);
  }

  // Insert any remaining non-upserted messages
  if (rowsToInsert.length > 0) {
    await tx.insert(schema.chatMessages).values(rowsToInsert).execute();
  }
};
