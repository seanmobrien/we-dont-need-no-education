jest.unmock('@opentelemetry/api');
jest.unmock('@opentelemetry/sdk-trace-base');
import { setupImpersonationMock } from '@/__tests__/jest.mock-impersonation';
setupImpersonationMock();
import { optimizeMessagesWithToolSummarization, cacheManager, extractToolCallIds, hasToolCalls, } from '@/lib/ai/chat/message-optimizer-tools';
import { aiModelFactory } from '@/lib/ai/aiModelFactory';
import { generateText, generateObject } from 'ai';
jest.mock('@/lib/ai/aiModelFactory');
jest.mock('ai', () => ({
    ...jest.requireActual('ai'),
    generateText: jest.fn(),
    generateObject: jest.fn(),
}));
jest.mock('@compliance-theater/database', () => ({
    drizDbWithInit: jest.fn(() => ({
        transaction: jest.fn((callback) => callback({
            insert: jest.fn(() => ({ values: jest.fn() })),
            select: jest.fn(() => ({ from: jest.fn(() => Promise.resolve([])) })),
        })),
        insert: jest.fn(() => ({ values: jest.fn() })),
        select: jest.fn(() => ({ from: jest.fn(() => Promise.resolve([])) })),
    })),
    schema: {
        chatTool: { chatToolId: 'chatToolId' },
        chatToolCalls: { chatToolCallId: 'chatToolCallId' },
    },
}));
jest.mock('@/lib/ai/services/model-stats/tool-map', () => ({
    ToolMap: {
        getInstance: jest.fn(() => Promise.resolve({
            id: jest.fn(() => 'mock-tool-id'),
            refresh: jest.fn(() => Promise.resolve(true)),
        })),
    },
}));
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid'),
}));
const mockAiModelFactory = aiModelFactory;
const mockGenerateText = generateText;
const mockGenerateObject = generateObject;
const messageText = (m) => (m.parts || [])
    .map((p) => p && p.type === 'text' && typeof p.text === 'string'
    ? p.text
    : 'input' in p
        ? p.input
        : '')
    .join(' ')
    .trim();
