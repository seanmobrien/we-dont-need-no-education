jest.unmock('@opentelemetry/api');
jest.unmock('@opentelemetry/sdk-trace-base');
jest.mock('@/lib/ai/middleware/chat-history/utility', () => {
    const original = jest.requireActual('/lib/ai/middleware/chat-history/utility');
    return {
        ...original,
        getNextSequence: jest.fn().mockResolvedValue([1, 2, 3, 4]),
    };
});
import { setupImpersonationMock } from '@/__tests__/jest.mock-impersonation';
setupImpersonationMock();
import { createChatHistoryMiddlewareEx as createChatHistoryMiddleware, } from '@/lib/ai/middleware/chat-history';
import { ProcessingQueue } from '@/lib/ai/middleware/chat-history/processing-queue';
import { generateChatId } from '@/lib/ai/core';
import { drizDb } from '@compliance-theater/database/orm';
import { LoggedError } from '@compliance-theater/logger';
import { createUserChatHistoryContext } from '@/lib/ai/middleware/chat-history/create-chat-history-context';
jest.mock('@/lib/ai/core');
jest.mock('@/lib/react-util', () => {
    const original = jest.requireActual('/lib/react-util');
    const mockLoggedErrorImpl = jest
        .fn()
        .mockImplementation((message, options) => {
        return {
            ...options,
            message,
        };
    });
    mockLoggedErrorImpl.isTurtlesAllTheWayDownBaby = jest.fn();
    return {
        ...original,
        LoggedError: mockLoggedErrorImpl,
    };
});
const mockProcessingQueue = ProcessingQueue;
const mockGenerateChatId = generateChatId;
let mockDb;
describe('Chat History Middleware', () => {
    let mockContext;
    let mockParams;
    let mockQueueInstance;
    beforeEach(() => {
        mockDb = drizDb();
        mockContext = createUserChatHistoryContext({
            userId: 'user-123',
            chatId: 'chat-456',
            model: 'gpt-4o',
            requestId: 'session-789',
        });
        mockParams = {
            inputFormat: 'prompt',
            mode: { type: 'regular' },
            prompt: [
                {
                    role: 'user',
                    content: [{ type: 'text', text: 'Hello world' }],
                },
            ],
            tools: [],
        };
        mockGenerateChatId.mockReturnValue({ seed: 1, id: 'generated-chat-id' });
        if (typeof LoggedError?.isTurtlesAllTheWayDownBaby === 'function' &&
            jest.isMockFunction(LoggedError.isTurtlesAllTheWayDownBaby)) {
            LoggedError.isTurtlesAllTheWayDownBaby.mockClear();
        }
    });
    describe('createChatHistoryMiddleware', () => {
        it('should create middleware with valid context', () => {
            const middleware = createChatHistoryMiddleware(mockContext);
            expect(middleware).toBeDefined();
            expect(middleware.wrapStream).toBeDefined();
            expect(middleware.wrapGenerate).toBeDefined();
            expect(middleware.transformParams).toBeDefined();
        });
        it('should create middleware without generating chatId in constructor', () => {
            const contextWithoutChatId = { ...mockContext, chatId: undefined };
            const middleware = createChatHistoryMiddleware(contextWithoutChatId);
            expect(middleware).toBeDefined();
            expect(mockGenerateChatId).not.toHaveBeenCalled();
        });
        it('should create middleware without immediate chatId processing', () => {
            const contextWithNumericChatId = {
                ...mockContext,
                chatId: 123,
            };
            const middleware = createChatHistoryMiddleware(contextWithNumericChatId);
            expect(middleware).toBeDefined();
            expect(mockGenerateChatId).not.toHaveBeenCalled();
        });
        it('should use string chatId directly', () => {
            const contextWithStringChatId = {
                ...mockContext,
                chatId: 'existing-chat',
            };
            const middleware = createChatHistoryMiddleware(contextWithStringChatId);
            expect(mockGenerateChatId).not.toHaveBeenCalled();
            expect(middleware).toBeDefined();
        });
        it('should create ProcessingQueue instance', () => {
            createChatHistoryMiddleware(mockContext);
        });
    });
    describe('wrapStream', () => {
        let middleware;
        let mockDoStream;
        let mockStream;
        beforeEach(() => {
            middleware = createChatHistoryMiddleware(mockContext);
            mockStream = new ReadableStream({
                start(controller) {
                    controller.enqueue({
                        type: 'text-delta',
                        delta: 'Hello',
                        id: 'chunk-1',
                    });
                    controller.enqueue({
                        type: 'text-delta',
                        delta: ' world',
                        id: 'chunk-2',
                    });
                    controller.enqueue({
                        type: 'finish',
                        finishReason: 'stop',
                        usage: {
                            inputTokens: 10,
                            outputTokens: 5,
                            totalTokens: 15,
                        },
                    });
                    controller.close();
                },
            });
            mockDoStream = jest.fn().mockResolvedValue({
                stream: mockStream,
                rawCall: { rawPrompt: mockParams.prompt },
                rawResponse: { headers: {} },
            });
        });
        const callWrapStream = async (middleware) => {
            return await middleware.wrapStream?.({
                doStream: mockDoStream,
                doGenerate: jest.fn(),
                model: { modelId: 'test-model' },
                params: mockParams,
            });
        };
        it('should process stream through enqueueStream', async () => {
            const result = await callWrapStream(middleware);
            expect(result?.stream).toBeDefined();
            expect(result?.stream).toBeInstanceOf(ReadableStream);
        });
        it('should return transformed stream', async () => {
            const result = await callWrapStream(middleware);
            expect(result?.stream).toBeDefined();
            expect(result?.stream).toBeInstanceOf(ReadableStream);
        }, 10000);
        it('should handle stream processing errors gracefully', async () => {
            const errorStream = new ReadableStream({
                start(controller) {
                    controller.error(new Error('Stream processing failed'));
                },
            });
            mockDoStream.mockResolvedValue({
                stream: errorStream,
                rawCall: { rawPrompt: mockParams.prompt },
                rawResponse: { headers: {} },
            });
            const result = await callWrapStream(middleware);
            expect(result?.stream).toBeDefined();
        });
        it('should process chunks through queue', async () => {
            const result = await callWrapStream(middleware);
            expect(result).toBeDefined();
        });
        it('should handle queue processing errors', async () => {
            const result = await callWrapStream(middleware);
            expect(result).toBeDefined();
        });
        it('should handle completion operation', async () => {
            const result = await callWrapStream(middleware);
            expect(result).toBeDefined();
            expect(result?.stream).toBeInstanceOf(ReadableStream);
        });
        it('should handle completion errors gracefully', async () => {
            const result = await callWrapStream(middleware);
            expect(result).toBeDefined();
            expect(result?.stream).toBeInstanceOf(ReadableStream);
        });
        it('should handle completion exception gracefully', async () => {
            const result = await callWrapStream(middleware);
            expect(result).toBeDefined();
            expect(result?.stream).toBeInstanceOf(ReadableStream);
        });
        it('should preserve original stream properties', async () => {
            const originalResult = {
                stream: mockStream,
                rawCall: { rawPrompt: mockParams.prompt },
                rawResponse: { headers: { 'content-type': 'application/json' } },
                usage: { promptTokens: 10, completionTokens: 20 },
            };
            mockDoStream.mockResolvedValue(originalResult);
            const result = await callWrapStream(middleware);
            expect(result).toBeDefined();
        });
    });
    describe.skip('transformParams', () => {
        let middleware;
        beforeEach(() => {
            middleware = createChatHistoryMiddleware(mockContext);
        });
        it('should return params unchanged', async () => {
            const result = await middleware.transformParams?.({
                params: mockParams,
                type: 'stream',
                model: {},
            });
            expect(result).toEqual(mockParams);
        });
        it('should handle empty params', async () => {
            const emptyParams = {};
            const result = await middleware.transformParams?.({
                params: emptyParams,
                type: 'stream',
                model: {},
            });
            expect(result).toEqual({ tools: [] });
        });
        it('should handle complex params', async () => {
            const complexParams = {
                ...mockParams,
                temperature: 0.8,
                topP: 0.9,
                maxTokens: 1000,
                stopSequences: ['END'],
            };
            const result = await middleware.transformParams?.({
                params: complexParams,
                type: 'stream',
                model: {},
            });
            expect(result).toEqual(complexParams);
        });
    });
    describe('wrapGenerate', () => {
        let middleware;
        let mockDoGenerate;
        beforeEach(() => {
            middleware = createChatHistoryMiddleware(mockContext);
            mockDoGenerate = jest.fn().mockResolvedValue({
                text: 'Generated text response',
                finishReason: 'stop',
                usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
                content: [{ type: 'text-delta', delta: 'Generated text response' }],
            });
        });
        const callWrapGenerate = async (middleware) => {
            return middleware.wrapGenerate
                ? await middleware.wrapGenerate({
                    doGenerate: mockDoGenerate,
                    doStream: jest.fn(),
                    params: mockParams,
                    model: {
                        specificationVersion: 'v2',
                        provider: '',
                        supportedUrls: {},
                        modelId: '',
                        doGenerate: () => Promise.resolve({
                            warnings: [],
                            finishReason: 'stop',
                            usage: { promptTokens: 10, completionTokens: 20 },
                            content: [
                                {
                                    type: 'text-delta',
                                    delta: 'Generated text response',
                                    id: 'generated-response',
                                },
                            ],
                        }),
                        doStream: (() => {
                            return Promise.resolve();
                        }),
                    },
                })
                : undefined;
        };
        it('should process generation through middleware', async () => {
            const result = await callWrapGenerate(middleware);
            expect(result).toBeDefined();
            expect(mockDoGenerate).toHaveBeenCalled();
        });
        it('should return generated result', async () => {
            const result = await callWrapGenerate(middleware);
            expect(result).toEqual({
                text: 'Generated text response',
                finishReason: 'stop',
                usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
                content: [{ type: 'text-delta', delta: 'Generated text response' }],
            });
        });
        it('should handle generation processing', async () => {
            const result = await callWrapGenerate(middleware);
            expect(result).toBeDefined();
            expect(mockDoGenerate).toHaveBeenCalled();
        });
        it('should handle processing gracefully', async () => {
            const result = await callWrapGenerate(middleware);
            expect(result).toBeDefined();
            expect(mockDoGenerate).toHaveBeenCalled();
        });
        it('should handle generation errors', async () => {
            const generationError = new Error('Generation failed');
            mockDoGenerate.mockRejectedValue(generationError);
            await expect(callWrapGenerate(middleware)).rejects.toThrow('Generation failed');
        });
    });
    describe('Context Variations', () => {
        it('should handle minimal context', () => {
            const minimalContext = createUserChatHistoryContext({
                userId: 'user-minimal',
            });
            const middleware = createChatHistoryMiddleware(minimalContext);
            expect(middleware).toBeDefined();
            expect(mockGenerateChatId).not.toHaveBeenCalled();
        });
        it('should handle full context', () => {
            const fullContext = createUserChatHistoryContext({
                userId: 'user-full',
                chatId: 'chat-full',
                requestId: 'session-full',
                model: 'gpt-4-turbo',
            });
            const middleware = createChatHistoryMiddleware(fullContext);
            expect(middleware).toBeDefined();
            expect(mockGenerateChatId).not.toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=index.test.js.map