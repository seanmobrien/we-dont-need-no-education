/**
 * @fileoverview Chat History Middleware Type Definitions.
 *
 * This module provides comprehensive type definitions for the AI chat history middleware system.
 * It defines the core data structures and interfaces used throughout the message processing
 * pipeline, from initial chat context through streaming response handling to final persistence.
 *
 * **Type Categories:**
 * - **Core Context Types**: Core session and processing context information
 * - **Stream Processing Types**: Real-time message streaming and chunk handling
 * - **Task Management Types**: Asynchronous processing queue and task coordination
 * - **Completion Types**: Turn finalization and persistence operations
 * - **Configuration Types**: System behavior and feature control settings
 */

import type { DbTransactionType, ChatMessagesType } from '@compliance-theater/database/orm';
import { LanguageModelV2StreamPart } from '@ai-sdk/provider';
import { Span } from '@opentelemetry/api';

declare module '@/lib/ai/middleware/chat-history/types' {
  /**
   * Core context information required for chat history operations.
   * Serves as the foundational context for all chat history middleware operations.
   * It carries essential session information, user identification, and model configuration.
   */
  export interface ChatHistoryContext {
    processingTimeMs?: number;
    /**
     * Unique identifier for the user initiating the chat.
     * Used for access control, data isolation, and audit trails.
     */
    userId: string;

    /**
     * Optional unique identifier for the chat session.
     * When provided, enables conversation continuity and threading.
     * When omitted, a new chat session will be created automatically.
     */
    chatId?: string;

    /**
     * Optional unique identifier for the current turn within the chat session.
     * When provided, enables precise tracking of user interactions and model responses.
     * When omitted, a new turn will be created automatically.
     */
    turnId?: string;

    /**
     * Optional unique identifier for the current request.
     * Enables distributed tracing, debugging, and request correlation.
     */
    requestId?: string;

    /**
     * Optional name of the AI model being used.
     * Enables provider-specific handling and response optimization.
     */
    model?: string;

    /**
     * Optional temperature setting for response generation.
     * Controls randomness in model responses (0.0 = deterministic, 1.0 = creative).
     */
    temperature?: number;

    /**
     * Optional top-p (nucleus sampling) setting for response generation.
     * Controls diversity of model responses (0.1 = focused, 1.0 = diverse).
     */
    topP?: number;

    /**
     * Optional metadata associated with the current request.
     * Can be used to store additional context or parameters for processing.
     */
    metadata?: Record<PropertyKey, unknown>;

    /**
     * Timestamp indicating when the chat context was created.
     */
    beganAt: Date;

    /**
     * Current iteration number for the chat context.
     * Used to track the progression of the conversation.
     */
    iteration: number;

    /**
     * opentelemetry span instance for tracing.
     */
    span: Span;

    /**
     * Current error state for the chat context.
     * Used to track any errors that occur during processing.
     */
    error: unknown;

    /**
     * Disposes of the chat context and releases any resources.
     * @returns A promise that resolves when the context is disposed.
     */
    dispose: () => Promise<void>;
  }

  /**
   * Represents the execution status of a tool within a chat message.
   */
  export type ToolStatus = 'pending' | 'result' | 'error' | 'content';

  /**
   * Context information required for processing individual stream chunks.
   * Maintains the state needed during real-time stream processing.
   */
  export interface StreamHandlerContext {
    /**
     * Unique identifier for the current chat session.
     * Links stream chunks to their conversation context.
     */
    chatId: string;

    /**
     * Unique identifier for the current conversation turn.
     * Groups related messages within a request/response cycle.
     */
    turnId: number;

    /**
     * Optional unique identifier for the assistant message being generated.
     * Used for incremental updates to the response content.
     */
    messageId?: number;

    /**
     * Current position in the message ordering sequence.
     * Ensures proper message flow and conversation continuity.
     */
    currentMessageOrder: number;

