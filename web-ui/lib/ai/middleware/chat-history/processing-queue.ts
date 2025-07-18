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

import type { LanguageModelV1StreamPart } from 'ai';
import { log } from '@/lib/logger';
import { processStreamChunk } from './stream-handlers';
import type { QueuedTask, StreamHandlerContext, StreamHandlerResult } from './types';



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
    chunk: LanguageModelV1StreamPart,
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
        throw new Error(`Processing failed for chunk type: ${task.chunk.type}`);
      }

      // Store result on the task for later application
      task.result = result;
    } catch (error) {
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
        } catch (error) {
          task.reject(error instanceof Error ? error : new Error(String(error)));
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
      if (result.generatedText !== undefined) {
        task.context.generatedText = result.generatedText;
      }
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
