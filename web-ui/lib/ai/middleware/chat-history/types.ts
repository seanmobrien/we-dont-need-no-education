/**
 * @fileoverview Chat History Middleware Type Definitions
 *
 * This module provides comprehensive type definitions for the AI chat history middleware system.
 * It defines the core data structures and interfaces used throughout the message processing
 * pipeline, from initial chat context through streaming response handling to final persistence.
 *
 * **Type Categories:**
 * - **Context Types**: Core session and processing context information
 * - **Stream Processing Types**: Real-time message streaming and chunk handling
 * - **Task Management Types**: Asynchronous processing queue and task coordination
 * - **Completion Types**: Turn finalization and persistence operations
 * - **Configuration Types**: System behavior and feature control settings
 *
 * **Key Design Principles:**
 * - **Type Safety**: Strong typing for all middleware operations and data flows
 * - **Flexibility**: Optional properties enable progressive enhancement and backward compatibility
 * - **Composability**: Interfaces designed for extension and reuse across components
 * - **Performance**: Minimal overhead types optimized for high-throughput scenarios
 * - **Debugging**: Rich metadata support for operational monitoring and troubleshooting
 *
 * **Data Flow Architecture:**
 * ```
 * ChatHistoryContext → StreamHandlerContext → QueuedTask → FlushContext
 *        ↓                    ↓                 ↓           ↓
 *   Session Setup      Stream Processing   Task Queue   Completion
 * ```
 * - **Database Operations**: Structured for efficient ORM and query operations
 * - **Middleware Pipeline**: Designed for seamless integration with processing chains
 * - **Real-time Systems**: Optimized for streaming and asynchronous processing
 *
 * **Performance Characteristics:**
 * - Minimal memory footprint for high-volume chat applications
 * - Efficient serialization for database storage and network transmission
 * - Type-safe operations preventing runtime errors and data corruption
 * - Structured logging support for monitoring and analytics
 *
 * **Use Cases:**
 * - AI chat application development
 * - Real-time conversation streaming
 * - Message persistence and history management
 * - Multi-turn dialogue state tracking
 * - Tool-calling workflow coordination
 * - Chat analytics and monitoring
 *
 * @module chat-history-types
 * @version 2.0.0
 * @author AI Middleware Team
 * @since 1.0.0
 */

import type { DbTransactionType, ChatMessagesType } from '@/lib/drizzle-db';
import { LanguageModelV2StreamPart } from '@ai-sdk/provider';
import { Span } from '@opentelemetry/api';

// ============================================================================
// Core Context Types
// ============================================================================

/**
 * Core context information required for chat history operations.
 *
 * @remarks
 * This interface serves as the foundational context for all chat history middleware
 * operations. It carries essential session information, user identification, and
 * model configuration throughout the processing pipeline. The interface is designed
 * with optional properties to support progressive enhancement and backward compatibility.
 *
 * **Context Lifecycle:**
 * - Created at the start of each chat request
 * - Passed through all middleware stages
 * - Used for database operations and logging
 * - Preserved for audit trails and analytics
 *
 * **Security Considerations:**
 * - User ID enables proper access control and data isolation
 * - Chat ID allows session continuity and conversation threading
 * - Request ID enables distributed tracing and debugging
 *
 * **Model Configuration:**
 * - Model name enables provider-specific handling
 * - Temperature and topP control response generation characteristics
 * - Configuration is preserved for reproducibility and debugging
 *
 * @interface ChatHistoryContext
 * @category Core Context
 * @example
 * ```typescript
 * // Basic chat context for new conversation
 * const context: ChatHistoryContext = {
 *   userId: 'user_123',
 *   requestId: 'req_abc789'
 * };
 *
 * // Complete context with model configuration
 * const fullContext: ChatHistoryContext = {
 *   userId: 'user_456',
 *   chatId: 'chat_def123',
 *   requestId: 'req_xyz456',
 *   model: 'gpt-4',
 *   temperature: 0.7,
 *   topP: 0.9
 * };
 * ```
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
   * Recommended for production systems and monitoring.
   */
  requestId?: string;

  /**
   * Optional name of the AI model being used.
   * Enables provider-specific handling and response optimization.
   * Examples: 'gpt-4', 'gpt-3.5-turbo', 'claude-3'
   */
  model?: string;

  /**
   * Optional temperature setting for response generation.
   * Controls randomness in model responses (0.0 = deterministic, 1.0 = creative).
   * Preserved for reproducibility and debugging purposes.
   */
  temperature?: number;

  /**
   * Optional top-p (nucleus sampling) setting for response generation.
   * Controls diversity of model responses (0.1 = focused, 1.0 = diverse).
   * Preserved for reproducibility and debugging purposes.
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
   * Note this differs from the turn number in that it
   * is calculated by chat context instance, not the overall
   * conversation.
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
 * @internal
 */
