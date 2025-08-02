import { type DbTransactionType, drizDbWithInit } from "@/lib/drizzle-db";
import { schema } from "@/lib/drizzle-db";
import { eq, desc } from "drizzle-orm";
import { LanguageModelV1MessageExt } from "@/lib/ai/types";

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
  const scopedIds = await (tx ? Promise.resolve(tx) : drizDbWithInit()).then(db => db.execute<{ allocate_scoped_ids: number }>(
    `SELECT * FROM allocate_scoped_ids('${tableName}', '${chatId}', ${turnId}, ${count})`,
  ));
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
  incomingMessages: LanguageModelV1MessageExt
): Promise<LanguageModelV1MessageExt> => {
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
    })
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.chatId, chatId))
    .orderBy(desc(schema.chatMessages.messageOrder));

  // If no existing messages, all incoming messages are new
  if (existingMessages.length === 0) {
    return incomingMessages;
  }

  // Create a normalized representation of existing messages for comparison
  const existingMessageSignatures = new Set(
    existingMessages.map(msg => {
      const normalizedContent = typeof msg.content === 'string' 
        ? msg.content 
        : JSON.stringify(msg.content);
      return `${msg.role}:${normalizedContent}`;
    })
  );

  // Filter incoming messages to only include those not already persisted
  const newMessages = incomingMessages.filter(incomingMsg => {
    const normalizedIncomingContent = typeof incomingMsg.content === 'string'
      ? incomingMsg.content
      : JSON.stringify(incomingMsg.content);
    
    const incomingSignature = `${incomingMsg.role}:${normalizedIncomingContent}`;
    
    return !existingMessageSignatures.has(incomingSignature);
  });

  return newMessages;
};