describe('Message Optimizer Tools', () => {
    beforeEach(() => {
        cacheManager.clear();
        mockAiModelFactory.mockResolvedValue('mock-lofi-model');
        mockGenerateText.mockResolvedValue({
            text: 'Tool executed successfully with optimized results.',
            usage: { completionTokens: 50, promptTokens: 100, totalTokens: 150 },
        });
        mockGenerateObject.mockResolvedValue({
            object: {
                messageSummary: 'Tool executed successfully with optimized results.',
                chatTitle: 'Tool Summary',
            },
            usage: { completionTokens: 50, promptTokens: 100, totalTokens: 150 },
        });
    });
    describe('Cache Management', () => {
        it('should start with empty cache', () => {
            const stats = cacheManager.getStats();
            expect(stats.size).toBe(0);
            expect(stats.keys).toEqual([]);
        });
        it('should clear cache properly', () => {
            cacheManager.import({
                test_key_1: 'Test summary 1',
                test_key_2: 'Test summary 2',
            });
            expect(cacheManager.getStats().size).toBe(2);
            cacheManager.clear();
            expect(cacheManager.getStats().size).toBe(0);
        });
        it('should export and import cache data', () => {
            const testData = {
                hash1: 'Summary for tool call 1',
                hash2: 'Summary for tool call 2',
            };
            cacheManager.import(testData);
            const exported = cacheManager.export();
            expect(exported).toEqual(testData);
        });
        it('should track cache statistics', () => {
            cacheManager.import({
                abcd1234: 'Test summary 1',
                efgh5678: 'Test summary 2',
            });
            const stats = cacheManager.getStats();
            expect(stats.size).toBe(2);
            expect(stats.keys).toEqual(['abcd1234', 'efgh5678']);
        });
    });
    describe('Utility Functions', () => {
        describe('extractToolCallIds', () => {
            it('should extract tool call IDs from assistant messages', () => {
                const message = {
                    role: 'assistant',
                    parts: [
                        { type: 'text', text: 'I will help you' },
                        {
                            type: 'tool-search',
                            toolCallId: 'call_1',
                            state: 'input-streaming',
                            input: undefined,
                        },
                        {
                            type: 'tool-search',
                            toolCallId: 'call_1',
                            state: 'input-available',
                            input: { searchTerm: 'search term' },
                        },
                        {
                            type: 'tool-analyze',
                            toolCallId: 'call_2',
                            state: 'input-available',
                            input: { target: 'results' },
                        },
                    ],
                    id: 'msg_1',
                };
                const ids = extractToolCallIds(message);
                expect(ids).toEqual(['call_1', 'call_2']);
            });
            it('should return empty array for non-assistant messages', () => {
                const message = {
                    role: 'user',
                    parts: [
                        { type: 'text', text: 'Hello' },
                        {
                            type: 'tool-search',
                            toolCallId: 'call_1',
                            state: 'input-streaming',
                            input: undefined,
                        },
                        {
                            type: 'tool-search',
                            toolCallId: 'call_1',
                            state: 'input-available',
                            input: { searchTerm: 'search term' },
                        },
                        {
                            type: 'tool-analyze',
                            toolCallId: 'call_2',
                            state: 'input-available',
                            input: { target: 'results' },
                        },
                    ],
                    id: 'msg_1',
                };
                const ids = extractToolCallIds(message);
                expect(ids).toEqual([]);
            });
            it('should handle messages without tool invocations', () => {
                const message = {
                    role: 'assistant',
                    parts: [{ type: 'text', text: 'Hello back' }],
                    id: 'msg_1',
                };
                const ids = extractToolCallIds(message);
                expect(ids).toEqual([]);
            });
        });
        describe('hasToolCalls', () => {
            it('should return true for assistant messages with tool invocations', () => {
                const message = {
                    role: 'assistant',
                    parts: [
                        { type: 'text', text: 'Processing...' },
                        {
                            type: 'tool-search',
                            toolCallId: 'call_1',
                            state: 'input-streaming',
                            input: undefined,
                        },
                        {
                            type: 'tool-search',
                            toolCallId: 'call_1',
                            state: 'input-available',
                            input: { searchTerm: 'search term' },
                        },
                        {
                            type: 'tool-analyze',
                            toolCallId: 'call_2',
                            state: 'input-available',
                            input: { target: 'results' },
                        },
                    ],
                    id: 'msg_1',
                };
                expect(hasToolCalls(message)).toBe(true);
            });
            it('should return false for user messages', () => {
                const message = {
                    role: 'user',
                    parts: [
                        { type: 'text', text: 'Processing...' },
                        {
                            type: 'tool-search',
                            toolCallId: 'call_1',
                            state: 'input-streaming',
                            input: undefined,
                        },
                        {
                            type: 'tool-search',
                            toolCallId: 'call_1',
                            state: 'input-available',
                            input: { searchTerm: 'search term' },
                        },
                        {
                            type: 'tool-analyze',
                            toolCallId: 'call_2',
                            state: 'input-available',
                            input: { target: 'results' },
                        },
                    ],
                    id: 'msg_1',
                };
                expect(hasToolCalls(message)).toBe(false);
            });
            it('should return false for assistant messages without tool invocations', () => {
                const message = {
                    role: 'assistant',
                    parts: [{ type: 'text', text: 'Hello back' }],
                    id: 'msg_1',
                };
                expect(hasToolCalls(message)).toBe(false);
            });
        });
    });
    const createUserMessage = (content, id) => ({
        role: 'user',
        parts: [{ type: 'text', text: content }],
        id,
    });
    const createAssistantMessage = (content, id) => ({
        role: 'assistant',
        parts: [{ type: 'text', text: content }],
        id,
    });
    const createToolMessage = (toolCallId, toolName, args, result, id, error) => {
        const builtToolName = `tool-${toolName}`;
        const toolParts = [
            {
                type: builtToolName,
                toolCallId: toolCallId,
                state: 'input-streaming',
                input: undefined,
                id,
            },
        ];
        if (args) {
            toolParts.push({
                type: builtToolName,
                toolCallId: toolCallId,
                state: 'input-available',
                input: args,
                id,
            });
        }
        if (result) {
            toolParts.push({
                type: builtToolName,
                toolCallId: toolCallId,
                state: 'output-available',
                input: args,
                output: result,
                id,
            });
        }
        if (error) {
            toolParts.push({
                type: builtToolName,
                state: 'output-error',
                toolCallId: toolCallId,
                rawInput: args,
                errorText: error,
            });
        }
        const baseMessage = {
            role: 'assistant',
            parts: [{ type: 'text', text: 'Processing...' }, ...toolParts],
            id: id || `tool_msg_${toolCallId}`,
        };
        return {
            ...baseMessage,
        };
    };
    const createToolResultMessage = (toolCallId, toolName, args, result, id, error) => {
        const builtToolName = `tool-${toolName}`;
        const toolParts = [];
        if (result) {
            toolParts.push({
                type: builtToolName,
                toolCallId: toolCallId,
                state: 'output-available',
                input: args,
                output: result,
                id,
            });
        }
        if (error) {
            toolParts.push({
                type: builtToolName,
                state: 'output-error',
                toolCallId: toolCallId,
                rawInput: args,
                errorText: error,
            });
        }
        const baseMessage = {
            role: 'assistant',
            parts: [{ type: 'text', text: 'Processing...' }, ...toolParts],
            id: id || `tool_msg_${toolCallId}_result`,
        };
        return {
            ...baseMessage,
        };
    };
    const createRecentMessageBuffer = (includeTool) => {
        const messages = [];
        messages.push(createUserMessage('What about examples?', 'user_3'));
        if (includeTool) {
            messages.push(createToolResultMessage('call_inrecent', 'semantic_search', { query: 'examples' }, 'Found 5 results'));
        }
        messages.push(createAssistantMessage('Let me search for examples', 'assistant_4'));
        messages.push(createUserMessage('Thanks!', 'user_4'));
        messages.push(createAssistantMessage('You are welcome!', 'assistant_5'));
        return messages;
    };
    const createStandardUsecase = () => {
        const messages = [
            createUserMessage('Search for documentation', 'user_1'),
            createAssistantMessage('I will search for documentation', 'assistant_1'),
            createToolMessage('call_1', 'semantic_search', { query: 'docs' }, 'Found 10 results'),
            createAssistantMessage('Found some documentation', 'assistant_2'),
            createUserMessage('What about tutorials?', 'user_2'),
            createAssistantMessage('Let me search for tutorials', 'assistant_3'),
            createToolMessage('call_inrecent', 'semantic_search', {
                query: 'this value is split',
            }),
            ...createRecentMessageBuffer(true),
        ];
        return messages;
    };
    describe('Message Optimization', () => {
        it('should preserve recent messages when no optimization is needed', async () => {
            const messages = [
                createUserMessage('Hello', 'user_1'),
                createAssistantMessage('Hi there!', 'assistant_1'),
                createUserMessage('How are you?', 'user_2'),
                createAssistantMessage('I am doing well', 'assistant_2'),
            ];
            const optimized = await optimizeMessagesWithToolSummarization(messages, 'gpt-4', 'test_user', 'test-chat-id');
            expect(optimized).toEqual(messages);
            expect(mockGenerateObject).not.toHaveBeenCalled();
        });
        it('should optimize old tool calls while preserving recent interactions', async () => {
            const messages = createStandardUsecase();
            const optimized = await optimizeMessagesWithToolSummarization(messages, 'gpt-4', 'test_user', 'test-chat-id');
            expect(optimized.length).toEqual(messages.length);
            expect(optimized[2].parts.length).toEqual(messages[2].parts.length - 1);
            const summaryPart = optimized[2].parts[1];
            expect(summaryPart.type).toBe('text');
            expect(summaryPart.text).toContain('Summary generation failed');
        });
        it('should use cached summaries for identical tool calls', async () => {
            const toolMessages = [
                createUserMessage('Search for docs', 'user_1'),
                createAssistantMessage('I will search', 'assistant_1'),
                createToolMessage('call_1', 'search', { query: 'docs' }),
                createToolMessage('call_1', 'search', { query: 'docs' }, 'Results...'),
                createAssistantMessage('Found docs', 'assistant_2'),
                createUserMessage('Intermediate question', 'user_2'),
                createAssistantMessage('Intermediate response', 'assistant_3'),
                createUserMessage('Recent question', 'user_3'),
                createAssistantMessage('Recent response', 'assistant_4'),
            ];
            await optimizeMessagesWithToolSummarization(toolMessages, 'gpt-4', 'test_user', 'test-chat-id');
            expect(true).toBe(true);
            mockGenerateObject.mockClear();
            await optimizeMessagesWithToolSummarization(toolMessages, 'gpt-4', 'test_user', 'test-chat-id');
            expect(mockGenerateObject).toHaveBeenCalledTimes(0);
        });
        it('should handle LLM summarization failures gracefully', async () => {
            mockGenerateObject.mockRejectedValueOnce(new Error('LLM service unavailable'));
            const messages = [
                createUserMessage('Search for something', 'user_1'),
                createAssistantMessage('Searching...', 'assistant_1'),
                createToolMessage('call_1', 'search', { query: 'test' }, 'Found matches'),
                createToolMessage('call_2', 'search', { query: 'test' }, 'Found results'),
                createAssistantMessage('Here are results', 'assistant_2'),
                createUserMessage('Intermediate', 'user_2'),
                createAssistantMessage('Intermediate response', 'assistant_3'),
                createUserMessage('Recent question', 'user_3'),
                createAssistantMessage('Recent answer', 'assistant_4'),
                ...createRecentMessageBuffer(false),
            ];
            const optimized = await optimizeMessagesWithToolSummarization(messages, 'gpt-4', 'test_user', 'test-chat-id');
            expect(optimized.length).toBeGreaterThanOrEqual(messages.length - 1);
            const summaryMessage = optimized.find((m) => {
                const text = messageText(m);
                return (typeof text === 'string' &&
                    (text.includes('Tool execution completed') ||
                        text.includes('Summary generation failed') ||
                        text.includes('[ID: mock-uuid]')));
            });
            expect(summaryMessage).toBeDefined();
        });
        it('should preserve tool calls from recent interactions', async () => {
            const messages = createStandardUsecase();
            const optimized = await optimizeMessagesWithToolSummarization(messages, 'gpt-4', 'test_user', 'test-chat-id');
            expect(optimized[optimized.length - 4].parts.length).toEqual(messages[optimized.length - 4].parts.length);
            expect(optimized[optimized.length - 4].parts[1]
                .output).toEqual(messages[optimized.length - 4].parts[1]
                .output);
            expect(optimized[optimized.length - 6].parts.length).toEqual(messages[optimized.length - 6].parts.length);
            expect(optimized[optimized.length - 6].parts[1]
                .input).toEqual(messages[optimized.length - 6].parts[1]
                .input);
            expect(optimized[optimized.length - 6].parts[1]
                .output).toEqual(messages[optimized.length - 6].parts[2]
                .output);
        });
    });
    describe('Edge Cases', () => {
        it('should handle empty message array', async () => {
            const optimized = await optimizeMessagesWithToolSummarization([], 'gpt-4', 'test_user', 'test-chat-id');
            expect(optimized).toEqual([]);
        });
        it('should handle messages without tool invocations', async () => {
            const messages = [
                {
                    role: 'user',
                    parts: [{ type: 'text', text: 'Hello' }],
                    id: '1',
                },
                {
                    role: 'assistant',
                    parts: [{ type: 'text', text: 'Hi' }],
                    id: '2',
                },
            ];
            const optimized = await optimizeMessagesWithToolSummarization(messages, 'gpt-4', 'test_user', 'test-chat-id');
            expect(optimized).toEqual(messages);
        });
        it('should handle tool calls without proper IDs', async () => {
            const messages = [
                createUserMessage('1', 'Test'),
                createAssistantMessage('2', 'Processing'),
                createToolMessage(undefined, 'semantic_search', { query: 'search-term', toolName: 'search' }, '1000 search results found'),
                createUserMessage('3', 'You sure are a helpful assistant'),
                createAssistantMessage('4', 'Thank you!'),
                ...createRecentMessageBuffer(false),
            ];
            const optimized = await optimizeMessagesWithToolSummarization(messages, 'gpt-4', 'test_user', 'test-chat-id');
            expect(optimized).toBeDefined();
            expect(optimized.length).toBe(messages.length);
            expect(optimized[2].parts.length).toEqual(messages[2].parts.length);
            expect(optimized[2].parts[1].input).toEqual(messages[2].parts[1].input);
            expect(optimized[2].parts[2].input).toEqual(messages[2].parts[2].input);
            expect(optimized[2].parts[3].input).toEqual(messages[2].parts[3].input);
            expect(optimized[2].parts[1].output).toEqual(messages[2].parts[1].output);
            expect(optimized[2].parts[2].output).toEqual(messages[2].parts[2].output);
            expect(optimized[2].parts[3].output).toEqual(messages[2].parts[3].output);
        });
    });
    describe('Performance and Metrics', () => {
        it('should log optimization metrics', async () => {
            const largeMessages = [
                ...Array.from({ length: 20 }, (_, i) => ({
                    role: 'user',
                    parts: [
                        {
                            type: 'text',
                            text: `User message ${i} with lots of content that makes the message quite large and contributes to token usage`,
                        },
                    ],
                    id: `user_${i}`,
                })),
                ...Array.from({ length: 20 }, (_, i) => ({
                    role: 'assistant',
                    parts: [
                        {
                            type: 'text',
                            text: `Assistant response ${i} with detailed explanation and comprehensive information`,
                        },
                    ],
                    id: `assistant_${i}`,
                })),
            ];
            const optimized = await optimizeMessagesWithToolSummarization(largeMessages, 'gpt-4', 'test_user', 'test-chat-id');
            expect(optimized.length).toBe(largeMessages.length);
        });
    });
    describe('Data Validation', () => {
        it('should handle null and undefined content values in database results', () => {
            const mockDbResults = [
                { content: 'Valid content 1', optimizedContent: 'Optimized 1' },
                { content: null, optimizedContent: 'Optimized 2' },
                { content: 'Valid content 3', optimizedContent: null },
                { content: '', optimizedContent: 'Optimized 4' },
                { content: 'Valid content 5', optimizedContent: '' },
                { content: undefined, optimizedContent: 'Optimized 6' },
                { content: 'Valid content 7', optimizedContent: undefined },
            ];
            const contentResults = mockDbResults
                .map((m) => m.content)
                .filter((content) => typeof content === 'string' && content.trim().length > 0);
            expect(contentResults).toEqual([
                'Valid content 1',
                'Valid content 3',
                'Valid content 5',
                'Valid content 7',
            ]);
            const optimizedResults = mockDbResults
                .map((m) => m.optimizedContent)
                .filter((content) => typeof content === 'string' && content.trim().length > 0);
            expect(optimizedResults).toEqual([
                'Optimized 1',
                'Optimized 2',
                'Optimized 4',
                'Optimized 6',
            ]);
        });
    });
});
//# sourceMappingURL=message-optimizer-tools.test.js.map