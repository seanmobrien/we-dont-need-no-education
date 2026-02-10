import { schema } from '@/lib/drizzle-db/schema';
import type { ChatMessagesType, DbTransactionType } from '@/lib/drizzle-db';
import { ChatHistoryContext, ToolStatus } from './types';
import { eq, desc, and } from 'drizzle-orm';
import { log } from '@compliance-theater/logger';
import { getNextSequence, getNewMessages, getItemOutput } from './utility';
import { generateChatId } from '@/lib/ai/core';
import type {
  LanguageModelV2CallOptions,
  LanguageModelV2ToolResultPart,
  SharedV2ProviderOptions,
} from '@ai-sdk/provider';

// ============================================================================
// Private Helper Functions
// ============================================================================

const getChatId = (context: ChatHistoryContext): string =>
  typeof context.chatId === 'string'
    ? context.chatId ?? generateChatId().id
    : generateChatId(context.chatId ?? 1).id;

export const upsertChat = async (
  tx: DbTransactionType,
  chatId: string,
  context: ChatHistoryContext
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
      l.debug(`Record ${chatId} already exists; no insert necessary.`)
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

export const reserveTurnId = async (
  tx: DbTransactionType,
  chatId: string
): Promise<number> => {
  const thisTurnId = await getNextSequence({
    tableName: 'chat_turns',
    chatId: chatId,
    tx,
  }).then((ids) => ids[0]);
  if (!thisTurnId) {
    throw new Error(
      'Unexpected failure retrieving next turn sequence for chat id ' + chatId
    );
  }
  return thisTurnId;
};

export const insertChatTurn = async (
  tx: DbTransactionType,
  chatId: string,
  turnId: number | undefined,
  context: ChatHistoryContext
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

export const reserveMessageIds = async (
  tx: DbTransactionType,
  chatId: string,
  turnId: number,
  count: number
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
      `Failed to reserve enough message ids for chat ${chatId} turn ${turnId}. Expected ${count}, got ${
        messageIds?.length ?? 0
      }`
    );
  }
  return messageIds;
};

export const insertPendingAssistantMessage = async (
  tx: DbTransactionType,
  chatId: string,
  turnId: number,
  messageId: number,
  messageOrder: number,
  content: string
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

const isToolCallPart = (
  item: unknown
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

const isToolResultPart = (
  item: unknown
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

export const upsertToolMessage = async (
  tx: DbTransactionType,
  chatId: string,
  turnId: number,
  toolRow: ChatMessageRowDraft
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
        eq(schema.chatMessages.role, 'tool')
      )
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
      `Updated tool message for providerId ${toolRow.providerId} from turn ${existing.turnId} to ${turnId}`
    )
  );

  return existing.messageId;
};

// ============================================================================
// Main Export Function
// ============================================================================

const getLastMessageOrder = async (
  tx: DbTransactionType,
  chatId: string
): Promise<number> => {
  const result = await tx
    .select({ maxOrder: schema.chatMessages.messageOrder })
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.chatId, chatId))
    .orderBy(desc(schema.chatMessages.messageOrder))
    .limit(1);

  return result.length > 0 ? result[0].maxOrder : 0;
};

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
    l.debug(`Reserved chat turn id: ${thisTurnId} for chat: ${chatId}`)
  );

  // Filter out messages that have already been saved in previous turns
  const newMessages = await getNewMessages(tx, chatId, prompt, thisTurnId);

  log((l) =>
    l.debug(
      `Filtered messages for chat ${chatId}: ${prompt.length} total, ${
        newMessages?.length || 0
      } new`
    )
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
      newMessages as LanguageModelV2CallOptions['prompt']
    );
    if (rows.length > 0) {
      const messageIds = await reserveMessageIds(
        tx,
        chatId,
        thisTurnId,
        rows.length
      );
      await insertPromptMessages(
        tx,
        chatId,
        thisTurnId,
        messageIds,
        rows,
        currentMessageOrder
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
  prompt: LanguageModelV2CallOptions['prompt']
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
    value: unknown
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
    role: ChatMessageRowDraft['role']
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
      'value' in message && !!message.value ? message.value : message
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
  startOrder: number
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
        row
      );

      if (upsertedMessageId !== null) {
        // Message was updated, skip inserting a new row
        log((l) =>
          l.debug(
            `Tool message upserted for providerId ${row.providerId}, messageId: ${upsertedMessageId}`
          )
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
          : row.metadata ?? null,
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
