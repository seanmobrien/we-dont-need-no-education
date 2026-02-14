import { handleToolCall, handleFinish, processStreamChunk, } from '@/lib/ai/middleware/chat-history/stream-handlers';
import { drizDb } from '@compliance-theater/database/orm';
import { chatMessages, tokenUsage } from '@compliance-theater/database/schema';
import { getNextSequence } from '@/lib/ai/middleware/chat-history/utility';
import { log } from '@compliance-theater/logger';
import { hideConsoleOutput } from '@/__tests__/test-utils';
import { ensureCreateResult } from '@/lib/ai/middleware/chat-history/stream-handler-result';
jest.mock('@compliance-theater/database');
jest.mock('@/lib/ai/middleware/chat-history/utility');
jest.mock('@compliance-theater/logger');
let mockDb;
const mockGetNextSequence = getNextSequence;
const mockLog = log;
const mockConsole = hideConsoleOutput();
describe('Stream Handlers', () => {
    let mockContext;
    beforeEach(() => {
        mockDb = drizDb();
        mockConsole.setup();
        mockContext = ensureCreateResult({
            chatId: 'chat-123',
            turnId: 1,
            messageId: 42,
            currentMessageOrder: 1,
            generatedText: 'Initial text',
            generatedJSON: [],
            toolCalls: new Map(),
        });
        mockDb.update.mockReturnValue({
            set: jest.fn().mockReturnValue({
                where: jest.fn().mockResolvedValue(undefined),
            }),
        });
        mockDb.insert.mockReturnValue({
            values: jest.fn().mockReturnValue({
                returning: jest.fn().mockReturnValue({
                    execute: jest.fn().mockResolvedValue([
                        {
                            messageId: 100,
                            providerId: 'test-provider-id',
                            toolName: 'test-tool',
                        },
                    ]),
                }),
            }),
        });
        mockDb.select.mockReturnValue({
            from: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                        execute: jest.fn().mockResolvedValue([]),
                    }),
                }),
            }),
        });
        mockDb.transaction.mockImplementation(async (callback) => {
            return await callback({
                insert: mockDb.insert,
                update: mockDb.update,
                select: mockDb.select,
            });
        });
        mockGetNextSequence.mockImplementation((params) => {
            if (params.tx) {
                return Promise.resolve([100]);
            }
            return Promise.resolve([100]);
        });
    });
    describe('handleToolCall', () => {
        it('should create tool message successfully', async () => {
            const chunk = {
                type: 'tool-call',
                toolCallId: 'tool-123',
                toolName: 'search',
                input: JSON.stringify({ query: 'test search' }),
            };
            const result = await handleToolCall(chunk, mockContext);
            expect(result).toEqual({
                currentMessageId: undefined,
                chatId: 'chat-123',
                generatedJSON: [],
                messageId: 42,
                turnId: 1,
                currentMessageOrder: 2,
                generatedText: '',
                toolCalls: expect.any(Map),
                success: true,
            });
            expect(mockGetNextSequence).toHaveBeenCalledWith({
                tableName: 'chat_messages',
                chatId: 'chat-123',
                turnId: 1,
                count: 1,
                tx: expect.any(Object),
            });
            expect(mockDb.insert).toHaveBeenCalledWith(chatMessages);
        });
        it('should handle tool call without arguments', async () => {
            const chunk = {
                type: 'tool-call',
                toolCallId: 'tool-456',
                toolName: 'ping',
                input: '',
            };
            const result = await handleToolCall(chunk, mockContext);
            expect(result).toEqual({
                chatId: 'chat-123',
                generatedJSON: [],
                messageId: 42,
                turnId: 1,
                currentMessageId: undefined,
                currentMessageOrder: 2,
                generatedText: '',
                toolCalls: expect.any(Map),
                success: true,
            });
        });
        it('should handle getNextSequence errors', async () => {
            const chunk = {
                type: 'tool-call',
                toolCallId: 'tool-error',
                toolName: 'error-tool',
                input: '{}',
            };
            const sequenceError = new Error('Failed to get next sequence');
            mockGetNextSequence.mockRejectedValue(sequenceError);
            const result = await handleToolCall(chunk, mockContext);
            expect(result).toEqual({
                chatId: 'chat-123',
                generatedJSON: [],
                messageId: 42,
                currentMessageOrder: 1,
                turnId: 1,
                generatedText: 'Initial text',
                toolCalls: expect.any(Map),
                success: false,
            });
            expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
        });
        it('should handle database insert errors', async () => {
            const chunk = {
                type: 'tool-call',
                toolCallId: 'tool-db-error',
                toolName: 'db-error-tool',
                input: '{}',
            };
            const insertError = new Error('Database insert failed');
            mockDb.transaction.mockRejectedValue(insertError);
            const result = await handleToolCall(chunk, mockContext);
            expect(result).toEqual({
                messageId: 42,
                currentMessageOrder: 1,
                turnId: 1,
                chatId: 'chat-123',
                generatedJSON: [],
                generatedText: 'Initial text',
                toolCalls: expect.any(Map),
                success: false,
            });
            expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
        });
        it('should handle complex tool arguments', async () => {
            const complexArgs = {
                query: 'test search',
                filters: {
                    date: '2025-01-01',
                    category: 'tech',
                },
                options: ['precise', 'fast'],
            };
            const chunk = {
                type: 'tool-call',
                toolCallId: 'tool-complex',
                toolName: 'complex-search',
                input: JSON.stringify(complexArgs),
            };
            const result = await handleToolCall(chunk, mockContext);
            expect(result.success).toBe(true);
            expect(result.currentMessageId).toBe(undefined);
            expect(result.currentMessageOrder).toBe(2);
            expect(result.generatedText).toBe('');
            expect(result.toolCalls).toEqual(expect.any(Map));
            expect(mockDb.transaction).toHaveBeenCalled();
        });
    });
    describe('handleFinish', () => {
        it('should record token usage successfully', async () => {
            const chunk = {
                type: 'finish',
                usage: {
                    inputTokens: 50,
                    outputTokens: 25,
                    totalTokens: 75,
                },
                finishReason: 'stop',
            };
            const result = await handleFinish(chunk, mockContext);
            expect(result).toEqual({
                currentMessageId: undefined,
                currentMessageOrder: 1,
                chatId: 'chat-123',
                messageId: 42,
                turnId: 1,
                generatedJSON: [],
                generatedText: 'Initial text',
                toolCalls: expect.any(Map),
                success: true,
            });
            expect(mockDb.insert).toHaveBeenCalledWith(tokenUsage);
        });
        it('should handle finish without usage data', async () => {
            const chunk = {
                type: 'finish',
                finishReason: 'stop',
                usage: {
                    inputTokens: 0,
                    outputTokens: 0,
                    totalTokens: 0,
                },
            };
            const contextWithoutMessageId = { ...mockContext, messageId: undefined };
            const result = await handleFinish(chunk, contextWithoutMessageId);
            expect(result).toEqual({
                currentMessageId: undefined,
                currentMessageOrder: 1,
                generatedText: 'Initial text',
                chatId: 'chat-123',
                messageId: 42,
                turnId: 1,
                generatedJSON: [],
                toolCalls: expect.any(Map),
                success: true,
            });
            expect(mockDb.transaction).not.toHaveBeenCalled();
        });
        it('should handle context without turnId', async () => {
            const chunk = {
                type: 'finish',
                usage: {
                    inputTokens: 30,
                    outputTokens: 15,
                    totalTokens: 45,
                },
                finishReason: 'stop',
            };
            const contextWithoutTurnId = {
                ...mockContext,
                turnId: undefined,
            };
            const result = await handleFinish(chunk, contextWithoutTurnId);
            expect(result).toEqual({
                currentMessageId: undefined,
                currentMessageOrder: 1,
                generatedText: 'Initial text',
                toolCalls: expect.any(Map),
                chatId: 'chat-123',
                messageId: 42,
                turnId: 1,
                generatedJSON: [],
                success: true,
            });
            expect(mockDb.insert).not.toHaveBeenCalled();
        });
        it('should handle database insert errors for token usage', async () => {
            mockConsole.setup();
            const chunk = {
                type: 'finish',
                usage: {
                    inputTokens: 40,
                    outputTokens: 20,
                    totalTokens: 60,
                },
                finishReason: 'stop',
            };
            const insertError = new Error('Token usage insert failed');
            mockDb.transaction.mockRejectedValue(insertError);
            const result = await handleFinish(chunk, mockContext);
            expect(result).toEqual({
                currentMessageOrder: 1,
                generatedText: 'Initial text',
                toolCalls: expect.any(Map),
                chatId: 'chat-123',
                messageId: 42,
                turnId: 1,
                generatedJSON: [],
                success: false,
            });
            expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
        });
        it('should calculate total tokens correctly', async () => {
            const chunk = {
                type: 'finish',
                usage: {
                    inputTokens: 100,
                    outputTokens: 75,
                    totalTokens: 175,
                },
                finishReason: 'stop',
            };
            await handleFinish(chunk, mockContext);
            expect(mockDb.insert).toHaveBeenCalledWith(tokenUsage);
            const insertCall = mockDb.insert.mock.results[0].value;
            expect(insertCall.values).toHaveBeenCalledWith({
                chatId: 'chat-123',
                turnId: 1,
                promptTokens: 100,
                completionTokens: 75,
                totalTokens: 175,
            });
        });
    });
    describe('processStreamChunk', () => {
        it('should route text-delta chunks correctly', async () => {
            const start = {
                type: 'text-start',
                id: 'test-id',
            };
            const chunk = {
                type: 'text-delta',
                id: 'test-id',
                delta: ' routed text',
            };
            const end = {
                type: 'text-end',
                id: 'test-id',
            };
            await processStreamChunk(start, mockContext);
            const result = await processStreamChunk(chunk, mockContext);
            await processStreamChunk(end, mockContext);
            expect(result.generatedText).toBe('Initial text routed text');
            expect(result.success).toBe(true);
        });
        it('should route tool-call chunks correctly', async () => {
            const chunk = {
                type: 'tool-call',
                toolCallId: 'tool-route',
                toolName: 'route-tool',
                input: '{}',
            };
            const result = await processStreamChunk(chunk, mockContext);
            expect(result).toEqual({
                generatedJSON: [],
                chatId: 'chat-123',
                messageId: 42,
                turnId: 1,
                currentMessageId: undefined,
                currentMessageOrder: 2,
                generatedText: '',
                toolCalls: expect.any(Map),
                success: true,
            });
        });
        it('should route finish chunks correctly', async () => {
            const chunk = {
                type: 'finish',
                usage: {
                    inputTokens: 10,
                    outputTokens: 5,
                    totalTokens: 15,
                },
                finishReason: 'stop',
            };
            const result = await processStreamChunk(chunk, mockContext);
            expect(result).toEqual({
                chatId: 'chat-123',
                messageId: 42,
                turnId: 1,
                generatedJSON: [],
                currentMessageId: undefined,
                currentMessageOrder: 1,
                generatedText: 'Initial text',
                toolCalls: expect.any(Map),
                success: true,
            });
        });
        it('should handle unrecognized chunk types gracefully', async () => {
            const chunk = {
                type: 'unknown-chunk-type',
                data: 'some data',
            };
            const result = await processStreamChunk(chunk, mockContext);
            expect(result.chatId).toBe('chat-123');
            expect(result.turnId).toBe(1);
            expect(result.messageId).toBe(42);
            expect(result.generatedText).toBe('Initial text{"type":"unknown-chunk-type","data":"some data"}');
            expect(result.success).toBe(true);
        });
        it('should handle error chunks', async () => {
            const chunk = {
                type: 'error',
                error: new Error('Stream error'),
            };
            const result = await processStreamChunk(chunk, mockContext);
            expect(result.chatId).toBe('chat-123');
            expect(result.turnId).toBe(1);
            expect(result.messageId).toBe(42);
            expect(result.generatedText).toContain('Initial text');
            expect(result.success).toBe(true);
        });
    });
    describe('Integration Tests', () => {
        it('should handle a sequence of different chunk types', async () => {
            const context = { ...mockContext };
            let result = await processStreamChunk({ type: 'text-start', id: 'test-id' }, context);
            result = await processStreamChunk({ type: 'text-delta', id: 'test-id', delta: 'Hello' }, context);
            await processStreamChunk({ type: 'text-end', id: 'test-id' }, context);
            context.generatedText = result.generatedText;
            expect(result.generatedText).toBe('Initial textHello');
            const toolChunk = {
                type: 'tool-call',
                toolCallId: 'tool-seq',
                toolName: 'sequence-tool',
                input: JSON.stringify({ step: 1 }),
            };
            result = await processStreamChunk(toolChunk, context);
            context.currentMessageOrder = result.currentMessageOrder;
            expect(result.currentMessageOrder).toBe(2);
            await processStreamChunk({ type: 'text-start', id: 'test-id' }, context);
            result = await processStreamChunk({ type: 'text-delta', id: 'test-id', delta: ' world' }, context);
            await processStreamChunk({ type: 'text-end', id: 'test-id' }, context);
            context.generatedText = result.generatedText;
            expect(result.generatedText).toBe('Initial textHello world');
            const finishChunk = {
                type: 'finish',
                usage: {
                    inputTokens: 10,
                    outputTokens: 5,
                    totalTokens: 15,
                },
                finishReason: 'stop',
            };
            result = await processStreamChunk(finishChunk, context);
            expect(result.success).toBe(true);
        });
        it('should maintain state consistency across multiple chunks', async () => {
            const chunks = [
                { type: 'text-start', id: 'test-id-1' },
                { type: 'text-delta', id: 'test-id-1', delta: 'First' },
                { type: 'text-end', id: 'test-id-1' },
                { type: 'text-start', id: 'test-id-2' },
                { type: 'text-delta', id: 'test-id-2', delta: ' Second' },
                { type: 'text-end', id: 'test-id-2' },
                { type: 'text-start', id: 'test-id-3' },
                { type: 'text-delta', id: 'test-id-3', delta: ' Third' },
                { type: 'text-end', id: 'test-id-3' },
            ];
            let currentContext = { ...mockContext };
            for (const chunk of chunks) {
                const result = (await processStreamChunk(chunk, currentContext));
                currentContext = ensureCreateResult(result);
            }
            expect(currentContext.generatedText).toBe('Initial textFirst Second Third');
        });
    });
});
//# sourceMappingURL=stream-handlers.test.js.map