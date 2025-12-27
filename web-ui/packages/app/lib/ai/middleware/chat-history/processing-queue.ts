import type {
  LanguageModelV2CallOptions,
  LanguageModelV2StreamPart,
} from '@ai-sdk/provider';
import { log } from '@repo/lib-logger';
import { Semaphore } from '@/lib/nextjs-util/semaphore-manager';
import { ensureCreateResult } from './stream-handler-result';
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

export class ProcessingQueue {
  private queue: QueuedTask[] = [];
  private semaphore = new Semaphore(1); // Mutex: ensures only 1 task processes at a time
  private nextTaskId = 1;

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

  private async processQueue(): Promise<void> {
    // Check if already processing or queue empty
    const state = this.semaphore.getState();
    if (state.availableSlots === 0 || this.queue.length === 0) {
      return; // Already processing or nothing to process
    }

    // Acquire mutex lock - only one processor can run
    await this.semaphore.acquire();

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
      // Release mutex lock
      this.semaphore.release();
    }
  }

  private updateSubsequentContexts(result: StreamHandlerResult): void {
    for (const task of this.queue) {
      if (result.currentMessageOrder !== undefined) {
        task.context.currentMessageOrder = result.currentMessageOrder;
      }
      task.context.generatedText = result.generatedText;
      task.context.messageId = result.currentMessageId;
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  isProcessing(): boolean {
    return this.semaphore.getState().activeOperations > 0;
  }

  getQueueStatus() {
    const state = this.semaphore.getState();
    return {
      queueLength: this.queue.length,
      isProcessing: state.activeOperations > 0,
      semaphoreState: state,
    };
  }
}

type StreamContext = {
  chatId: string;
  turnId: number;
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
  log((l) => l.verbose('=== ChatHistoryMiddleware.enqueueStream - BEGIN ==='));
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
      const handlerContext: StreamHandlerContext = ensureCreateResult({
        chatId: streamContext.chatId,
        turnId: streamContext.turnId,
        toolCalls: streamContext.toolCalls,
        messageId: streamContext.messageId,
        currentMessageOrder: streamContext.currentMessageOrder,
        generatedText: streamContext.streamedText,
        generatedJSON: streamContext.generatedJSON,
      });
      // Queue processing maintains order and updates local state
      processingQueue
        .enqueue(chunk, handlerContext)
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
        })
        .finally(() => {
          // Context is updated by the queue processor
          // Get the latest state for subsequent chunks
          streamContext.currentMessageOrder =
            handlerContext.currentMessageOrder;
          streamContext.streamedText = handlerContext.generatedText;
          streamContext.messageId = handlerContext.messageId;
        });
    },

    async flush() {
      try {
        // Complete message persistence using shared utility
        await safeCompleteMessagePersistence({
          chatId: streamContext.chatId,
          turnId: streamContext.turnId,
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
      log((l) => l.verbose('=== ChatHistoryMiddleware.flush ==='));
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
