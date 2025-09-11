/**
 * @fileoverview Sequential Processing Queue for Chat History
 *
 * This module provides a queue-based system to ensure that stream chunks
 * are processed in FIFO order, even when individual database operations
 * have varying completion times.
 *
 * @module lib/ai/middleware/chat-history/processing-queue
 * @version 1.0.0
 * @since 2025-07-17
 */

import type {
  LanguageModelV2CallOptions,
  LanguageModelV2StreamPart,
} from '@ai-sdk/provider';
import { log } from '@/lib/logger';
import { processStreamChunk } from './stream-handlers';
import type {
  ChatHistoryContext,
  QueuedTask,
  StreamHandlerContext,
  StreamHandlerResult,
} from './types';
import { recordQueueOperation } from './instrumentation';
import { ChatMessagesType } from '@/lib/drizzle-db/drizzle-types';
import {
  safeCompleteMessagePersistence,
  safeInitializeMessagePersistence,
} from './message-persistence';
import { isError } from '@/lib/react-util/core';

/**
 * Sequential processing queue that maintains FIFO order for database operations.
 *
 * This queue ensures that even if individual database operations complete at
 * different speeds, the results are applied in the correct order to maintain
 * data consistency and proper state management.
 *
 * @example
 * ```typescript
 * const queue = new ProcessingQueue();
 *
 * // Add chunks - they'll be processed in order
 * queue.enqueue(chunk1, context1);
 * queue.enqueue(chunk2, context2);
 * queue.enqueue(chunk3, context3);
 *
 * // Even if chunk2 completes first, results applied in order
 * ```
 */
export class ProcessingQueue {
  private queue: QueuedTask[] = [];
  private processing = false;
  private nextTaskId = 1;

  /**
   * Adds a chunk to the processing queue.
   *
   * The chunk will be processed in FIFO order, ensuring that state updates
   * are applied sequentially even if database operations complete out of order.
   *
   * @param chunk - The stream chunk to process
   * @param context - The processing context
   * @returns Promise that resolves when the chunk has been processed
   */
  async enqueue(
    chunk: LanguageModelV2StreamPart,
    context: StreamHandlerContext,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const task: QueuedTask = {
        id: this.nextTaskId++,
        chunk,
        context: { ...context }, // Create a copy of the context
        promise: Promise.resolve(),
        resolve,
        reject,
      };

      this.queue.push(task);

      // Record queue metrics
      recordQueueOperation('enqueue', true, this.queue.length);

      this.processQueue();
    });
  }

  /**
   * Processes a single task by calling the stream chunk handler.
   *
   * @param task - The task to process
   * @returns Promise that resolves with the processing result
   */
  private async processTask(task: QueuedTask): Promise<void> {
    try {
      const result = await processStreamChunk(task.chunk, task.context);

      if (!result.success) {
        recordQueueOperation('process', false, this.queue.length);
        throw new Error(`Processing failed for chunk type: ${task.chunk.type}`);
      }

      // Store result on the task for later application
      task.result = result;
      recordQueueOperation('process', true, this.queue.length);
    } catch (error) {
      recordQueueOperation('process', false, this.queue.length);
      log((l) =>
        l.error('Task processing failed', {
          error,
          taskId: task.id,
          chunkType: task.chunk.type,
          chatId: task.context.chatId,
          turnId: task.context.turnId,
        }),
      );
      throw error;
    }
  }

  /**
   * Processes the queue in FIFO order, waiting for each task to complete
   * before applying its results and moving to the next task.
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const task = this.queue[0];

        try {
          // Process the task now, not when it was enqueued
          await this.processTask(task);

          // Apply the result in order
          const result = task.result;
          if (result) {
            // Update the context for subsequent tasks
            this.updateSubsequentContexts(result);
          }

          task.resolve();
          recordQueueOperation('complete', true, this.queue.length - 1);
        } catch (error) {
          recordQueueOperation('complete', false, this.queue.length - 1);
          task.reject(
            error instanceof Error ? error : new Error(String(error)),
          );
        }

        // Remove completed task
        this.queue.shift();
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Updates the context for all remaining tasks in the queue.
   *
   * This ensures that state changes (like updated message order or
   * accumulated text) are propagated to subsequent tasks.
   *
   * @param result - The result from the completed task
   */
  private updateSubsequentContexts(result: StreamHandlerResult): void {
    for (const task of this.queue) {
      if (result.currentMessageOrder !== undefined) {
        task.context.currentMessageOrder = result.currentMessageOrder;
      }
      task.context.generatedText = result.generatedText;
      task.context.messageId = result.currentMessageId;
    }
  }

  /**
   * Gets the current queue length for monitoring purposes.
   *
   * @returns The number of tasks currently in the queue
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Checks if the queue is currently processing tasks.
   *
   * @returns True if processing is active, false otherwise
   */
  isProcessing(): boolean {
    return this.processing;
  }
}