export type ToolStatus = 'pending' | 'result' | 'error' | 'content';

// ============================================================================
// Stream Processing Types
// ============================================================================

/**
 * Context information required for processing individual stream chunks.
 *
 * @remarks
 * This interface maintains the state needed during real-time stream processing.
 * It tracks the current position in the conversation, accumulates generated content,
 * and provides the necessary identifiers for database operations. The context is
 * updated as each stream chunk is processed to maintain consistency.
 *
 * **Stream Processing Flow:**
 * - Created when streaming begins for a conversation turn
 * - Updated with each incoming stream chunk
 * - Tracks message ordering and content accumulation
 * - Used for incremental database updates
 *
 * **State Management:**
 * - Message ordering ensures proper conversation flow
 * - Text accumulation enables incremental content building
 * - Identifiers link chunks to database records
 * - Context preservation enables error recovery
 *
 * **Performance Considerations:**
 * - Minimal state to reduce memory overhead
 * - Efficient string accumulation for large responses
 * - Fast lookup identifiers for database operations
 * - Immutable design for thread safety
 *
 * @interface StreamHandlerContext
 * @category Stream Processing
 * @example
 * ```typescript
 * // Initial stream context setup
 * const streamContext: StreamHandlerContext = {
 *   chatId: 'chat_123',
 *   turnId: 5,
 *   messageId: 42,
 *   currentMessageOrder: 3,
 *   generatedText: ''
 * };
 *
 * // Context after processing several chunks
 * const updatedContext: StreamHandlerContext = {
 *   ...streamContext,
 *   generatedText: 'Hello, I can help you with...',
 *   currentMessageOrder: 4
 * };
 * ```
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
   * Structured collection of objects reconstructed from phased streaming
   * parts (*-start / *-delta / *-end). Each entry is one logical object; for
   * streaming objects (like tool-input) the final assembled form is pushed
   * on *-end. Non-streaming generic *-start parts are pushed immediately as
   * normalized objects with their '-start' suffix removed.
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
 *
 * @remarks
 * This interface captures the outcome of processing an individual stream chunk,
 * including updated state information and success status. It enables the calling
 * code to track processing progress, handle errors gracefully, and maintain
 * consistent state across the streaming pipeline.
 *
 * **Result Processing:**
 * - Success flag indicates whether chunk was processed without errors
 * - Updated counters enable state synchronization
 * - Accumulated text tracks content generation progress
 * - Error information (when success is false) enables recovery
 *
 * **State Synchronization:**
 * - Message order tracking prevents sequence corruption
 * - Text accumulation enables incremental UI updates
 * - Success status enables error handling and retry logic
 * - Consistent return format simplifies calling code
 *
 * **Error Handling:**
 * - Boolean success flag for simple error checking
 * - Preserved state even on failure for recovery
 * - Consistent interface regardless of outcome
 * - Enables graceful degradation and retry strategies
 *
 * @interface StreamHandlerResult
 * @category Stream Processing
 * @example
 * ```typescript
 * // Successful chunk processing
 * const successResult: StreamHandlerResult = {
 *   currentMessageOrder: 4,
 *   generatedText: 'Hello, I can help you...',
 *   success: true
 * };
 *
 * // Failed chunk processing (with preserved state)
 * const errorResult: StreamHandlerResult = {
 *   currentMessageOrder: 3, // Previous valid state
 *   generatedText: 'Hello, I can',
 *   success: false
 * };
 * ```
 */
export interface StreamHandlerResult {
  /**
   *the conversation identifier for the
   * processed chunk.
   *
   */
  chatId: string;

  /**
   * This is the numeric turn identifier associated with
   * the processed chunk.
   *
   */
  turnId: number;

