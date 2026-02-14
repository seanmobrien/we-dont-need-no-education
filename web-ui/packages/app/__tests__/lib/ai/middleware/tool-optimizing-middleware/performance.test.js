import { setupImpersonationMock } from '@/__tests__/jest.mock-impersonation';
setupImpersonationMock();
import { createToolOptimizingMiddleware, } from '@/lib/ai/middleware/tool-optimizing-middleware';
import { ToolMap } from '@/lib/ai/services/model-stats/tool-map';
import { optimizeMessagesWithToolSummarization } from '@/lib/ai/chat/message-optimizer-tools';
import { hideConsoleOutput } from '@/__tests__/test-utils-server';
jest.mock('@/lib/ai/services/model-stats/tool-map');
jest.mock('@/lib/ai/chat/message-optimizer-tools');
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
describe('Tool Optimizing Middleware Performance Tests', () => {
    let mockToolMapInstance;
    beforeEach(() => {
        mockToolMapInstance = {
            scanForTools: jest.fn().mockImplementation(async (tools) => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                return Array.isArray(tools) ? tools.length : 1;
            }),
        };
        mockToolMap.getInstance.mockResolvedValue(mockToolMapInstance);
        mockOptimizeMessages.mockImplementation(async (messages) => {
            const processingTime = Math.min(messages.length * 2, 100);
            await new Promise((resolve) => setTimeout(resolve, processingTime));
            return messages.slice(0, Math.ceil(messages.length * 0.7));
        });
    });
    describe('Large Message History Performance', () => {
        const createLargeMessageHistory = (count) => {
            return Array.from({ length: count }, (_, i) => ({
                id: `msg-${i}`,
                role: i % 2 === 0 ? 'user' : 'assistant',
                parts: [
                    {
                        type: 'text',
                        text: `Message ${i} with content that is longer than usual to simulate realistic message sizes and test performance with larger payloads`,
                    },
                ],
            }));
        };
        it('should handle 100 messages efficiently', async () => {
            const messages = createLargeMessageHistory(100);
            const middleware = createToolOptimizingMiddleware({
                enableMessageOptimization: true,
                optimizationThreshold: 50,
            });
            const startTime = Date.now();
            const result = await middleware.transformParams({
                type: 'generate',
                params: {
                    model: 'test-model',
                    messages,
                },
            });
            const processingTime = Date.now() - startTime;
            expect(processingTime).toBeLessThan(1000);
            expect(result.messages).toBeDefined();
            expect(Array.isArray(result.messages)).toBe(true);
        }, 10000);
        it('should handle 500 messages efficiently', async () => {
            const messages = createLargeMessageHistory(500);
            const middleware = createToolOptimizingMiddleware({
                enableMessageOptimization: true,
                optimizationThreshold: 100,
            });
            const startTime = Date.now();
            const result = await middleware.transformParams({
                type: 'generate',
                params: {
                    model: 'test-model',
                    messages,
                },
            });
            const processingTime = Date.now() - startTime;
            expect(processingTime).toBeLessThan(5000);
            expect(result.messages).toBeDefined();
            expect(result.messages?.length).toBeLessThan(messages.length);
        }, 15000);
        it('should skip optimization for extremely large histories when disabled', async () => {
            const messages = createLargeMessageHistory(1000);
            const middleware = createToolOptimizingMiddleware({
                enableMessageOptimization: false,
            });
            const startTime = Date.now();
            const result = await middleware.transformParams({
                type: 'generate',
                params: {
                    model: 'test-model',
                    messages,
                },
            });
            const processingTime = Date.now() - startTime;
            expect(processingTime).toBeLessThan(100);
            expect(result.messages).toBe(messages);
            expect(mockOptimizeMessages).not.toHaveBeenCalled();
        });
    });
    describe('Large Tool Set Performance', () => {
        const createLargeToolSet = (count) => {
            return Array.from({ length: count }, (_, i) => ({
                type: 'function',
                name: `tool_${i}`,
                description: `Tool ${i} for testing performance with large tool sets and complex schemas`,
                inputSchema: {
                    type: 'object',
                    properties: {
                        param1: { type: 'string', description: 'First parameter' },
                        param2: { type: 'number', description: 'Second parameter' },
                        param3: {
                            type: 'object',
                            properties: {
                                nested1: { type: 'string' },
                                nested2: { type: 'array', items: { type: 'string' } },
                            },
                        },
                    },
                    required: ['param1', 'param2'],
                },
            }));
        };
        it('should handle 50 tools efficiently', async () => {
            const tools = createLargeToolSet(50);
            const middleware = createToolOptimizingMiddleware({
                enableToolScanning: true,
            });
            const startTime = Date.now();
            const result = await middleware.transformParams({
                type: 'generate',
                params: {
                    model: 'test-model',
                    tools,
                    messages: [],
                },
            });
            const processingTime = Date.now() - startTime;
            expect(processingTime).toBeLessThan(500);
            expect(mockToolMapInstance.scanForTools).toHaveBeenCalledWith(tools);
            expect(result.tools).toBe(tools);
        });
        it('should handle 200 tools efficiently', async () => {
            const tools = createLargeToolSet(200);
            const middleware = createToolOptimizingMiddleware({
                enableToolScanning: true,
            });
            const startTime = Date.now();
            const result = await middleware.transformParams({
                type: 'generate',
                params: {
                    model: 'test-model',
                    tools,
                    messages: [],
                },
            });
            const processingTime = Date.now() - startTime;
            expect(processingTime).toBeLessThan(2000);
            expect(mockToolMapInstance.scanForTools).toHaveBeenCalledWith(tools);
            expect(result.tools).toBe(tools);
        }, 10000);
        it('should skip tool scanning for large sets when disabled', async () => {
            const tools = createLargeToolSet(500);
            const middleware = createToolOptimizingMiddleware({
                enableToolScanning: false,
            });
            const startTime = Date.now();
            const result = await middleware.transformParams({
                type: 'generate',
                params: {
                    model: 'test-model',
                    tools,
                    messages: [],
                },
            });
            const processingTime = Date.now() - startTime;
            expect(processingTime).toBeLessThan(50);
            expect(mockToolMapInstance.scanForTools).not.toHaveBeenCalled();
            expect(result.tools).toBe(tools);
        });
    });
    describe('Concurrent Operations Performance', () => {
        it('should handle multiple concurrent middleware instances', async () => {
            const concurrency = 10;
            const messages = Array.from({ length: 50 }, (_, i) => ({
                id: `msg-${i}`,
                role: i % 2 === 0 ? 'user' : 'assistant',
                parts: [{ type: 'text', text: `Concurrent message ${i}` }],
            }));
            const middlewares = Array.from({ length: concurrency }, (_, i) => createToolOptimizingMiddleware({
                userId: `user-${i}`,
                chatHistoryId: `chat-${i}`,
                enableMessageOptimization: true,
                optimizationThreshold: 25,
            }));
            const startTime = Date.now();
            const promises = middlewares.map((middleware, i) => middleware.transformParams({
                type: 'generate',
                params: {
                    model: `model-${i}`,
                    messages,
                },
            }));
            const results = await Promise.all(promises);
            const processingTime = Date.now() - startTime;
            expect(processingTime).toBeLessThan(3000);
            expect(results).toHaveLength(concurrency);
            results.forEach((result) => {
                expect(result.messages).toBeDefined();
                expect(Array.isArray(result.messages)).toBe(true);
            });
        }, 15000);
        it('should handle concurrent tool scanning and message optimization', async () => {
            const tools = Array.from({ length: 25 }, (_, i) => ({
                type: 'function',
                name: `concurrent_tool_${i}`,
                description: `Concurrent tool ${i}`,
                inputSchema: { type: 'object', properties: {} },
            }));
            const messages = Array.from({ length: 30 }, (_, i) => ({
                id: `msg-${i}`,
                role: i % 2 === 0 ? 'user' : 'assistant',
                parts: [{ type: 'text', text: `Concurrent message ${i}` }],
            }));
            const middleware = createToolOptimizingMiddleware({
                enableToolScanning: true,
                enableMessageOptimization: true,
                optimizationThreshold: 20,
            });
            const startTime = Date.now();
            const result = await middleware.transformParams({
                type: 'generate',
                params: {
                    messages,
                    tools,
                },
                model: 'concurrent-model',
            });
            const processingTime = Date.now() - startTime;
            expect(processingTime).toBeLessThan(1000);
            expect(mockToolMapInstance.scanForTools).toHaveBeenCalledWith(tools);
            expect(mockOptimizeMessages).toHaveBeenCalledWith(messages, 'concurrent-model', undefined, undefined);
            expect(result.messages).toBeDefined();
            expect(result.tools).toBe(tools);
        });
    });
    describe('Memory Usage Performance', () => {
        it('should not leak memory with repeated operations', async () => {
            const middleware = createToolOptimizingMiddleware({
                enableToolScanning: true,
                enableMessageOptimization: true,
                optimizationThreshold: 10,
            });
            const iterations = 50;
            const messages = Array.from({ length: 20 }, (_, i) => ({
                id: `msg-${i}`,
                role: i % 2 === 0 ? 'user' : 'assistant',
                parts: [{ type: 'text', text: `Memory test message ${i}` }],
            }));
            const tools = Array.from({ length: 5 }, (_, i) => ({
                type: 'function',
                name: `memory_tool_${i}`,
                description: `Memory test tool ${i}`,
                inputSchema: { type: 'object', properties: {} },
            }));
            if (global.gc) {
                global.gc();
            }
            const initialMemory = process.memoryUsage().heapUsed;
            for (let i = 0; i < iterations; i++) {
                await middleware.transformParams({
                    type: 'generate',
                    params: {
                        model: `model-${i}`,
                        messages,
                        tools,
                    },
                });
            }
            const finalMemory = process.memoryUsage().heapUsed;
            if (global.gc) {
                global.gc();
            }
            const memoryGrowth = finalMemory - initialMemory;
            expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
        }, 30000);
        it('should handle garbage collection efficiently', async () => {
            const middleware = createToolOptimizingMiddleware({
                enableMessageOptimization: true,
                optimizationThreshold: 10,
            });
            if (global.gc) {
                global.gc();
            }
            const initialMemory = process.memoryUsage().heapUsed;
            const largeMessages = Array.from({ length: 200 }, (_, i) => ({
                id: `large-msg-${i}`,
                role: i % 2 === 0 ? 'user' : 'assistant',
                parts: [
                    {
                        type: 'text',
                        text: `Large message ${i} with substantial content for memory testing: ${'x'.repeat(100)}`,
                    },
                ],
            }));
            await middleware.transformParams({
                type: 'generate',
                params: {
                    model: 'large-model',
                    messages: largeMessages,
                },
            });
            if (global.gc) {
                global.gc();
            }
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryGrowth = finalMemory - initialMemory;
            expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
        }, 15000);
    });
    describe('Error Performance', () => {
        it('should handle errors efficiently without significant performance impact', async () => {
            hideConsoleOutput().setup();
            mockToolMapInstance.scanForTools.mockRejectedValue(new Error('Scanning error'));
            mockOptimizeMessages.mockRejectedValue(new Error('Optimization error'));
            const middleware = createToolOptimizingMiddleware({
                enableToolScanning: true,
                enableMessageOptimization: true,
                optimizationThreshold: 10,
            });
            const messages = Array.from({ length: 20 }, (_, i) => ({
                id: `error-msg-${i}`,
                role: i % 2 === 0 ? 'user' : 'assistant',
                parts: [{ type: 'text', text: `Error test message ${i}` }],
            }));
            const startTime = Date.now();
            const result = await middleware.transformParams({
                type: 'generate',
                params: {
                    model: 'error-model',
                    messages,
                    tools: [{ type: 'function', name: 'error_tool', inputSchema: {} }],
                },
            });
            const processingTime = Date.now() - startTime;
            expect(processingTime).toBeLessThan(200);
            expect(result).toBeDefined();
            expect(result.messages).toBe(messages);
        });
    });
});
describe('Tool Optimizing Middleware Load Testing', () => {
    const createRealisticData = () => ({
        messages: Array.from({ length: 100 }, (_, i) => ({
            id: `load-msg-${i}`,
            role: i % 3 === 0 ? 'system' : i % 2 === 0 ? 'user' : 'assistant',
            parts: [
                {
                    type: 'text',
                    text: `Load test message ${i} with realistic content length and complexity. This message simulates actual user interactions with varying lengths and content types.`,
                },
            ],
        })),
        tools: Array.from({ length: 20 }, (_, i) => ({
            type: 'function',
            name: `load_test_tool_${i}`,
            description: `Load test tool ${i} for stress testing with realistic schemas`,
            inputSchema: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Search query' },
                    filters: {
                        type: 'object',
                        properties: {
                            category: { type: 'string' },
                            dateRange: {
                                type: 'object',
                                properties: {
                                    start: { type: 'string', format: 'date' },
                                    end: { type: 'string', format: 'date' },
                                },
                            },
                        },
                    },
                    options: {
                        type: 'object',
                        properties: {
                            limit: { type: 'number', minimum: 1, maximum: 100 },
                            sortBy: {
                                type: 'string',
                                enum: ['date', 'relevance', 'popularity'],
                            },
                            includeMetadata: { type: 'boolean' },
                        },
                    },
                },
                required: ['query'],
            },
        })),
    });
    beforeEach(() => {
        const mockToolMapInstance = {
            scanForTools: jest.fn().mockImplementation(async (tools) => {
                await new Promise((resolve) => setTimeout(resolve, 5));
                return Array.isArray(tools) ? Math.floor(tools.length * 0.3) : 1;
            }),
        };
        ToolMap.getInstance.mockResolvedValue(mockToolMapInstance);
        optimizeMessagesWithToolSummarization.mockImplementation(async (messages) => {
            await new Promise((resolve) => setTimeout(resolve, messages.length));
            return messages.slice(0, Math.floor(messages.length * 0.6));
        });
    });
    it('should handle realistic production load', async () => {
        const config = {
            userId: 'load-test-user',
            chatHistoryId: 'load-test-chat',
            enableToolScanning: true,
            enableMessageOptimization: true,
            optimizationThreshold: 50,
        };
        const middleware = createToolOptimizingMiddleware(config);
        const { messages, tools } = createRealisticData();
        const startTime = Date.now();
        const result = await middleware.transformParams({
            type: 'generateText',
            params: {
                model: 'production-model',
                messages,
                tools,
            },
        });
        const processingTime = Date.now() - startTime;
        expect(processingTime).toBeLessThan(2000);
        expect(result.messages).toBeDefined();
        expect(result.tools).toBeDefined();
        expect(Array.isArray(result.messages)).toBe(true);
        expect(result.messages?.length).toBeLessThan(messages.length);
    }, 10000);
});
//# sourceMappingURL=performance.test.js.map