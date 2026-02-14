import { log } from '@compliance-theater/logger';
import { Semaphore } from '@/lib/nextjs-util/semaphore-manager';
import { ensureCreateResult } from './stream-handler-result';
import { processStreamChunk } from './stream-handlers';
import { recordQueueOperation } from './instrumentation';
import { safeCompleteMessagePersistence, safeInitializeMessagePersistence, } from './message-persistence';
import { isError } from '@/lib/react-util/core';
export class ProcessingQueue {
    queue = [];
    semaphore = new Semaphore(1);
    nextTaskId = 1;
    async enqueue(chunk, context) {
        return new Promise((resolve, reject) => {
            const task = {
                id: this.nextTaskId++,
                chunk,
                context: { ...context },
                promise: Promise.resolve(),
                resolve,
                reject,
            };
            this.queue.push(task);
            recordQueueOperation('enqueue', true, this.queue.length);
            this.processQueue();
        });
    }
    async processTask(task) {
        try {
            const result = await processStreamChunk(task.chunk, task.context);
            if (!result.success) {
                recordQueueOperation('process', false, this.queue.length);
                throw new Error(`Processing failed for chunk type: ${task.chunk.type}`);
            }
            task.result = result;
            recordQueueOperation('process', true, this.queue.length);
        }
        catch (error) {
            recordQueueOperation('process', false, this.queue.length);
            log((l) => l.error('Task processing failed', {
                error,
                taskId: task.id,
                chunkType: task.chunk.type,
                chatId: task.context.chatId,
                turnId: task.context.turnId,
            }));
            throw error;
        }
    }
    async processQueue() {
        const state = this.semaphore.getState();
        if (state.availableSlots === 0 || this.queue.length === 0) {
            return;
        }
        await this.semaphore.acquire();
        try {
            while (this.queue.length > 0) {
                const task = this.queue[0];
                try {
                    await this.processTask(task);
                    const result = task.result;
                    if (result) {
                        this.updateSubsequentContexts(result);
                    }
                    task.resolve();
                    recordQueueOperation('complete', true, this.queue.length - 1);
                }
                catch (error) {
                    recordQueueOperation('complete', false, this.queue.length - 1);
                    task.reject(error instanceof Error ? error : new Error(String(error)));
                }
                this.queue.shift();
            }
        }
        finally {
            this.semaphore.release();
        }
    }
    updateSubsequentContexts(result) {
        for (const task of this.queue) {
            if (result.currentMessageOrder !== undefined) {
                task.context.currentMessageOrder = result.currentMessageOrder;
            }
            task.context.generatedText = result.generatedText;
            task.context.messageId = result.currentMessageId;
        }
    }
    getQueueLength() {
        return this.queue.length;
    }
    isProcessing() {
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
export const enqueueStream = async ({ stream, params, context, processingQueue, }) => {
    log((l) => l.verbose('=== ChatHistoryMiddleware.enqueueStream - BEGIN ==='));
    const startTime = Date.now();
    const generatedText = Promise.withResolvers();
    const result = Promise.withResolvers();
    const messagePersistence = await safeInitializeMessagePersistence(context, params);
    if (!messagePersistence) {
        throw new Error('Failed to initialize message persistence');
    }
    const { chatId, turnId, messageId } = messagePersistence;
    const streamContext = {
        chatId,
        currentMessageOrder: 0,
        turnId,
        messageId,
        streamedText: '',
        toolCalls: new Map(),
        errors: [],
        generatedJSON: [],
    };
    const transformStream = new TransformStream({
        async transform(chunk, controller) {
            controller.enqueue(chunk);
            const handlerContext = ensureCreateResult({
                chatId: streamContext.chatId,
                turnId: streamContext.turnId,
                toolCalls: streamContext.toolCalls,
                messageId: streamContext.messageId,
                currentMessageOrder: streamContext.currentMessageOrder,
                generatedText: streamContext.streamedText,
                generatedJSON: streamContext.generatedJSON,
            });
            processingQueue
                .enqueue(chunk, handlerContext)
                .catch((error) => {
                log((l) => l.error('Queued chunk processing failed', {
                    error,
                    turnId: streamContext.turnId,
                    chatId: streamContext.chatId,
                    chunkType: chunk.type,
                    queueLength: processingQueue.getQueueLength(),
                }));
                streamContext.errors.push(error);
            })
                .finally(() => {
                streamContext.currentMessageOrder =
                    handlerContext.currentMessageOrder;
                streamContext.streamedText = handlerContext.generatedText;
                streamContext.messageId = handlerContext.messageId;
            });
        },
        async flush() {
            try {
                await safeCompleteMessagePersistence({
                    chatId: streamContext.chatId,
                    turnId: streamContext.turnId,
                    messageId: streamContext.messageId,
                    generatedText: streamContext.streamedText,
                    startTime,
                });
                generatedText.resolve(streamContext.streamedText);
                result.resolve(streamContext);
            }
            catch (error) {
                log((l) => l.error('Failed to finalize message persistence state.', {
                    error,
                    turnId: streamContext.turnId,
                    chatId: streamContext.chatId,
                }));
                streamContext.errors.push(isError(error) ? error : new Error(String(error)));
            }
            log((l) => l.verbose('=== ChatHistoryMiddleware.flush ==='));
            context.turnId = streamContext.turnId;
            generatedText.resolve(streamContext.streamedText);
            if (streamContext.errors.length > 0) {
                result.reject(streamContext);
            }
            else {
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
//# sourceMappingURL=processing-queue.js.map