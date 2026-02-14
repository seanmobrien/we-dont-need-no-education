jest.unmock('@opentelemetry/api');
jest.unmock('@opentelemetry/sdk-trace-base');
import { setupImpersonationMock } from '@/__tests__/jest.mock-impersonation';
setupImpersonationMock();
jest.mock('@/lib/ai/middleware/chat-history/utility', () => {
    const original = jest.requireActual('/lib/ai/middleware/chat-history/utility');
    return {
        ...original,
        getNextSequence: jest.fn().mockResolvedValue([1, 2, 3, 4]),
    };
});
import { hideConsoleOutput } from '@/__tests__/test-utils-server';
import { createChatHistoryMiddlewareEx } from '@/lib/ai/middleware/chat-history';
import { createUserChatHistoryContext } from '@/lib/ai/middleware/chat-history/create-chat-history-context';
jest.mock('@/lib/react-util', () => ({
    LoggedError: {
        isTurtlesAllTheWayDownBaby: jest.fn(),
    },
}));
jest.mock('@/lib/ai/core', () => ({
    generateChatId: jest.fn(() => ({ id: 'generated-chat-id' })),
}));
const mockConsole = hideConsoleOutput();
describe('Chat History Middleware Integration', () => {
    const mockContext = createUserChatHistoryContext({
        userId: 'test-user',
        chatId: 'test-chat',
        requestId: 'test-request',
        model: 'gpt-4o',
    });
    beforeEach(() => {
    });
    afterEach(() => {
        mockConsole.dispose();
    });
    describe('Middleware Structure', () => {
        it('should provide both wrapStream and wrapGenerate methods', () => {
            const middleware = createChatHistoryMiddlewareEx(mockContext);
            expect(middleware).toBeDefined();
            expect(middleware.wrapStream).toBeDefined();
            expect(middleware.wrapGenerate).toBeDefined();
            expect(middleware.transformParams).toBeDefined();
            expect(typeof middleware.wrapStream).toBe('function');
            expect(typeof middleware.wrapGenerate).toBe('function');
            expect(typeof middleware.transformParams).toBe('function');
        });
        it('should handle wrapGenerate method call', async () => {
            mockConsole.setup();
            try {
                const middleware = createChatHistoryMiddlewareEx(mockContext);
                const mockDoGenerate = jest.fn(() => Promise.resolve({
                    text: 'Test response',
                    finishReason: 'stop',
                    usage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 },
                    content: [{ type: 'text-delta', delta: 'Test response' }],
                }));
                const mockParams = {
                    prompt: [{ role: 'user', content: 'Hello' }],
                };
                const result = await middleware.wrapGenerate({
                    doGenerate: mockDoGenerate,
                    params: mockParams,
                });
                expect(result).toBeDefined();
                expect(result.content[0].delta).toBe('Test response');
                expect(mockDoGenerate).toHaveBeenCalled();
            }
            finally {
            }
        });
        it('should handle wrapStream method call', async () => {
            mockConsole.setup();
            try {
                const middleware = createChatHistoryMiddlewareEx(mockContext);
                const mockStream = {
                    [Symbol.asyncIterator]: async function* () {
                        yield { type: 'text-delta', delta: 'Hello' };
                        yield { type: 'finish', finishReason: 'stop' };
                    },
                    pipeThrough: jest.fn(function () {
                        return this;
                    }),
                };
                const mockDoStream = jest.fn(() => Promise.resolve({
                    stream: mockStream,
                    rawCall: { rawPrompt: 'test', rawSettings: {} },
                    rawResponse: { headers: {} },
                }));
                const mockParams = {
                    prompt: [{ role: 'user', content: 'Hello' }],
                };
                const result = await middleware.wrapStream({
                    doStream: mockDoStream,
                    params: mockParams,
                });
                expect(result).toBeDefined();
                expect(result.stream).toBeDefined();
                expect(mockDoStream).toHaveBeenCalled();
            }
            finally {
                mockConsole.dispose();
            }
        });
    });
    describe('Error Handling', () => {
        it('should gracefully handle database errors in wrapGenerate', async () => {
            mockConsole.setup();
            const mockDb = await import('@compliance-theater/database/orm');
            mockDb.drizDb.mockImplementationOnce(() => ({
                transaction: jest.fn(() => Promise.reject(new Error('DB Error'))),
            }));
            const middleware = createChatHistoryMiddlewareEx(mockContext);
            const mockDoGenerate = jest.fn(() => Promise.resolve({
                text: 'Response despite error',
                finishReason: 'stop',
                usage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 },
                content: [{ type: 'text-delta', delta: 'Response despite error' }],
            }));
            const mockParams = {
                prompt: [{ role: 'user', content: 'Test' }],
            };
            const result = await middleware.wrapGenerate({
                doGenerate: mockDoGenerate,
                params: mockParams,
            });
            expect(result.content[0].delta).toBe('Response despite error');
            expect(mockDoGenerate).toHaveBeenCalled();
        });
        it('should gracefully handle database errors in wrapStream', async () => {
            mockConsole.setup();
            const mockDb = require('@compliance-theater/database/orm');
            mockDb.drizDb.mockImplementationOnce(() => ({
                transaction: jest.fn(() => Promise.reject(new Error('DB Error'))),
            }));
            const middleware = createChatHistoryMiddlewareEx(mockContext);
            const mockStream = {
                [Symbol.asyncIterator]: async function* () {
                    yield { type: 'text-delta', delta: 'Recovery' };
                },
                pipeThrough: jest.fn(function () {
                    return this;
                }),
            };
            const mockDoStream = jest.fn(() => Promise.resolve({
                stream: mockStream,
                rawCall: { rawPrompt: 'test', rawSettings: {} },
                rawResponse: { headers: {} },
            }));
            const mockParams = {
                prompt: [{ role: 'user', content: 'Test' }],
            };
            const result = await middleware.wrapStream({
                doStream: mockDoStream,
                params: mockParams,
            });
            expect(result.stream).toBeDefined();
            expect(mockDoStream).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=middleware-integration.test.js.map