type StreamContext = {
  chatId: string;
  turnId: string;
  messageId: number | undefined;
  currentMessageOrder: number;
  toolCalls: Map<string, ChatMessagesType>;
  streamedText: string;
  errors: Error[];
  generatedJSON: Array<Record<string, unknown>>;
};

export const enqueueStream = async ({
  stream,
  params,
  context,
  processingQueue,
}: {
  stream: ReadableStream<LanguageModelV2StreamPart>;
  params: LanguageModelV2CallOptions;
  context: ChatHistoryContext;
  processingQueue: ProcessingQueue;
}): Promise<{
  stream: ReadableStream<LanguageModelV2StreamPart>;
  generatedText: Promise<string>;
  result: Promise<StreamContext>;
}> => {
  const startTime = Date.now();
  const generatedText = Promise.withResolvers<string>();
  const result = Promise.withResolvers<StreamContext>();
  // Initialize message persistence
  const messagePersistence = await safeInitializeMessagePersistence(
    context,
    params,
  );
  if (!messagePersistence) {
    throw new Error('Failed to initialize message persistence');
  }
  const { chatId, turnId, messageId } = messagePersistence;

  const streamContext: StreamContext = {
    chatId,
    currentMessageOrder: 0,
    turnId,
    messageId,
    streamedText: '',
    toolCalls: new Map<string, ChatMessagesType>(),
    errors: [],
    generatedJSON: [],
  };

  const transformStream = new TransformStream<
    LanguageModelV2StreamPart,
    LanguageModelV2StreamPart
  >({
    async transform(chunk, controller) {
      // Enqueue chunk immediately for maximum transparency
      // If this fails, let the error propagate - don't try again
      controller.enqueue(chunk);
      // Process chunk through queue to maintain FIFO order
      const handlerContext: StreamHandlerContext = {
        chatId: streamContext.chatId!,
        turnId: parseInt(streamContext.turnId!, 10),
        toolCalls: streamContext.toolCalls,
        messageId: streamContext.messageId,
        currentMessageOrder: streamContext.currentMessageOrder,
        generatedText: streamContext.streamedText,
        generatedJSON: streamContext.generatedJSON,
        createResult: (arg?: boolean | Partial<StreamHandlerResult>) => {
          const input =
            typeof arg == 'undefined' || typeof arg == 'boolean'
              ? {
                  success: arg !== false,
                }
              : arg;
          return {
            success: input.success ?? true,
            currentMessageId: handlerContext.messageId,
            currentMessageOrder: handlerContext.currentMessageOrder,
            generatedText: handlerContext.generatedText,
            generatedJSON: handlerContext.generatedJSON,
            // Ensure all expected fields are present
            toolCalls: handlerContext.toolCalls,
            chatId: streamContext.chatId!,
            turnId: parseInt(streamContext.turnId!, 10),
            messageId: handlerContext.messageId,
            ...input,
          };
        },
      };

      // Queue processing maintains order and updates local state
      processingQueue
        .enqueue(chunk, handlerContext)
        .then(() => {
          // Context is updated by the queue processor
          // Get the latest state for subsequent chunks
          streamContext.currentMessageOrder =
            handlerContext.currentMessageOrder;
          streamContext.streamedText = handlerContext.generatedText;
          streamContext.messageId = handlerContext.messageId;
        })
        .catch((error: Error) => {
          log((l) =>
            l.error('Queued chunk processing failed', {
              error,
              turnId: streamContext.turnId,
              chatId: streamContext.chatId,
              chunkType: chunk.type,
              queueLength: processingQueue.getQueueLength(),
            }),
          );
          streamContext.errors.push(error);
        });
    },

    async flush() {
      try {
        // Complete message persistence using shared utility
        await safeCompleteMessagePersistence({
          chatId: streamContext.chatId,
          turnId: Number(streamContext.turnId),
          messageId: streamContext.messageId,
          generatedText: streamContext.streamedText,
          startTime,
        });
        generatedText.resolve(streamContext.streamedText);
        result.resolve(streamContext);
      } catch (error) {
        log((l) =>
          l.error('Failed to finalize message persistence state.', {
            error,
            turnId: streamContext.turnId,
            chatId: streamContext.chatId,
          }),
        );
        streamContext.errors.push(
          isError(error) ? error : new Error(String(error)),
        );
      }
      context.turnId = streamContext.turnId;
      generatedText.resolve(streamContext.streamedText);
      if (streamContext.errors.length > 0) {
        result.reject(streamContext);
      } else {
        result.resolve(streamContext);
      }
    },
  });

  return {
    stream: stream.pipeThrough(transformStream),
    generatedText: generatedText.promise,
    result: result.promise,
  };
};