  /**
   * messageId of the current chunk being processed.
   *
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
   * Contains all generated content included in the current message up to this point in the response.
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

// ============================================================================
// Task Management Types
// ============================================================================

/**
 * Represents a queued processing task for asynchronous stream chunk handling.
 *
 * @remarks
 * This interface defines the structure for tasks in the asynchronous processing queue.
 * Each task represents a single stream chunk that needs to be processed, along with
 * its context and the promises needed for coordination. The queue enables ordered
 * processing while maintaining system responsiveness.
 *
 * **Queue Management:**
 * - Tasks are processed in order to maintain conversation flow
 * - Each task has a unique ID for tracking and debugging
 * - Promises enable asynchronous coordination and error handling
 * - Results are stored for subsequent processing stages
 *
 * **Asynchronous Coordination:**
 * - Promise-based design enables non-blocking operations
 * - Resolve/reject functions provide completion signaling
 * - Context preservation enables stateful processing
 * - Result storage enables downstream consumption
 *
 * **Error Handling:**
 * - Individual task errors don't block the queue
 * - Reject functions enable error propagation
 * - Context preservation enables retry operations
 * - Result tracking enables debugging and monitoring
 *
 * **Performance Benefits:**
 * - Non-blocking queue processing maintains system responsiveness
 * - Ordered execution preserves conversation integrity
 * - Parallel preparation enables pipeline optimization
 * - Memory-efficient task representation
 *
 * @interface QueuedTask
 * @category Task Management
 * @example
 * ```typescript
 * // Create a new queued task
 * const task: QueuedTask = {
 *   id: 1,
 *   chunk: { type: 'text-delta', textDelta: 'Hello' },
 *   context: streamContext,
 *   promise: taskPromise,
 *   resolve: () => console.log('Task completed'),
 *   reject: (error) => console.error('Task failed:', error)
 * };
 *
 * // Task after processing
 * const completedTask: QueuedTask = {
 *   ...task,
 *   result: {
 *     currentMessageOrder: 4,
 *     generatedText: 'Hello, world',
 *     success: true
 *   }
 * };
 * ```
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

// ============================================================================
// Completion and Persistence Types
// ============================================================================

/**
 * Context information required for flush operations when completing a chat turn.
 *
 * @remarks
 * This interface provides all necessary information for finalizing a conversation turn,
 * including content persistence, performance metrics calculation, and status updates.
 * The flush operation represents the final stage of message processing, ensuring
 * all data is properly saved and the turn is marked as complete.
 *
 * **Flush Operations:**
 * - Final content persistence to database
 * - Performance metrics calculation and storage
 * - Turn status updates and completion signaling
 * - Analytics data preparation and logging
 *
 * **Performance Tracking:**
 * - Start time enables latency calculation
 * - Content length tracking for analytics
 * - Processing metrics for monitoring
 * - Error tracking for debugging
 *
 * **Data Integrity:**
 * - Final text represents complete generated response
 * - Identifiers ensure proper database targeting
 * - Timing data enables performance analysis
 * - Complete context for audit trails
 *
 * **Analytics Support:**
 * - Turn completion metrics
 * - Response length statistics
 * - Performance benchmarking data
 * - Error rate and pattern tracking
 *
 * @interface FlushContext
 * @category Completion
 * @example
 * ```typescript
 * // Flush context for completed conversation
 * const flushContext: FlushContext = {
 *   chatId: 'chat_123',
 *   turnId: 5,
 *   messageId: 42,
 *   generatedText: 'Complete AI response here...',
 *   startTime: Date.now() - 2500 // 2.5 seconds ago
 * };
 *
 * // Minimal flush context (IDs optional for some operations)
 * const minimalFlush: FlushContext = {
 *   chatId: 'chat_456',
 *   generatedText: 'Short response',
 *   startTime: Date.now() - 500
 * };
 * ```
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
 *
 * @remarks
 * This interface captures the outcomes and metrics from finalizing a conversation turn,
 * providing essential feedback for monitoring, analytics, and error handling. The flush
 * result represents the final status of message processing and includes both success
 * indicators and performance metrics.
 *
 * **Operation Status:**
 * - Success flag indicates completion state
 * - Error information for debugging failures
 * - Database operation confirmations
 * - Processing stage indicators
 *
 * **Performance Metrics:**
 * - Processing duration calculation
 * - Content length statistics
 * - Database operation timing
 * - Resource usage indicators
 *
 * **Quality Assurance:**
 * - Data integrity verification
 * - Completion status validation
 * - Error categorization and reporting
 * - Audit trail information
 *
 * **Analytics Data:**
 * - Response generation timing
 * - Content volume metrics
 * - Success/failure rates
 * - Performance benchmarking
 *
 * **Error Recovery:**
 * - Detailed error information
 * - Recovery action suggestions
 * - Retry coordination data
 * - Failure pattern tracking
 *
 * @interface FlushResult
 * @category Completion
 * @example
 * ```typescript
 * // Successful flush result
 * const successResult: FlushResult = {
 *   success: true,
 *   processingTimeMs: 1250,
 *   contentLength: 486,
 *   finalMessageId: 42
 * };
 *
 * // Failed flush result with error details
 * const errorResult: FlushResult = {
 *   success: false,
 *   error: new Error('Database connection timeout'),
 *   processingTimeMs: 5000,
 *   contentLength: 320,
 *   retryRecommended: true
 * };
 *
 * // Minimal successful result
 * const minimalResult: FlushResult = {
 *   success: true,
 *   processingTimeMs: 800
 * };
 * ```
 *
 * @property success Indicates whether the flush operation completed successfully.
 * @property error Error information if the flush operation failed.
 * @property processingTimeMs Total time spent processing the flush operation in milliseconds.
 * @property contentLength Length of the content that was persisted during the flush.
 * @property finalMessageId Database ID of the final persisted message record.
 * @property retryRecommended Indicates whether a retry of the operation is recommended.
 * @property metadata Additional metadata about the flush operation.
 * @property textLength Length of the final generated text content.
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
 *
 * @remarks
 * This interface defines parameters that control how and when flush operations are
 * executed during conversation completion. It provides fine-grained control over
 * timing, persistence behavior, error handling, and performance optimization.
 *
 * **Timing Control:**
 * - Flush interval determines periodic persistence frequency
 * - Timeout settings prevent hanging operations
 * - Debounce options optimize batch processing
 * - Immediate flush overrides for critical operations
 *
 * **Performance Optimization:**
 * - Batch size controls database efficiency
 * - Buffer management reduces I/O overhead
 * - Compression options for large content
 * - Memory usage optimization settings
 *
 * **Reliability Features:**
 * - Retry configuration for failed operations
 * - Backup persistence strategies
 * - Data integrity verification
 * - Recovery mechanism controls
 *
 * **Monitoring Integration:**
 * - Metrics collection enablement
 * - Performance tracking options
 * - Error reporting configuration
 * - Analytics data preparation
 *
 * **Customization Options:**
 * - Content filtering rules
 * - Persistence format selection
 * - Compression algorithms
 * - Storage destination routing
 *
 * @interface FlushConfig
 * @category Configuration
 * @example
 * ```typescript
 * // Standard production configuration
 * const prodConfig: FlushConfig = {
 *   autoGenerateTitle: true,
 *   maxTitleLength: 100,
 *   titleWordCount: 8,
 *   flushIntervalMs: 1000,
 *   timeoutMs: 5000,
 *   enableMetrics: true,
 *   batchSize: 50,
 *   retryAttempts: 3,
 *   compressionEnabled: true
 * };
 *
 * // Development configuration with verbose logging
 * const devConfig: FlushConfig = {
 *   autoGenerateTitle: true,
 *   maxTitleLength: 150,
 *   titleWordCount: 10,
 *   flushIntervalMs: 500,
 *   timeoutMs: 10000,
 *   enableMetrics: true,
 *   verboseLogging: true,
 *   retryAttempts: 1
 * };
 *
 * // Minimal configuration for testing
 * const testConfig: FlushConfig = {
 *   autoGenerateTitle: false,
 *   maxTitleLength: 50,
 *   titleWordCount: 5
 * };
 * ```
 */
export interface FlushConfig {
  /**
   * Whether to automatically generate chat titles based on conversation content.
   * When enabled, uses AI to create descriptive titles from initial exchanges.
   */
  autoGenerateTitle: boolean;

