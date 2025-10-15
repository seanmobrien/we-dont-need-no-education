 
/**
 * @fileoverview Unit tests for ProcessingQueue class
 *
 * This test suite validates the FIFO sequential processing queue used for handling
 * chat history stream chunks. Tests cover enqueue operations, task processing,
 * context propagation, error handling, and queue monitoring.
 *
 * @module __tests__/lib/ai/middleware/chat-history/processing-queue
 * @version 1.0.0
 * @since 2025-07-17
 */

import { setupImpersonationMock } from '@/__tests__/jest.mock-impersonation';

setupImpersonationMock();

import { ProcessingQueue } from '@/lib/ai/middleware/chat-history/processing-queue';
import { processStreamChunk } from '@/lib/ai/middleware/chat-history/stream-handlers';
import { log } from '@/lib/logger';
import type { LanguageModelV2StreamPart } from '@ai-sdk/provider';
import type { StreamHandlerContext } from '@/lib/ai/middleware/chat-history/types';
import { ensureCreateResult } from '@/lib/ai/middleware/chat-history/stream-handler-result';

// Mock dependencies
jest.mock('@/lib/ai/middleware/chat-history/stream-handlers', () => ({
  processStreamChunk: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  log: jest.fn((cb: (l: { error: jest.Mock }) => void) => {
    const mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    };
    cb(mockLogger);
  }),
}));

// Type-safe mocks
const mockProcessStreamChunk = processStreamChunk as jest.MockedFunction<
  typeof processStreamChunk
>;
const mockLog = log as jest.MockedFunction<typeof log>;

