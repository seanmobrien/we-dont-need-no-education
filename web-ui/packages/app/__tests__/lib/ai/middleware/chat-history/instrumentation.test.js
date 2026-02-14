import { describe, it, expect, jest, beforeEach } from '@jest/globals';
const mockSpan = {
    setAttributes: jest.fn(),
    setStatus: jest.fn(),
    recordException: jest.fn(),
    end: jest.fn(),
    spanContext: jest.fn(() => ({ traceId: 'trace123', spanId: 'span123' })),
};
const mockTracer = {
    startSpan: jest.fn(() => mockSpan),
    startActiveSpan: jest.fn((_name, fn2, _ctx, fn) => (fn ?? fn2)(mockSpan)),
};
const mockHistogram = {
    record: jest.fn(),
};
const mockCounter = {
    add: jest.fn(),
};
const mockUpDownCounter = {
    add: jest.fn(),
};
const mockMeter = {
    createHistogram: jest.fn(() => mockHistogram),
    createCounter: jest.fn(() => mockCounter),
    createUpDownCounter: jest.fn(() => mockUpDownCounter),
};
jest.mock('@opentelemetry/api', () => ({
    trace: {
        getTracer: jest.fn(() => mockTracer),
    },
    metrics: {
        getMeter: jest.fn(() => mockMeter),
    },
    SpanStatusCode: {
        OK: 1,
        ERROR: 2,
    },
    SpanKind: {
        INTERNAL: 1,
    },
}));
import { instrumentFlushOperation, instrumentStreamChunk, recordQueueOperation, createChatHistoryError, } from '@/lib/ai/middleware/chat-history/instrumentation';
import { getStackTrace } from '@/lib/nextjs-util/get-stack-trace';
import { isError } from '@compliance-theater/logger';
describe('Chat History Instrumentation', () => {
    beforeEach(() => {
    });
    describe('instrumentFlushOperation', () => {
        const mockFlushContext = {
            chatId: 'test-chat-123',
            turnId: 1,
            messageId: 42,
            generatedText: 'Test response text',
            startTime: Date.now() - 1000,
        };
        it('should instrument successful flush operation', async () => {
            const mockError = new Error('Operation threw');
            const mockResult = {
                success: false,
                processingTimeMs: 300,
                textLength: 10,
                error: mockError,
            };
            const mockOperation = jest.fn(() => Promise.resolve(mockResult));
            const result = await instrumentFlushOperation(mockFlushContext, mockOperation);
            expect(result).toEqual(mockResult);
            expect(mockTracer.startSpan).toHaveBeenCalledWith('chat_history.flush', {
                kind: expect.any(Number),
                attributes: {
                    'chat.id': 'test-chat-123',
                    'chat.turn_id': 1,
                    'chat.message_id': 42,
                    'chat.text_length': 18,
                    'operation.type': 'flush',
                },
            });
            expect(mockSpan.setAttributes).toHaveBeenCalled();
            expect(mockHistogram.record).toHaveBeenCalled();
            expect(mockCounter.add).toHaveBeenCalled();
            expect(mockSpan.end).toHaveBeenCalled();
        });
        it('should instrument failed flush operation', async () => {
            const mockError = {
                message: 'Flush failed',
                stack: getStackTrace(),
                name: 'FlushError',
                cause: { message: 'Strange and terrible forces' },
            };
            try {
                await instrumentFlushOperation(mockFlushContext, jest.fn(() => Promise.reject(mockError)));
            }
            catch (e) {
                expect(isError(e)).toBeTruthy();
                const err = e;
                expect(err.message).toEqual(mockError.message);
                expect(err.stack).toEqual(mockError.stack);
                expect(err.name).toEqual(mockError.name);
                expect(err.cause).toEqual(mockError.cause);
            }
            expect(mockSpan.recordException).toHaveBeenCalledWith(mockError);
            expect(mockSpan.setStatus).toHaveBeenCalledWith({
                code: 2,
                message: 'Flush failed',
            });
        });
        it('should handle operation exceptions', async () => {
            const mockError = new Error('Operation threw');
            const mockOperation = jest.fn(() => Promise.reject(mockError));
            await expect(instrumentFlushOperation(mockFlushContext, mockOperation)).rejects.toThrow('Operation threw');
            expect(mockSpan.recordException).toHaveBeenCalledWith(mockError);
            expect(mockSpan.setStatus).toHaveBeenCalledWith({
                code: 2,
                message: 'Operation threw',
            });
            expect(mockSpan.end).toHaveBeenCalled();
        });
    });
    describe('instrumentStreamChunk', () => {
        const mockContext = {
            chatId: 'test-chat-456',
            turnId: 2,
            messageId: 84,
        };
        it('should instrument failed stream chunk processing', async () => {
            const mockResult = {
                currentMessageOrder: 1,
                generatedText: 'Partial',
                success: false,
            };
            const mockOperation = jest.fn(() => Promise.resolve(mockResult));
            const result = await instrumentStreamChunk('tool-call', mockContext, mockOperation);
            expect(result).toEqual(mockResult);
            expect(mockCounter.add).toHaveBeenCalledWith(1, {
                operation: 'stream_chunk',
                error_type: 'processing_failure',
                chunk_type: 'tool-call',
            });
        });
    });
    describe('recordQueueOperation', () => {
        it('should record queue operation metrics', () => {
            recordQueueOperation('enqueue', true, 5);
            expect(mockCounter.add).toHaveBeenCalledWith(1, {
                operation: 'enqueue',
                success: 'true',
            });
            expect(mockUpDownCounter.add).toHaveBeenCalledWith(1, {
                operation: 'enqueue',
            });
        });
        it('should record queue operation without size', () => {
            recordQueueOperation('process', false);
            expect(mockCounter.add).toHaveBeenCalledWith(1, {
                operation: 'process',
                success: 'false',
            });
            expect(mockUpDownCounter.add).not.toHaveBeenCalled();
        });
    });
    describe('createChatHistoryError', () => {
        it('should create enhanced error with chat context', () => {
            const originalError = new Error('Original error');
            const context = {
                chatId: 'chat-789',
                turnId: 3,
                messageId: 126,
            };
            const error = createChatHistoryError('Enhanced error message', context, originalError);
            expect(error.message).toBe('Enhanced error message');
            expect(error.name).toBe('ChatHistoryError');
            expect(error.cause).toBe(originalError);
            expect(Object.hasOwnProperty.call(error, 'chatContext')).toBe(true);
            expect(error.chatContext).toEqual(context);
        });
        it('should create error without original error', () => {
            const context = {
                chatId: 'chat-999',
            };
            const error = createChatHistoryError('Standalone error', context);
            expect(error.message).toBe('Standalone error');
            expect(error.name).toBe('ChatHistoryError');
            expect(error.cause).toBeUndefined();
            expect(Object.hasOwnProperty.call(error, 'chatContext')).toBe(true);
            expect(error.chatContext).toEqual({
                chatId: 'chat-999',
                turnId: undefined,
                messageId: undefined,
            });
        });
    });
});
//# sourceMappingURL=instrumentation.test.js.map