/**
 * @fileoverview Sequential Processing Queue for Chat History.
 *
 * This module provides a queue-based system to ensure that stream chunks
 * are processed in FIFO order, even when individual database operations
 * have varying completion times.
 */

import type {
  LanguageModelV2CallOptions,
  LanguageModelV2StreamPart,
} from '@ai-sdk/provider';
import { ChatMessagesType } from '../../../drizzle-db/drizzle-types';
import type {
  ChatHistoryContext,
  QueuedTask,
  StreamHandlerContext,
  StreamHandlerResult,
} from './types';

declare module '@/lib/ai/middleware/chat-history/processing-queue' {
  /**
   * Sequential processing queue that maintains FIFO order for database operations.
   *
   * This queue ensures that even if individual database operations complete at
   * different speeds, the results are applied in the correct order to maintain
   * data consistency and proper state management.
   */
  export class ProcessingQueue {
    private queue: QueuedTask[];
    private semaphore: unknown; // Using any to avoid importing Semaphore private class
    private nextTaskId: number;

    /**
     * Adds a chunk to the processing queue.
     *
     * The chunk will be processed in FIFO order, ensuring that state updates
     * are applied sequentially even if database operations complete out of order.
     *
     * @param chunk - The stream chunk to process.
     * @param context - The processing context.
     * @returns {Promise<void>} Promise that resolves when the chunk has been processed.
     */
    enqueue(
      chunk: LanguageModelV2StreamPart,
      context: StreamHandlerContext,
    ): Promise<void>;

    /**
     * Processes a single task by calling the stream chunk handler.
     *
     * @param task - The task to process.
     * @returns {Promise<void>} Promise that resolves with the processing result.
     */
    private processTask(task: QueuedTask): Promise<void>;

    /**
     * Processes the queue in FIFO order, waiting for each task to complete
     * before applying its results and moving to the next task.
     *
     * Uses Semaphore(1) as a mutex to ensure only one processor runs at a time.
     */
    private processQueue(): Promise<void>;

    /**
     * Updates the context for all remaining tasks in the queue.
     *
     * This ensures that state changes (like updated message order or
     * accumulated text) are propagated to subsequent tasks.
     *
     * @param result - The result from the completed task.
     */
    private updateSubsequentContexts(result: StreamHandlerResult): void;

    /**
     * Gets the current queue length for monitoring purposes.
     *
     * @returns {number} The number of tasks currently in the queue.
     */
    getQueueLength(): number;

    /**
     * Checks if the queue is currently processing tasks.
     *
     * @returns {boolean} True if processing is active (semaphore acquired), false otherwise.
     */
    isProcessing(): boolean;

    /**
     * Gets detailed queue status for monitoring and debugging.
     *
     * @returns {{ queueLength: number; isProcessing: boolean; semaphoreState: any }} Object containing queue metrics and semaphore state.
     */
    getQueueStatus(): {
      queueLength: number;
      isProcessing: boolean;
      semaphoreState: unknown;
    };
  }

  export type StreamContext = {
    chatId: string;
    turnId: string;
    messageId: number | undefined;
    currentMessageOrder: number;
    toolCalls: Map<string, ChatMessagesType>;
    streamedText: string;
    errors: Error[];
    generatedJSON: Array<Record<string, unknown>>;
  };

  /**
   * Enqueues a stream for processing.
   *
   * @param params - The parameters for enqueuing the stream.
   * @param params.stream - The readable stream of language model parts.
   * @param params.params - The call options for the language model.
   * @param params.context - The chat history context.
   * @param params.processingQueue - The processing queue instance.
   * @returns {Promise<{ stream: ReadableStream<LanguageModelV2StreamPart>; generatedText: Promise<string>; result: Promise<StreamContext> }>} The processed stream and result promises.
   */
  export const enqueueStream: ({
    stream,
    params,
    context,
    processingQueue,
  }: {
    stream: ReadableStream<LanguageModelV2StreamPart>;
    params: LanguageModelV2CallOptions;
    context: ChatHistoryContext;
    processingQueue: ProcessingQueue;
  }) => Promise<{
    stream: ReadableStream<LanguageModelV2StreamPart>;
    generatedText: Promise<string>;
    result: Promise<StreamContext>;
  }>;
}