  /**
   * Maximum character length for generated chat titles.
   * Ensures titles remain readable and fit within UI constraints.
   */
  maxTitleLength: number;

  /**
   * Target number of words to include in generated titles.
   * Balances descriptiveness with brevity for optimal readability.
   */
  titleWordCount: number;

  /**
   * Interval in milliseconds between periodic flush operations.
   * Controls how frequently partial content is persisted to storage.
   */
  flushIntervalMs?: number;

  /**
   * Maximum time in milliseconds to wait for flush operations to complete.
   * Prevents hanging operations and ensures system responsiveness.
   */
  timeoutMs?: number;

  /**
   * Whether to collect and report performance metrics during flush operations.
   * Enables monitoring and optimization of persistence performance.
   */
  enableMetrics?: boolean;

  /**
   * Number of messages to batch together for efficient database operations.
   * Optimizes I/O performance while maintaining reasonable memory usage.
   */
  batchSize?: number;

  /**
   * Maximum number of retry attempts for failed flush operations.
   * Provides resilience against transient failures and network issues.
   */
  retryAttempts?: number;

  /**
   * Whether to enable content compression for large messages.
   * Reduces storage requirements and network overhead for substantial responses.
   */
  compressionEnabled?: boolean;

  /**
   * Whether to enable verbose logging during flush operations.
   * Useful for development and debugging of persistence workflows.
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
 *
 * @interface MessagePersistenceInit
 * @category Completion
 * @example
 * ```typescript
 * const init: MessagePersistenceInit = {
 *   chatId: 'chat_123',
 *   turnId: '5',
 *   messageId: 42
 * };
 * ```
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
 *
 * @interface MessageCompletionContext
 * @category Completion
 * @example
 * ```typescript
 * const completion: MessageCompletionContext = {
 *   chatId: 'chat_123',
 *   turnId: 5,
 *   messageId: 42,
 *   generatedText: 'Final response',
 *   startTime: Date.now() - 1200
 * };
 * ```
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
