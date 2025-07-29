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

import { schema } from "@/lib/drizzle-db";
import { DbTransactionType } from "@/lib/drizzle-db";
import { ChatHistoryContext } from "./types";
import { eq, desc } from "drizzle-orm";
import { log } from "@/lib/logger";
import { getNextSequence, getNewMessages } from "./utility";
import { generateChatId } from "@/lib/ai/core";
import { LanguageModelV1CallOptions } from "ai";


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
const upsertChat = async (tx: DbTransactionType, chatId: string, context: ChatHistoryContext) =>  {
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
const reserveTurnId = async  (tx: DbTransactionType, chatId: string): Promise<number> => {
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
const insertChatTurn = async (
  tx: DbTransactionType,
  chatId: string,
  turnId: number,
  context: ChatHistoryContext
) => {
  await tx.insert(schema.chatTurns).values({
    chatId: chatId,
    turnId: turnId,
    statusId: 1, // Waiting/in-progress
    createdAt: new Date().toISOString(),
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
const reserveMessageIds = async  (
  tx: DbTransactionType,
  chatId: string,
  turnId: number,
  count: number
): Promise<number[]>  => {
  const messageIds = await getNextSequence({
    tableName: 'chat_messages',
    chatId: chatId,
    turnId: turnId,
    count,
    tx,
  });
  if (!messageIds || messageIds.length !== count) {
    throw new Error(
      `Failed to reserve enough message ids for chat ${chatId} turn ${turnId}. Expected ${count}, got ${messageIds?.length ?? 0}`,
    );
  }
  return messageIds;
};

/**
 * Inserts all prompt messages in a single batch operation with tool call support.
 *
 * @remarks
 * This function processes and persists all incoming messages from the prompt array
 * in a single database operation for maximum efficiency. It handles various message
 * types including user messages, assistant responses, system instructions, and
 * tool interactions with proper relationship tracking.
 *
 * **Message Processing Features:**
 * - Batch insertion for optimal database performance
 * - Automatic content serialization for complex structures
 * - Tool call relationship detection and linking
 * - Role-based message categorization
 * - Sequential ordering preservation
 *
 * **Tool Call Relationship Tracking:**
 * - Tool response messages are linked to their originating calls
 * - Assistant messages with tool calls are properly identified
 * - Provider IDs enable correlation between tool calls and responses
 * - Supports both single and multi-tool calling scenarios
 *
 * **Content Serialization:**
 * - String content is preserved as-is for efficiency
 * - Complex content structures are JSON-serialized
 * - Maintains data integrity while enabling flexible content types
 *
 * **Important Limitations:**
 * - Current implementation doesn't fully support parallel tool calling
 * - Tool call linking assumes sequential processing order
 * - Complex tool call scenarios may require additional handling
 *
 * @param tx - Active database transaction for consistency
 * @param chatId - The chat ID these messages belong to
 * @param turnId - The turn ID these messages belong to
 * @param messageIds - Pre-allocated message IDs for insertion
 * @param prompt - Array of messages to insert
 * @param startOrder - Starting message order number
 * @returns Promise that resolves when all messages are inserted
 *
 * @example
 * ```typescript
 * // Insert conversation with tool call
 * await insertPromptMessages(transaction, 'chat_123', 5, [101, 102, 103], [
 *   { role: 'user', content: 'What\'s the weather?' },
 *   { role: 'assistant', content: [{ type: 'tool-call', toolCallId: 'call_1' }] },
 *   { role: 'tool', content: [{ toolCallId: 'call_1', result: 'Sunny, 72°F' }] }
 * ], 0);
 * ```
 */
const insertPromptMessages = async (
  tx: DbTransactionType,
  chatId: string,
  turnId: number,
  messageIds: number[],
  prompt: LanguageModelV1CallOptions['prompt'],
  startOrder: number
) => {
  let messageOrder = startOrder;
  await tx.insert(schema.chatMessages).values(
    prompt.map((p, i) => {
      let providerId: string | null = null;
      
      // Tool call relationship detection and linking
      // IMPORTANT: This logic does not scale to support parallel tool calling correctly.
      if (p.role === 'tool') {
        // Tool response message - link to original tool call
        if (Array.isArray(p.content) && p.content.length > 0) {
          providerId = p.content[0].toolCallId;
        }
      } else if (p.role === 'assistant') {
        // Assistant message with tool calls - extract call ID for linking
        if (Array.isArray(p.content)) {
          const toolCall = p.content.find(x => x.type === 'tool-call');
          if (toolCall) {
            providerId = toolCall.toolCallId;
          }
        }
      }
      
      return {
        chatId: chatId,
        turnId: turnId,
        messageId: messageIds[i],
        providerId, // Links tool calls to responses for relationship tracking
        role: p.role as 'user' | 'assistant' | 'tool' | 'system',
        content:
          typeof p.content === 'string'
            ? p.content
            : JSON.stringify(p.content), // Serialize complex content structures
        messageOrder: messageOrder++,
        statusId: 2, // Complete status for imported messages
      };
    }),
  ).execute();
};

/**
 * Creates a pending assistant message record for streaming response handling.
 *
 * @remarks
 * This function prepares the database for an incoming assistant response by
 * creating a message record in "streaming" status. This enables real-time
 * updates during response generation and ensures proper message ordering
 * within the conversation turn.
 *
 * **Streaming Preparation:**
 * - Creates message record with empty content for population during streaming
 * - Sets status to 1 (streaming/in-progress) for real-time tracking
 * - Reserves proper position in message order sequence
 * - Returns complete record for subsequent updates
 *
 * **Status Management:**
 * - Initial status indicates response is being generated
 * - Content starts empty and will be populated during streaming
 * - Message order ensures proper conversation flow
 * - Record can be updated incrementally as response arrives
 *
 * **Integration with Streaming:**
 * - Provides foundation for real-time response updates
 * - Enables status tracking throughout response generation
 * - Supports incremental content updates
 * - Maintains conversation ordering during async operations
 *
 * @param tx - Active database transaction for consistency
 * @param chatId - The chat ID this message belongs to
 * @param turnId - The turn ID this message belongs to
 * @param assistantMessageId - Pre-allocated message ID for the response
 * @param messageOrder - Position in the message sequence
 * @returns Promise resolving to array containing the created message record
 *
 * @example
 * ```typescript
 * // Prepare for streaming assistant response
 * const [pendingMessage] = await insertPendingAssistantMessage(
 *   transaction, 'chat_123', 5, 104, 3
 * );
 * console.log(pendingMessage.statusId); // 1 (streaming)
 * console.log(pendingMessage.content);  // '' (empty, will be populated)
 * ```
 */
const insertPendingAssistantMessage = async (
  tx: DbTransactionType,
  chatId: string,
  turnId: number,
  assistantMessageId: number,
  messageOrder: number
) => {
  return await tx.insert(schema.chatMessages).values({
    chatId: chatId,
    turnId: turnId,
    messageId: assistantMessageId,
    role: 'assistant',
    content: '',
    messageOrder: messageOrder,
    statusId: 1, // Streaming status - response in progress
  })
  .returning()
  .execute();
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
const getLastMessageOrder = async (tx: DbTransactionType, chatId: string): Promise<number> => {
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
  params: { prompt },
}: {
  /** Active database transaction ensuring consistency across all operations */
  tx: DbTransactionType;
  /** Chat context containing user, session, and model configuration */
  context: ChatHistoryContext;
  /** Language model call options containing the messages to import */
  params: LanguageModelV1CallOptions;
}) => {
  // Resolve and normalize chat ID from context
  const chatId = getChatId(context);
  let currentMessageOrder = 0;

  // Ensure chat session exists with proper metadata
  await upsertChat(tx, chatId, context);

  // Filter out messages that have already been saved in previous turns
  const newMessages = await getNewMessages(tx, chatId, prompt);
  
  log((l) =>
    l.debug(`Filtered messages for chat ${chatId}: ${prompt.length} total, ${newMessages?.length || 0} new`),
  );

  // If no new messages to process, we still need to prepare for assistant response
  if (!newMessages || newMessages.length === 0) {
    // Reserve unique turn ID for this conversation cycle
    const thisTurnId = await reserveTurnId(tx, chatId);
    log((l) =>
      l.debug(`Reserved chat turn id: ${thisTurnId} for chat: ${chatId} (no new messages)`),
    );

    // Initialize turn record with comprehensive tracking information
    await insertChatTurn(tx, chatId, thisTurnId, context);

    // Get the current highest message order for proper sequencing
    // Since we have no new messages, we need to find where to place the assistant response
    let currentMessageOrder = 0;
    try {
      const lastMessageOrder = await getLastMessageOrder(tx, chatId);
      // For new chats (no existing messages), start at 0
      // For existing chats, start after the last message
      currentMessageOrder = lastMessageOrder === 0 ? 0 : lastMessageOrder + 1;
    } catch {
      // If we can't get the last message order, default to 0
      currentMessageOrder = 0;
    }

    // Reserve message ID for pending assistant response only
    const messageIds = await reserveMessageIds(tx, chatId, thisTurnId, 1);
    const assistantMessageId = messageIds[0];

    // Prepare pending assistant message for streaming response
    const pending = await insertPendingAssistantMessage(
      tx,
      chatId,
      thisTurnId,
      assistantMessageId,
      currentMessageOrder,
    );

    return {
      chatId,
      turnId: thisTurnId,
      messageId: assistantMessageId,
      pendingMessage: pending[0],
      nextMessageOrder: currentMessageOrder + 1,
    };
  }

  // Reserve unique turn ID for this conversation cycle
  const thisTurnId = await reserveTurnId(tx, chatId);
  log((l) =>
    l.debug(`Reserved chat turn id: ${thisTurnId} for chat: ${chatId}`),
  );

  // Initialize turn record with comprehensive tracking information
  await insertChatTurn(tx, chatId, thisTurnId, context);

  log((l) =>
    l.debug(
      `Successfully initialized storage for chat  [${chatId}] turn [${thisTurnId}]; importing ${newMessages.length} new messages for this request.`,
    ),
  );

  // Get the current highest message order for proper sequencing
  let lastMessageOrder = 0;
  try {
    lastMessageOrder = await getLastMessageOrder(tx, chatId);
  } catch {
    // If we can't get the last message order, default to 0
    lastMessageOrder = 0;
  }
  
  // For new chats (no existing messages), start at 0
  // For existing chats, start after the last message
  currentMessageOrder = lastMessageOrder === 0 ? 0 : lastMessageOrder + 1;

  // Reserve sequential message IDs for batch insertion (new messages + assistant response)
  const messageIds = await reserveMessageIds(
    tx,
    chatId,
    thisTurnId,
    newMessages.length + 1, // +1 for pending assistant response
  );
  
  // Insert only the new prompt messages in a single batch operation
  await insertPromptMessages(
    tx,
    chatId,
    thisTurnId,
    messageIds,
    newMessages, // Only insert new messages, not duplicates
    currentMessageOrder,
  );

  // Prepare pending assistant message for streaming response
  const assistantMessageId = messageIds[messageIds.length - 1];
  currentMessageOrder += newMessages.length;

  const pending = await insertPendingAssistantMessage(
    tx,
    chatId,
    thisTurnId,
    assistantMessageId,
    currentMessageOrder,
  );

  // Return comprehensive context for continued processing
  return {
    chatId,
    turnId: thisTurnId,
    messageId: assistantMessageId,
    pendingMessage: pending[0], // Complete message record for updates
    nextMessageOrder: currentMessageOrder + 1, // For additional messages if needed
  };
};
