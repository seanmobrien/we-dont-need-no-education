import { LanguageModelV1StreamPart } from "ai";

export interface ChatHistoryContext {
  userId: string;
  chatId?: string;
  requestId?: string;
  model?: string;
  temperature?: number;
  topP?: number;
}
/**
 * Context information needed for stream chunk processing.
 * 
 * @interface StreamHandlerContext
 */
export interface StreamHandlerContext {
  /** Current chat ID */
  chatId: string;
  /** Current turn ID */
  turnId: number;
  /** Message ID for the assistant response */
  messageId?: number;
  /** Current message order counter */
  currentMessageOrder: number;
  /** Accumulated generated text */
  generatedText: string;
}

/**
 * Result from processing a stream chunk.
 * 
 * @interface StreamHandlerResult
 */
export interface StreamHandlerResult {
  /** Updated message order counter */
  currentMessageOrder: number;
  /** Updated accumulated text */
  generatedText: string;
  /** Whether the chunk was successfully processed */
  success: boolean;
}

/**
 * Interface for queued processing tasks.
 */
export interface QueuedTask {
  /** Unique identifier for the task */
  id: number;
  /** The stream chunk to process */
  chunk: LanguageModelV1StreamPart;
  /** Context for processing the chunk */
  context: StreamHandlerContext;
  /** Promise that resolves when task completes */
  promise: Promise<void>;
  /** Function to resolve the task */
  resolve: () => void;
  /** Function to reject the task */
  reject: (error: Error) => void;
  /** Result from processing the task */
  result?: StreamHandlerResult;
}

/**
 * Context information needed for flush operations when completing a chat turn.
 * 
 * @interface FlushContext
 */
export interface FlushContext {
  /** Current chat ID */
  chatId: string;
  /** Current turn ID */
  turnId?: number;
  /** Message ID for the assistant response */
  messageId?: number;
  /** Final accumulated text content */
  generatedText: string;
  /** Turn start time for latency calculation */
  startTime: number;
}

/**
 * Result from completing a flush operation.
 * 
 * @interface FlushResult
 */
export interface FlushResult {
  /** Whether the flush operation was successful */
  success: boolean;
  /** Calculated latency in milliseconds */
  latencyMs: number;
  /** Final text length for logging */
  textLength: number;
  /** Any error that occurred during flush */
  error?: Error;
}

/**
 * Configuration for flush operation behavior.
 * 
 * @interface FlushConfig
 */
export interface FlushConfig {
  /** Whether to auto-generate chat titles */
  autoGenerateTitle: boolean;
  /** Maximum length for generated titles */
  maxTitleLength: number;
  /** Number of words to use for title generation */
  titleWordCount: number;
}