    /**
     * Accumulated text content from processed stream chunks.
     * Built incrementally as the AI response is generated.
     */
    generatedText: string;

    /**
     * Structured collection of objects reconstructed from phased streaming parts.
     */
    generatedJSON: Array<Record<string, unknown>>;

    /**
     * A map of currently known tool calls that are awaiting response.
     */
    toolCalls: Map<string, ChatMessagesType>;

    /**
     * Creates a StreamHandlerResult from the current context.
     * @returns The created StreamHandlerResult.
     */
    createResult: (
      success?: boolean | Partial<StreamHandlerResult>,
    ) => StreamHandlerResult;
  }

  /**
   * Result information returned after processing a stream chunk.
   * Captures the outcome of processing an individual stream chunk.
   */
  export interface StreamHandlerResult {
    /**
     * The conversation identifier for the processed chunk.
     */
    chatId: string;

    /**
     * The numeric turn identifier associated with the processed chunk.
     */
    turnId: number;

    /**
     * messageId of the current chunk being processed.
     */
    messageId: number;
    /**
     * Message identifier to assign to the next messsage record created.
     */
    currentMessageId: number | undefined;
    /**
     * Updated message order counter after processing the chunk.
     * Reflects the current position in the conversation sequence.
     */
    currentMessageOrder: number;

    /**
     * Updated accumulated text after processing the chunk.
     * Contains all generated content up to this point in the response.
     */
    generatedText: string;

    /**
     * Updated accumulated JSON objects added to the pending stream.
     */
    generatedJSON: Array<Record<string, unknown>>;

    /**
     * Map of tool IDs to their corresponding chat messages.
     * Tracks all tool invocations and their responses.
     */
    toolCalls: Map<string, ChatMessagesType>;

    /**
     * Indicates whether the stream chunk was successfully processed.
     * When false, the chunk processing encountered an error or exception.
     */
    success: boolean;
  }

  /**
   * Represents a queued processing task for asynchronous stream chunk handling.
   * Defines the structure for tasks in the asynchronous processing queue.
   */
  export interface QueuedTask {
    /**
     * Unique identifier for the task within the processing queue.
     * Used for tracking, debugging, and ensuring ordered processing.
     */
    id: number;

    /**
     * The stream chunk data to be processed.
     * Contains the actual AI-generated content or metadata from the stream.
     */
    chunk: LanguageModelV2StreamPart;

    /**
     * Processing context required for handling the chunk.
     * Maintains state information and identifiers for database operations.
     */
    context: StreamHandlerContext;

    /**
     * Promise that resolves when the task processing completes.
     * Enables asynchronous coordination and error handling.
     */
    promise: Promise<void>;

    /**
     * Function to call when task processing succeeds.
     * Signals successful completion to waiting consumers.
     */
    resolve: () => void;

    /**
     * Function to call when task processing fails.
     * Enables error propagation and recovery strategies.
     */
    reject: (error: Error) => void;

    /**
     * Optional result from processing the task.
     * Populated after successful completion for downstream consumption.
     */
    result?: StreamHandlerResult;
  }

  /**
   * Context information required for flush operations when completing a chat turn.
   * Provides all necessary information for finalizing a conversation turn.
   */
  export interface FlushContext {
    /**
     * Unique identifier of the chat/conversation being completed.
     * Links the flush operation to the specific conversation context.
     */
    chatId: string;

    /**
     * Turn number within the conversation (optional for some operations).
     * Enables sequencing and ordering of conversation exchanges.
     */
    turnId?: number;

    /**
     * Unique database identifier for the message record (optional).
     * Used for direct database targeting when available.
     */
    messageId?: number;

    /**
     * Complete generated text content from the AI response.
     * Represents the final accumulated content for persistence.
     */
    generatedText: string;

    /**
     * Timestamp when the generation process began.
     * Used for calculating response latency and performance metrics.
     */
    startTime: number;
  }

