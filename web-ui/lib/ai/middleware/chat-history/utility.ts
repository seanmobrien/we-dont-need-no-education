import type { LanguageModelV2CallOptions } from '@ai-sdk/provider';
import { schema } from '@/lib/drizzle-db/schema';
import { type DbTransactionType, drizDbWithInit } from '@/lib/drizzle-db';
import { eq, desc } from 'drizzle-orm';

export const getNextSequence = async ({
  chatId,
  tableName,
  count = 1,
  tx,
  ...props
}:
  | {
      chatId: string;
      tableName: 'chat_turns';
      count?: number;
      tx?: DbTransactionType;
    }
  | {
      chatId: string;
      tableName: 'chat_messages';
      turnId: number;
      count?: number;
      tx?: DbTransactionType;
    }) => {
  // Check to see if a turn id was provided in context.
  // NOTE: Fallback value of 0 is used instead of undefined, as
  // this keeps turnId a number type and sumplifies use of the value
  // downstream.
  const turnId = 'turnId' in props ? props.turnId : 0;
  const scopedIds = await (tx ? Promise.resolve(tx) : drizDbWithInit()).then(
    (db) =>
      db.execute<{ allocate_scoped_ids: number }>(
        `SELECT * FROM allocate_scoped_ids('${tableName}', '${chatId}', ${turnId}, ${count})`,
      ),
  );
  const ret: Array<number> = scopedIds.map(
    (x) => x.allocate_scoped_ids as number,
  );
  return ret;
};

/**
 * Identifies new messages by comparing incoming prompt with existing chat messages.
 *
 * @remarks
 * This function performs message deduplication by comparing incoming messages
 * against existing messages in the chat session. It identifies which messages
 * from the prompt array are truly new and haven't been saved before.
 *
 * **Comparison Strategy:**
 * - Messages are compared by role and content for exact matches
 * - Only messages not found in existing chat history are considered new
 * - Maintains message order from the original prompt array
 * - Handles various content types (string and complex content structures)
 *
 * **Performance Optimizations:**
 * - Queries existing messages only once per chat session
 * - Uses efficient array operations for comparison
 * - Minimizes database operations by batching lookups
 *
 * @param tx - Active database transaction for consistency
 * @param chatId - The chat ID to check for existing messages
 * @param incomingMessages - Array of messages from the prompt
 * @returns Promise resolving to array of new messages not yet persisted
 *
 * @example
 * ```typescript
 * const newMessages = await getNewMessages(transaction, 'chat_123', [
 *   { role: 'user', content: 'Hello' },        // Already exists
 *   { role: 'assistant', content: 'Hi there' }, // Already exists
 *   { role: 'user', content: 'How are you?' }   // New message
 * ]);
 * // Returns: [{ role: 'user', content: 'How are you?' }]
 * ```
 */
export const getNewMessages = async (
  tx: DbTransactionType,
  chatId: string,
  incomingMessages: LanguageModelV2CallOptions['prompt'],
): Promise<LanguageModelV2CallOptions['prompt']> => {
  // Handle null/undefined incomingMessages gracefully
  if (!incomingMessages || incomingMessages.length === 0) {
    return [];
  }

  // Get all existing messages for this chat, ordered by creation
  const existingMessages = await tx
    .select({
      role: schema.chatMessages.role,
      content: schema.chatMessages.content,
      messageOrder: schema.chatMessages.messageOrder,
      providerId: schema.chatMessages.providerId,
      toolName: schema.chatTool.toolName,
      input: schema.chatToolCalls.input,
      output: schema.chatToolCalls.output,
    })
    .from(schema.chatMessages)
    .leftJoin(
      schema.chatToolCalls,
      eq(schema.chatMessages.chatMessageId, schema.chatToolCalls.chatMessageId),
    )
    .leftJoin(
      schema.chatTool,
      eq(schema.chatToolCalls.chatToolId, schema.chatTool.chatToolId),
    )
    .where(eq(schema.chatMessages.chatId, chatId))
    .orderBy(desc(schema.chatMessages.messageOrder))
    .then((results) =>
      (results ?? []).filter(Boolean).map((record) => {
        // if we do not have a record, or it does not have content, or the content is not a string,
        // // there nothing for us to do
        if (!record.content || typeof record.content !== 'string') {
          return record;
        }
        // Parse content into it's native / non-string representation
        try {
          const parsed = JSON.parse(record.content);
          record.content = parsed;
        } catch {
          // Nothing for us to do - leave it as a string.
        }
        return record;
      }),
    );
  // If no existing messages, all incoming messages are new
  if (existingMessages.length === 0) {
    return incomingMessages;
  }

  // Helper function to normalize content for comparison
  const normalizeContentForComparison = (
    input: unknown,
    { skipTools = false }: { skipTools?: boolean } = {},
  ): string => {
    if (!input) {
      return '';
    }
    if (typeof input === 'string') {
      return input ?? '';
    }
    if (typeof input === 'object' && !!input) {
      let content: string = '';
      if (Array.isArray(input)) {
        return input
          .map((x) => normalizeContentForComparison(x, { skipTools }))
          .filter(Boolean)
          .join('\n');
      }
      if ('content' in input && !input.content) {
        if (typeof input.content === 'object') {
          if (Array.isArray(input.content)) {
            content += input.content
              .map((x) => normalizeContentForComparison(x, { skipTools }))
              .filter(Boolean)
              .join('\n');
          } else {
            content += normalizeContentForComparison(input.content, {
              skipTools,
            });
          }
        } else {
          content += input?.content?.toString()?.trim() ?? '';
        }
      }
      if ('text' in input) {
        content += input?.text?.toString()?.trim() ?? '';
      } else if ('type' in input) {
        switch (input.type) {
          case 'text':
            content += (input as { text?: string }).text?.toString() ?? '';
            break;
          case 'tool-call':
          case 'tool-result':
            if (!skipTools) {
              const fnInput =
                'input' in input && input.input
                  ? `(${JSON.stringify(input.input)})`
                  : '';
              const fnOutput =
                'output' in input && input.output
                  ? ` => ${JSON.stringify(input.output)}`
                  : '';
              const fnName =
                'toolName' in input && input.toolName ? input.toolName : '';
              const fnId =
                'toolCallId' in input && input.toolCallId
                  ? ` [${input.toolCallId}]`
                  : '';
              content += (fnName + fnId + fnInput + fnOutput).trim();
            }
            break;
          default:
            // content += JSON.stringify(input);
            break;
        }
      }
      return content;
    }
    return '';
  };

  // Create a normalized representation of existing messages for comparison
  const existingMessageSignatures = new Set(
    existingMessages.map((msg) => {
      const normalizedContent = normalizeContentForComparison(msg.content);
      return `${msg.role}:${normalizedContent}`;
    }),
  );
  // Filter incoming messages to only include those not already persisted
  const newMessages = incomingMessages.filter((incomingMsg) => {
    const normalizedIncomingContent = normalizeContentForComparison(
      incomingMsg.content,
    );
    const incomingSignature = `${incomingMsg.role}:${normalizedIncomingContent}`;

    return !existingMessageSignatures.has(incomingSignature);
  });

  return newMessages;
};
