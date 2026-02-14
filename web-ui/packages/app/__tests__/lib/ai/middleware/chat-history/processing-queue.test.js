import { setupImpersonationMock } from '@/__tests__/jest.mock-impersonation';
setupImpersonationMock();
import { ProcessingQueue } from '@/lib/ai/middleware/chat-history/processing-queue';
import { processStreamChunk } from '@/lib/ai/middleware/chat-history/stream-handlers';
import { log } from '@compliance-theater/logger';
import { ensureCreateResult } from '@/lib/ai/middleware/chat-history/stream-handler-result';
jest.mock('@/lib/ai/middleware/chat-history/stream-handlers', () => ({
    processStreamChunk: jest.fn(),
}));
jest.mock('@compliance-theater/logger', () => ({
    log: jest.fn((cb) => {
        const mockLogger = {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            debug: jest.fn(),
        };
        cb(mockLogger);
    }),
}));
const mockProcessStreamChunk = processStreamChunk;
const mockLog = log;
describe('ProcessingQueue', () => {
    let queue;
    let mockContext;
    let mockChunk;
    beforeEach(() => {
        queue = new ProcessingQueue();
        mockContext = ensureCreateResult({
            chatId: 'test-chat-123',
            turnId: 1,
            messageId: 42,
            currentMessageOrder: 1,
            generatedText: '',
            generatedJSON: [],
            toolCalls: new Map(),
        });
        mockChunk = {
            type: 'text-delta',
            delta: 'Hello world',
            id: 'chunk-1',
        };
    });
    describe('enqueue', () => {
        it('should handle task processing errors gracefully', async () => {
            const error = new Error('Processing failed');
            mockProcessStreamChunk.mockRejectedValue(error);
            await expect(queue.enqueue(mockChunk, mockContext)).rejects.toThrow('Processing failed');
            expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
            expect(queue.getQueueLength()).toBe(0);
            expect(queue.isProcessing()).toBe(false);
        });
        it('should continue processing remaining tasks after an error', async () => {
            const error = new Error('First task failed');
            const mockResult = {
                currentMessageOrder: 2,
                generatedText: 'Success',
                success: true,
            };
            const chunk1 = {
                type: 'text-delta',
                delta: 'Fail',
                id: 'chunk-1',
            };
            const chunk2 = {
                type: 'text-delta',
                delta: 'Success',
                id: 'chunk-2',
            };
            mockProcessStreamChunk
                .mockRejectedValueOnce(error)
                .mockResolvedValueOnce(mockResult);
            const promise1 = queue.enqueue(chunk1, mockContext);
            const promise2 = queue.enqueue(chunk2, mockContext);
            await expect(promise1).rejects.toThrow('First task failed');
            await promise2;
            expect(queue.getQueueLength()).toBe(0);
            expect(queue.isProcessing()).toBe(false);
        });
        it('should assign unique task IDs', async () => {
            const mockResult = {
                currentMessageOrder: 2,
                generatedText: 'Test',
                success: true,
            };
            mockProcessStreamChunk.mockResolvedValue(mockResult);
            const promise1 = queue.enqueue(mockChunk, mockContext);
            const promise2 = queue.enqueue(mockChunk, mockContext);
            const promise3 = queue.enqueue(mockChunk, mockContext);
            await Promise.all([promise1, promise2, promise3]);
            expect(mockProcessStreamChunk).toHaveBeenCalledTimes(3);
        });
    });
    describe('queue monitoring', () => {
        it('should track queue length correctly', async () => {
            const mockResult = {
                currentMessageOrder: 2,
                generatedText: 'Test',
                success: true,
            };
            mockProcessStreamChunk.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(mockResult), 50)));
            expect(queue.getQueueLength()).toBe(0);
            const promise1 = queue.enqueue(mockChunk, mockContext);
            expect(queue.getQueueLength()).toBe(1);
            const promise2 = queue.enqueue(mockChunk, mockContext);
            expect(queue.getQueueLength()).toBe(2);
            const promise3 = queue.enqueue(mockChunk, mockContext);
            expect(queue.getQueueLength()).toBe(3);
            await Promise.all([promise1, promise2, promise3]);
            expect(queue.getQueueLength()).toBe(0);
        });
        it('should track processing state correctly', async () => {
            const mockResult = {
                currentMessageOrder: 2,
                generatedText: 'Test',
                success: true,
            };
            mockProcessStreamChunk.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(mockResult), 50)));
            expect(queue.isProcessing()).toBe(false);
            const promise = queue.enqueue(mockChunk, mockContext);
            expect(queue.isProcessing()).toBe(true);
            await promise;
            expect(queue.isProcessing()).toBe(false);
        });
        it('should return current queue state', async () => {
            const mockResult = {
                currentMessageOrder: 2,
                generatedText: 'Test',
                success: true,
            };
            mockProcessStreamChunk.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(mockResult), 50)));
            const promise1 = queue.enqueue(mockChunk, mockContext);
            const promise2 = queue.enqueue(mockChunk, mockContext);
            expect(queue.getQueueLength()).toBe(2);
            expect(queue.isProcessing()).toBe(true);
            await Promise.all([promise1, promise2]);
            expect(queue.getQueueLength()).toBe(0);
            expect(queue.isProcessing()).toBe(false);
        });
    });
    describe('edge cases', () => {
        it('should handle empty queue gracefully', () => {
            expect(queue.getQueueLength()).toBe(0);
            expect(queue.isProcessing()).toBe(false);
        });
        it('should handle rapid sequential enqueues', async () => {
            const mockResult = {
                currentMessageOrder: 2,
                generatedText: 'Test',
                success: true,
            };
            mockProcessStreamChunk.mockResolvedValue(mockResult);
            const promises = Array.from({ length: 10 }, (_, i) => queue.enqueue({
                type: 'text-delta',
                delta: `chunk-${i}`,
                id: `chunk-${i}`,
            }, { ...mockContext, currentMessageOrder: i }));
            expect(queue.getQueueLength()).toBe(10);
            expect(queue.isProcessing()).toBe(true);
            await Promise.all(promises);
            expect(queue.getQueueLength()).toBe(0);
            expect(queue.isProcessing()).toBe(false);
            expect(mockProcessStreamChunk).toHaveBeenCalledTimes(10);
        });
        it('should handle concurrent queue state queries', async () => {
            const mockResult = {
                currentMessageOrder: 2,
                generatedText: 'Test',
                success: true,
            };
            mockProcessStreamChunk.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(mockResult), 100)));
            const promise = queue.enqueue(mockChunk, mockContext);
            expect(queue.getQueueLength()).toBe(1);
            expect(queue.isProcessing()).toBe(true);
            await promise;
            expect(queue.getQueueLength()).toBe(0);
            expect(queue.isProcessing()).toBe(false);
        });
    });
});
//# sourceMappingURL=processing-queue.test.js.map