  /**
   * Result information returned from flush operations after completing chat persistence.
   * Captures the outcomes and metrics from finalizing a conversation turn.
   */
  export interface FlushResult {
    /**
     * Indicates whether the flush operation completed successfully.
     * Critical for determining if the conversation turn was properly finalized.
     */
    success: boolean;

    /**
     * Error information if the flush operation failed.
     * Provides detailed debugging information and recovery options.
     */
    error?: Error;

    /**
     * Total time spent processing the flush operation in milliseconds.
     * Used for performance monitoring and optimization analysis.
     */
    processingTimeMs: number;

    /**
     * Length of the final generated text content.
     * Useful for analytics and content volume tracking.
     */
    textLength: number;

    /**
     * Length of the content that was persisted during the flush.
     * Useful for analytics and content volume tracking.
     */
    contentLength?: number;

    /**
     * Database ID of the final persisted message record.
     * Enables direct referencing and follow-up operations.
     */
    finalMessageId?: number;

    /**
     * Indicates whether a retry of the operation is recommended.
     * Helps coordinate error recovery and resilience strategies.
     */
    retryRecommended?: boolean;

    /**
     * Additional metadata about the flush operation.
     * Flexible field for implementation-specific information.
     */
    metadata?: Record<string, unknown>;
  }

  /**
   * Configuration options for controlling flush operation behavior and timing.
   * Defines parameters that control how and when flush operations are executed.
   */
  export interface FlushConfig {
    /**
     * Whether to automatically generate a title for the chat session.
     */
    autoGenerateTitle: boolean;
    /**
     * Maximum length of the generated title.
     */
    maxTitleLength: number;
    /**
     * Target word count for the generated title.
     */
    titleWordCount: number;
    /**
     * Interval in milliseconds between periodic flushes.
     */
    flushIntervalMs: number;
    /**
     * Timeout in milliseconds for flush operations.
     */
    timeoutMs: number;
    /**
     * Whether to enable metrics collection for flush operations.
     */
    enableMetrics: boolean;
    /**
     * Number of items to process in a single batch.
     */
    batchSize: number;
    /**
     * Number of retry attempts for failed flush operations.
     */
    retryAttempts: number;
    /**
     * Whether to enable compression for persisted content.
     */
    compressionEnabled: boolean;
    /**
     * Whether to enable verbose logging for flush operations.
     */
    verboseLogging?: boolean;
  }

  /**
   * Result information returned when initializing message persistence.
   *
   * @remarks
   * This interface captures identifiers provisioned at the start of a persistence
   * operation for a chat turn (e.g., reserving message IDs). These identifiers are
   * passed forward to subsequent steps that complete the persistence process.
   */
  export interface MessagePersistenceInit {
    /**
     * Unique identifier of the chat/conversation being persisted.
     */
    chatId: string;

    /**
     * String representation of the current turn id (may be coerced from number
     * by upstream utilities). Used for sequencing and DB targeting.
     */
    turnId: string;

    /**
     * Optional reserved message identifier for the assistant response.
     * When present, downstream steps should use this id for updates.
     */
    messageId?: number;
  }

  /**
   * Context information required to complete message persistence for a chat turn.
   *
   * @remarks
   * This interface is provided to the finalization step that writes the completed
   * content, updates message/turn status, and records performance metrics.
   */
  export interface MessageCompletionContext {
    /**
     * Optional Drizzle transaction instance for atomic DB operations.
     * When provided, all completion writes should be performed with this txn.
     */
    tx?: DbTransactionType;

    /**
     * Identifier of the chat/conversation being completed.
     */
    chatId: string;

    /**
     * Optional numeric turn id (preferred form for DB operations).
     */
    turnId?: number;

    /**
     * Optional message id of the message to finalize.
     */
    messageId?: number;

    /**
     * The final accumulated text content to persist for the assistant message.
     */
    generatedText: string;

    /**
     * Epoch milliseconds timestamp indicating when generation started.
     * Used to compute processing duration/latency.
     */
    startTime: number;
  }
}