describe('ProcessingQueue', () => {
  let queue: ProcessingQueue;
  let mockContext: StreamHandlerContext;
  let mockChunk: LanguageModelV2StreamPart;

  beforeEach(() => {
    // Reset all mocks
    // jest.clearAllMocks();

    // Create fresh queue instance
    queue = new ProcessingQueue();

    // Setup mock context
    mockContext = ensureCreateResult({
      chatId: 'test-chat-123',
      turnId: 1,
      messageId: 42,
      currentMessageOrder: 1,
      generatedText: '',
      generatedJSON: [],
      toolCalls: new Map(),
    });

    // Setup mock chunk
    mockChunk = {
      type: 'text-delta',
      delta: 'Hello world',
      id: 'chunk-1',
    };
  });

  describe('enqueue', () => {
    /*
    it('should enqueue a task successfully', async () => {
      const mockResult: any = {
        currentMessageOrder: 2,
        generatedText: 'Hello world',
        success: true,
      };
      
      mockProcessStreamChunk.mockResolvedValue(mockResult);
      
      expect(queue.getQueueLength()).toBe(0);
      expect(queue.isProcessing()).toBe(false);
      
      const resultPromise = queue.enqueue(mockChunk, mockContext);
      
      expect(queue.getQueueLength()).toBe(1);
      expect(queue.isProcessing()).toBe(true);
      
      await resultPromise;
      
      expect(mockProcessStreamChunk).toHaveBeenCalledWith(mockChunk, mockContext);
      expect(queue.getQueueLength()).toBe(0);
      expect(queue.isProcessing()).toBe(false);
    });

    it('should handle multiple enqueued tasks in FIFO order', async () => {
      const mockResult1: StreamHandlerResult = {
        currentMessageOrder: 2,
        generatedText: 'Hello',
        success: true,
      };
      
      const mockResult2: StreamHandlerResult = {
        currentMessageOrder: 3,
        generatedText: 'Hello world',
        success: true,
      };
      
      const chunk1 = { type: 'text-delta' as const, textDelta: 'Hello' };
      const chunk2 = { type: 'text-delta' as const, textDelta: ' world' };
      
      // Mock sequential processing
      mockProcessStreamChunk
        .mockResolvedValueOnce(mockResult1)
        .mockResolvedValueOnce(mockResult2);
      
      // Enqueue multiple tasks
      const promise1 = queue.enqueue(chunk1, mockContext);
      const promise2 = queue.enqueue(chunk2, mockContext);
      
      expect(queue.getQueueLength()).toBe(2);
      expect(queue.isProcessing()).toBe(true);
      
      // Wait for both to complete
      await Promise.all([promise1, promise2]);
      
      expect(queue.getQueueLength()).toBe(0);
      expect(queue.isProcessing()).toBe(false);
      
      // Verify FIFO order
      expect(mockProcessStreamChunk).toHaveBeenNthCalledWith(1, chunk1, mockContext);
      expect(mockProcessStreamChunk).toHaveBeenNthCalledWith(2, chunk2, expect.objectContaining({
        currentMessageOrder: 2,
        generatedText: 'Hello',
      }));
    });

    it('should propagate context updates between tasks', async () => {
      const mockResult1: StreamHandlerResult = {
        currentMessageOrder: 2,
        generatedText: 'Hello',
        success: true,
      };
      
      const mockResult2: StreamHandlerResult = {
        currentMessageOrder: 3,
        generatedText: 'Hello world',
        success: true,
      };
      
      const chunk1 = { type: 'text-delta' as const, textDelta: 'Hello' };
      const chunk2 = { type: 'text-delta' as const, textDelta: ' world' };
      
      mockProcessStreamChunk
        .mockResolvedValueOnce(mockResult1)
        .mockResolvedValueOnce(mockResult2);
      
      const promise1 = queue.enqueue(chunk1, mockContext);
      const promise2 = queue.enqueue(chunk2, mockContext);
      
      await Promise.all([promise1, promise2]);
      
      // Both tasks should have been called with the initial context
      // The second task gets its context updated after the first task completes
      expect(mockProcessStreamChunk).toHaveBeenNthCalledWith(1, chunk1, mockContext);
      expect(mockProcessStreamChunk).toHaveBeenNthCalledWith(2, chunk2, expect.objectContaining({
        currentMessageOrder: 2,
        generatedText: 'Hello',
      }));
    });
*/
    it('should handle task processing errors gracefully', async () => {
      const error = new Error('Processing failed');
      mockProcessStreamChunk.mockRejectedValue(error);

      await expect(queue.enqueue(mockChunk, mockContext)).rejects.toThrow(
        'Processing failed',
      );

      expect(mockLog).toHaveBeenCalledWith(expect.any(Function));

      expect(queue.getQueueLength()).toBe(0);
      expect(queue.isProcessing()).toBe(false);
    });

    it('should continue processing remaining tasks after an error', async () => {
      const error = new Error('First task failed');
      const mockResult: any = {
        currentMessageOrder: 2,
        generatedText: 'Success',
        success: true,
      };

      const chunk1 = {
        type: 'text-delta' as const,
        delta: 'Fail',
        id: 'chunk-1',
      };
      const chunk2 = {
        type: 'text-delta' as const,
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
      const mockResult: any = {
        currentMessageOrder: 2,
        generatedText: 'Test',
        success: true,
      };

      mockProcessStreamChunk.mockResolvedValue(mockResult);

      // Enqueue multiple tasks
      const promise1 = queue.enqueue(mockChunk, mockContext);
      const promise2 = queue.enqueue(mockChunk, mockContext);
      const promise3 = queue.enqueue(mockChunk, mockContext);

      await Promise.all([promise1, promise2, promise3]);

      // Verify all tasks were processed (each should have unique ID)
      expect(mockProcessStreamChunk).toHaveBeenCalledTimes(3);
    });
  });

  describe('queue monitoring', () => {
    it('should track queue length correctly', async () => {
      const mockResult: any = {
        currentMessageOrder: 2,
        generatedText: 'Test',
        success: true,
      };

      // Use a slow mock to test queue length tracking
      mockProcessStreamChunk.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve(mockResult), 50)),
      );

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
      const mockResult: any = {
        currentMessageOrder: 2,
        generatedText: 'Test',
        success: true,
      };

      // Use a slow mock to test processing state
      mockProcessStreamChunk.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve(mockResult), 50)),
      );

      expect(queue.isProcessing()).toBe(false);

      const promise = queue.enqueue(mockChunk, mockContext);
      expect(queue.isProcessing()).toBe(true);

      await promise;
      expect(queue.isProcessing()).toBe(false);
    });

    it('should return current queue state', async () => {
      const mockResult: any = {
        currentMessageOrder: 2,
        generatedText: 'Test',
        success: true,
      };

      mockProcessStreamChunk.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve(mockResult), 50)),
      );

      const promise1 = queue.enqueue(mockChunk, mockContext);
      const promise2 = queue.enqueue(mockChunk, mockContext);

      expect(queue.getQueueLength()).toBe(2);
      expect(queue.isProcessing()).toBe(true);

      await Promise.all([promise1, promise2]);

      expect(queue.getQueueLength()).toBe(0);
      expect(queue.isProcessing()).toBe(false);
    });
  });
  /*
  describe('context propagation', () => {
    it('should update subsequent contexts with successful results', async () => {
      const mockResult1: StreamHandlerResult = {
        currentMessageOrder: 2,
        generatedText: 'Hello',
        success: true,
      };
      
      const mockResult2: StreamHandlerResult = {
        currentMessageOrder: 3,
        generatedText: 'Hello world',
        success: true,
      };
      
      const chunk1 = { type: 'text-delta' as const, textDelta: 'Hello' };
      const chunk2 = { type: 'text-delta' as const, textDelta: ' world' };
      
      mockProcessStreamChunk
        .mockResolvedValueOnce(mockResult1)
        .mockResolvedValueOnce(mockResult2);
      
      // Enqueue tasks with specific initial context
      const initialContext = {
        chatId: 'test-chat',
        turnId: 1,
        messageId: 42,
        currentMessageOrder: 1,
        generatedText: '',
      };
      
      await Promise.all([
        queue.enqueue(chunk1, initialContext),
        queue.enqueue(chunk2, initialContext),
      ]);
      
      // Verify context propagation
      expect(mockProcessStreamChunk).toHaveBeenNthCalledWith(1, chunk1, initialContext);
      expect(mockProcessStreamChunk).toHaveBeenNthCalledWith(2, chunk2, {
        ...initialContext,
        currentMessageOrder: 2,
        generatedText: 'Hello',
      });
    });

    it('should not update context for failed tasks', async () => {
      const error = new Error('First task failed');
      const mockResult: any = {
        currentMessageOrder: 2,
        generatedText: 'Success',
        success: true,
      };
      
      const chunk1 = { type: 'text-delta' as const, textDelta: 'Fail' };
      const chunk2 = { type: 'text-delta' as const, textDelta: 'Success' };
      
      mockProcessStreamChunk
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockResult);
      
      const initialContext = {
        chatId: 'test-chat',
        turnId: 1,
        messageId: 42,
        currentMessageOrder: 1,
        generatedText: '',
      };
      
      const promise1 = queue.enqueue(chunk1, initialContext);
      const promise2 = queue.enqueue(chunk2, initialContext);
      
      await expect(promise1).rejects.toThrow('First task failed');
      await promise2;
      
      // Verify second task uses original context (not updated from failed first task)
      expect(mockProcessStreamChunk).toHaveBeenNthCalledWith(2, chunk2, initialContext);
    });
  });
*/
  describe('edge cases', () => {
    it('should handle empty queue gracefully', () => {
      expect(queue.getQueueLength()).toBe(0);
      expect(queue.isProcessing()).toBe(false);
    });

    it('should handle rapid sequential enqueues', async () => {
      const mockResult: any = {
        currentMessageOrder: 2,
        generatedText: 'Test',
        success: true,
      };

      mockProcessStreamChunk.mockResolvedValue(mockResult);

      // Rapidly enqueue many tasks
      const promises = Array.from({ length: 10 }, (_, i) =>
        queue.enqueue(
          {
            type: 'text-delta' as const,
            delta: `chunk-${i}`,
            id: `chunk-${i}`,
          },
          { ...mockContext, currentMessageOrder: i },
        ),
      );

      expect(queue.getQueueLength()).toBe(10);
      expect(queue.isProcessing()).toBe(true);

      await Promise.all(promises);

      expect(queue.getQueueLength()).toBe(0);
      expect(queue.isProcessing()).toBe(false);
      expect(mockProcessStreamChunk).toHaveBeenCalledTimes(10);
    });

    it('should handle concurrent queue state queries', async () => {
      const mockResult: any = {
        currentMessageOrder: 2,
        generatedText: 'Test',
        success: true,
      };

      mockProcessStreamChunk.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve(mockResult), 100)),
      );

      const promise = queue.enqueue(mockChunk, mockContext);

      // Query state multiple times during processing
      expect(queue.getQueueLength()).toBe(1);
      expect(queue.isProcessing()).toBe(true);

      await promise;

      expect(queue.getQueueLength()).toBe(0);
      expect(queue.isProcessing()).toBe(false);
    });
  });
});
