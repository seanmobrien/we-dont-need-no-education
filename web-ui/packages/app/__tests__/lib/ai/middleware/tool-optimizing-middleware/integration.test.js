import { setupImpersonationMock } from '@/__tests__/jest.mock-impersonation';
setupImpersonationMock();
import { createToolOptimizingMiddleware } from '@/lib/ai/middleware/tool-optimizing-middleware';
import { ToolMap } from '@/lib/ai/services/model-stats/tool-map';
import { optimizeMessagesWithToolSummarization } from '@/lib/ai/chat/message-optimizer-tools';
import { drizDbWithInit } from '@compliance-theater/database/orm';
jest.mock('@/lib/ai/services/model-stats/tool-map');
jest.mock('@/lib/ai/chat/message-optimizer-tools');
jest.mock('@compliance-theater/database');
jest.mock('@compliance-theater/logger');
jest.mock('@/lib/site-util/metrics', () => ({
    appMeters: {
        createCounter: jest.fn().mockReturnValue({ add: jest.fn() }),
        createHistogram: jest.fn().mockReturnValue({ record: jest.fn() }),
        createUpDownCounter: jest
            .fn()
            .mockReturnValue({ add: jest.fn(), record: jest.fn() }),
        createGauge: jest.fn().mockReturnValue({ record: jest.fn() }),
    },
    hashUserId: jest.fn((userId) => `hashed_${userId}`),
}));
jest.mock('@/lib/react-util', () => {
    const original = jest.requireActual('/lib/react-util');
    return {
        ...original,
        LoggedError: {
            isTurtlesAllTheWayDownBaby: jest.fn(),
        },
    };
});
const mockToolMap = ToolMap;
const mockOptimizeMessages = optimizeMessagesWithToolSummarization;
const mockDrizDb = drizDbWithInit;
describe('Tool Optimizing Middleware Integration Tests', () => {
    let mockToolMapInstance;
    let mockDb;
    beforeEach(() => {
        mockDb = {
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            values: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue([]),
        };
        mockDrizDb.mockResolvedValue(mockDb);
        mockToolMapInstance = {
            scanForTools: jest.fn().mockImplementation(async (tools) => {
                const toolArray = Array.isArray(tools) ? tools : [tools];
                return Math.floor(toolArray.length * 0.4);
            }),
            refresh: jest.fn().mockResolvedValue(true),
            getInstance: jest.fn(),
        };
        mockToolMap.getInstance.mockResolvedValue(mockToolMapInstance);
        mockOptimizeMessages.mockImplementation(async (messages, model, userId, chatId) => {
            const optimized = messages.slice(0, Math.ceil(messages.length * 0.7));
            return optimized;
        });
    });
    describe('Database Integration', () => {
        it('should work with database-backed ToolMap', async () => {
            const middleware = createToolOptimizingMiddleware({
                enableToolScanning: true,
                userId: 'db-user',
                chatHistoryId: 'db-chat',
            });
            const tools = [
                {
                    type: 'function',
                    name: 'database_tool',
                    description: 'Tool that integrates with database',
                    inputSchema: { type: 'object', properties: {} },
                },
            ];
            const result = await middleware.transformParams({
                type: 'generate',
                params: {
                    model: 'db-model',
                    tools,
                    messages: [],
                },
            });
            expect(mockToolMap.getInstance).toHaveBeenCalled();
            expect(mockToolMapInstance.scanForTools).toHaveBeenCalledWith(tools);
            expect(result.tools).toBe(tools);
        });
        it('should handle database connection errors gracefully', async () => {
            mockDrizDb.mockRejectedValue(new Error('Database connection failed'));
            const middleware = createToolOptimizingMiddleware({
                enableToolScanning: true,
            });
            const result = await middleware.transformParams({
                type: 'generate',
                params: {
                    model: 'error-model',
                    tools: [{ type: 'function', name: 'test_tool', inputSchema: {} }],
                    messages: [],
                },
            });
            expect(result).toBeDefined();
        });
        it('should handle database transaction scenarios', async () => {
            const mockTransaction = {
                rollback: jest.fn(),
                commit: jest.fn(),
            };
            mockDb.transaction = jest.fn().mockImplementation(async (callback) => {
                return callback(mockTransaction);
            });
            const middleware = createToolOptimizingMiddleware({
                enableToolScanning: true,
                enableMessageOptimization: true,
                optimizationThreshold: 5,
            });
            const messages = Array.from({ length: 10 }, (_, i) => ({
                id: `tx-msg-${i}`,
                role: i % 2 === 0 ? 'user' : 'assistant',
                parts: [{ type: 'text', text: `Transaction message ${i}` }],
            }));
            const result = await middleware.transformParams({
                type: 'generate',
                params: {
                    model: 'tx-model',
                    messages,
                    tools: [{ type: 'function', name: 'tx_tool', inputSchema: {} }],
                },
            });
            expect(result).toBeDefined();
        });
    });
    describe('Middleware Stack Integration', () => {
        const createMockMiddleware = (name) => ({
            transformParams: jest.fn(async ({ type, params }) => {
                const updatedParams = {
                    ...params,
                    __testMiddlewareStack: [
                        ...(params.__testMiddlewareStack || []),
                        name,
                    ],
                };
                return updatedParams;
            }),
        });
        it('should work correctly in middleware stack', async () => {
            const preMiddleware = createMockMiddleware('pre');
            const toolOptimizer = createToolOptimizingMiddleware({
                enableToolScanning: true,
                enableMessageOptimization: true,
                optimizationThreshold: 5,
            });
            const postMiddleware = createMockMiddleware('post');
            const messages = Array.from({ length: 10 }, (_, i) => ({
                id: `stack-msg-${i}`,
                role: i % 2 === 0 ? 'user' : 'assistant',
                parts: [{ type: 'text', text: `Stack message ${i}` }],
            }));
            const params = {
                model: 'stack-model',
                messages,
                tools: [{ type: 'function', name: 'stack_tool', inputSchema: {} }],
                __testMiddlewareStack: [],
            };
            let result = await preMiddleware.transformParams({
                type: 'generate',
                params,
                model: 'stack-model',
            });
            result = await toolOptimizer.transformParams({
                type: 'generate',
                params: result,
                model: 'stack-model',
            });
            result = await postMiddleware.transformParams({
                type: 'generate',
                params: result,
                model: 'stack-model',
            });
            expect(result.__testMiddlewareStack).toEqual(['pre', 'post']);
            expect(mockToolMapInstance.scanForTools).toHaveBeenCalled();
            expect(mockOptimizeMessages).toHaveBeenCalled();
            expect(Array.isArray(result.messages)).toBe(true);
            if (result.messages) {
                expect(result.messages.length).toBeLessThan(messages.length);
            }
        });
        it('should preserve middleware execution order with errors', async () => {
            const errorMiddleware = {
                transformParams: jest
                    .fn()
                    .mockRejectedValue(new Error('Middleware error')),
            };
            const toolOptimizer = createToolOptimizingMiddleware({
                enableToolScanning: true,
            });
            const recoverMiddleware = {
                transformParams: jest.fn(async ({ type, params }) => {
                    return { ...params, recovered: true };
                }),
            };
            const params = {
                model: 'error-model',
                tools: [{ type: 'function', name: 'error_tool', inputSchema: {} }],
                messages: [],
            };
            const result = await toolOptimizer.transformParams({
                type: 'generate',
                params,
            });
            expect(result).toBeDefined();
            expect(mockToolMapInstance.scanForTools).toHaveBeenCalled();
        });
    });
    describe('Real-world Scenario Integration', () => {
        it('should handle chat application scenario', async () => {
            const chatScenario = {
                userId: 'chat-user-123',
                chatId: 'chat-session-456',
                conversationHistory: Array.from({ length: 25 }, (_, i) => ({
                    id: `chat-msg-${i}`,
                    role: i === 0 ? 'system' : i % 2 === 1 ? 'user' : 'assistant',
                    parts: [
                        {
                            type: 'text',
                            text: i === 0
                                ? 'You are a helpful assistant.'
                                : `Chat message ${i} in ongoing conversation`,
                        },
                    ],
                })),
                availableTools: [
                    {
                        type: 'function',
                        name: 'search_knowledge',
                        description: 'Search the knowledge base',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                query: { type: 'string' },
                                filters: { type: 'object' },
                            },
                            required: ['query'],
                        },
                    },
                    {
                        type: 'function',
                        name: 'generate_summary',
                        description: 'Generate a summary',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                content: { type: 'string' },
                                maxLength: { type: 'number' },
                            },
                            required: ['content'],
                        },
                    },
                ],
            };
            const middleware = createToolOptimizingMiddleware({
                userId: chatScenario.userId,
                chatHistoryId: chatScenario.chatId,
                enableToolScanning: true,
                enableMessageOptimization: true,
                optimizationThreshold: 15,
            });
            const result = await middleware.transformParams({
                type: 'generate',
                params: {
                    messages: chatScenario.conversationHistory,
                    tools: chatScenario.availableTools,
                },
                model: 'chat-model',
            });
            expect(result.messages).toBeDefined();
            expect(result.tools).toBe(chatScenario.availableTools);
            expect(mockToolMapInstance.scanForTools).toHaveBeenCalledWith(chatScenario.availableTools);
            expect(mockOptimizeMessages).toHaveBeenCalledWith(chatScenario.conversationHistory, 'chat-model', chatScenario.userId, chatScenario.chatId);
            expect(Array.isArray(result.messages)).toBe(true);
            if (result.messages) {
                expect(result.messages.length).toBeLessThan(chatScenario.conversationHistory.length);
            }
        });
        it('should handle enterprise workflow scenario', async () => {
            const enterpriseScenario = {
                workflow: 'document-analysis',
                tools: Array.from({ length: 15 }, (_, i) => ({
                    type: 'function',
                    name: `enterprise_tool_${i}`,
                    description: `Enterprise tool ${i} for document processing`,
                    inputSchema: {
                        type: 'object',
                        properties: {
                            documentId: { type: 'string' },
                            analysisType: {
                                type: 'string',
                                enum: ['content', 'structure', 'metadata'],
                            },
                            options: {
                                type: 'object',
                                properties: {
                                    includeImages: { type: 'boolean' },
                                    language: { type: 'string' },
                                    outputFormat: {
                                        type: 'string',
                                        enum: ['json', 'xml', 'text'],
                                    },
                                },
                            },
                        },
                        required: ['documentId', 'analysisType'],
                    },
                })),
                history: Array.from({ length: 100 }, (_, i) => ({
                    id: `enterprise-msg-${i}`,
                    role: i % 4 === 0 ? 'system' : i % 3 === 0 ? 'user' : 'assistant',
                    parts: [
                        {
                            type: 'text',
                            text: `Enterprise workflow message ${i} with document analysis context`,
                        },
                    ],
                })),
            };
            const middleware = createToolOptimizingMiddleware({
                userId: 'enterprise-user',
                chatHistoryId: 'enterprise-workflow',
                enableToolScanning: true,
                enableMessageOptimization: true,
                optimizationThreshold: 50,
            });
            const result = await middleware.transformParams({
                type: 'generate',
                params: {
                    messages: enterpriseScenario.history,
                    tools: enterpriseScenario.tools,
                },
                model: 'enterprise-model',
            });
            expect(mockToolMapInstance.scanForTools).toHaveBeenCalledWith(enterpriseScenario.tools);
            expect(mockOptimizeMessages).toHaveBeenCalledWith(enterpriseScenario.history, 'enterprise-model', 'enterprise-user', 'enterprise-workflow');
            expect(result.messages).toBeDefined();
            expect(result.tools).toBe(enterpriseScenario.tools);
            expect(Array.isArray(result.messages)).toBe(true);
            if (result.messages) {
                expect(result.messages.length).toBeLessThan(enterpriseScenario.history.length);
            }
        });
        it('should handle streaming scenario', async () => {
            const middleware = createToolOptimizingMiddleware({
                enableToolScanning: true,
                enableMessageOptimization: false,
            });
            const streamingParams = {
                model: 'streaming-model',
                messages: [
                    {
                        id: 'stream-1',
                        role: 'user',
                        parts: [{ type: 'text', text: 'Start streaming' }],
                    },
                ],
                tools: [
                    {
                        type: 'function',
                        name: 'stream_tool',
                        description: 'Tool for streaming scenario',
                        inputSchema: { type: 'object', properties: {} },
                    },
                ],
                stream: true,
            };
            const result = await middleware.transformParams({
                type: 'stream',
                params: streamingParams,
            });
            expect(mockToolMapInstance.scanForTools).toHaveBeenCalled();
            expect(mockOptimizeMessages).not.toHaveBeenCalled();
            expect(result.messages).toBe(streamingParams.messages);
            expect(result.tools).toBe(streamingParams.tools);
        });
    });
    describe('Cross-component Integration', () => {
        it('should integrate with chat history middleware', async () => {
            const chatHistoryParams = {
                model: 'integration-model',
                messages: [
                    {
                        id: 'history-1',
                        role: 'user',
                        parts: [{ type: 'text', text: 'Previous context' }],
                    },
                ],
                tools: [
                    {
                        type: 'function',
                        name: 'history_tool',
                        description: 'Tool from chat history',
                        inputSchema: { type: 'object', properties: {} },
                    },
                ],
                chatHistory: { enabled: true, userId: 'history-user' },
            };
            const middleware = createToolOptimizingMiddleware({
                userId: 'history-user',
                chatHistoryId: 'history-chat',
                enableToolScanning: true,
            });
            const result = await middleware.transformParams({
                type: 'generate',
                params: chatHistoryParams,
            });
            expect(result.chatHistory).toEqual({
                enabled: true,
                userId: 'history-user',
            });
            expect(mockToolMapInstance.scanForTools).toHaveBeenCalled();
        });
        it('should integrate with rate limiting middleware', async () => {
            const rateLimitedParams = {
                model: 'rate-limited-model',
                messages: [],
                tools: [{ type: 'function', name: 'rate_tool', inputSchema: {} }],
                rateLimitInfo: { provider: 'azure', requestsRemaining: 100 },
            };
            const middleware = createToolOptimizingMiddleware({
                enableToolScanning: true,
            });
            const result = await middleware.transformParams({
                type: 'generate',
                params: rateLimitedParams,
            });
            expect(result.rateLimitInfo).toEqual({
                provider: 'azure',
                requestsRemaining: 100,
            });
            expect(mockToolMapInstance.scanForTools).toHaveBeenCalled();
        });
        it('should preserve telemetry and monitoring context', async () => {
            const telemetryParams = {
                model: 'telemetry-model',
                messages: [],
                tools: [{ type: 'function', name: 'telemetry_tool', inputSchema: {} }],
                telemetry: {
                    traceId: 'trace-123',
                    spanId: 'span-456',
                    correlationId: 'corr-789',
                },
            };
            const middleware = createToolOptimizingMiddleware({
                enableToolScanning: true,
                userId: 'telemetry-user',
            });
            const result = await middleware.transformParams({
                type: 'generate',
                params: telemetryParams,
            });
            expect(result.telemetry).toEqual({
                traceId: 'trace-123',
                spanId: 'span-456',
                correlationId: 'corr-789',
            });
        });
    });
});
//# sourceMappingURL=integration.test.js.map