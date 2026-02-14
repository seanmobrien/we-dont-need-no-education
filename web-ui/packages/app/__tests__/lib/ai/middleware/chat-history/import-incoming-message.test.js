jest.unmock('@opentelemetry/api');
jest.unmock('@opentelemetry/sdk-trace-base');
import { setupImpersonationMock } from '@/__tests__/jest.mock-impersonation';
setupImpersonationMock();
import { importIncomingMessage } from '@/lib/ai/middleware/chat-history/import-incoming-message';
import { schema } from '@compliance-theater/database/orm';
import { getNextSequence, getNewMessages, } from '@/lib/ai/middleware/chat-history/utility';
import { generateChatId } from '@/lib/ai/core';
import { log } from '@compliance-theater/logger';
import { createUserChatHistoryContext } from '@/lib/ai/middleware/chat-history/create-chat-history-context';
jest.mock('@/lib/ai/middleware/chat-history/utility');
jest.mock('@/lib/ai/core');
jest.mock('@compliance-theater/logger');
const mockGetNextSequence = getNextSequence;
const mockGetNewMessages = getNewMessages;
const mockGenerateChatId = generateChatId;
const mockLog = log;
describe('Import Incoming Message', () => {
    let mockTx;
    let mockContext;
    let mockParams;
    beforeEach(() => {
        mockTx = {
            select: jest.fn().mockReturnValue({
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        orderBy: jest.fn().mockReturnValue({
                            limit: jest.fn().mockReturnValue([]),
                        }),
                        limit: jest.fn().mockReturnValue({
                            execute: jest.fn().mockResolvedValue([]),
                        }),
                    }),
                    orderBy: jest.fn().mockResolvedValue([]),
                }),
            }),
            insert: jest.fn().mockReturnValue({
                values: jest.fn().mockReturnValue({
                    returning: jest.fn().mockReturnValue({
                        execute: jest.fn().mockResolvedValue([
                            {
                                messageId: 100,
                                content: '',
                                role: 'assistant',
                            },
                        ]),
                    }),
                    execute: jest.fn().mockResolvedValue(undefined),
                }),
            }),
        };
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
                    content: [{ type: 'text', text: 'Hello, how are you?' }],
                },
                {
                    role: 'assistant',
                    content: [{ type: 'text', text: 'I am doing well, thank you!' }],
                },
            ],
        };
        mockGetNextSequence
            .mockResolvedValueOnce([1])
            .mockResolvedValueOnce([10, 11, 12]);
        mockGetNewMessages.mockImplementation((_tx, _chatId, incomingMessages) => Promise.resolve(incomingMessages));
        mockGenerateChatId.mockReturnValue({ seed: 1, id: 'generated-chat-id' });
    });
    describe('Chat Creation', () => {
        it('should create new chat when chatId does not exist', async () => {
            mockTx.select.mockReturnValue({
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        limit: jest.fn().mockReturnValue({
                            execute: jest.fn().mockResolvedValue([]),
                        }),
                    }),
                }),
            });
            const result = await importIncomingMessage({
                tx: mockTx,
                context: mockContext,
                params: mockParams,
            });
            expect(mockTx.insert).toHaveBeenCalledWith(schema.chats);
            expect(result.chatId).toBe('chat-456');
            expect(result.turnId).toBe(1);
        });
        it('should skip chat creation when chat already exists', async () => {
            mockTx.select.mockReturnValue({
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        limit: jest.fn().mockReturnValue({
                            execute: jest.fn().mockResolvedValue([{ id: 'chat-456' }]),
                        }),
                    }),
                }),
            });
            await importIncomingMessage({
                tx: mockTx,
                context: mockContext,
                params: mockParams,
            });
            expect(mockLog).toHaveBeenCalledWith(expect.any(Function));
            expect(mockTx.insert).toHaveBeenCalledWith(schema.chatTurns);
            expect(mockTx.insert).toHaveBeenCalledWith(schema.chatMessages);
        });
        it('should generate chatId when not provided in context', async () => {
            const contextWithoutChatId = { ...mockContext, chatId: undefined };
            const result = await importIncomingMessage({
                tx: mockTx,
                context: contextWithoutChatId,
                params: mockParams,
            });
            expect(mockGenerateChatId).toHaveBeenCalledWith(1);
            expect(result.chatId).toBe('generated-chat-id');
        });
        it('should handle numeric chatId in context', async () => {
            const contextWithNumericChatId = {
                ...mockContext,
                chatId: 123,
            };
            const result = await importIncomingMessage({
                tx: mockTx,
                context: contextWithNumericChatId,
                params: mockParams,
            });
            expect(mockGenerateChatId).toHaveBeenCalledWith(123);
            expect(result.chatId).toBe('generated-chat-id');
        });
        it('should include chat metadata', async () => {
            await importIncomingMessage({
                tx: mockTx,
                context: mockContext,
                params: mockParams,
            });
            const insertCall = mockTx.insert.mock.calls.find((call) => call[0] === schema.chats);
            expect(insertCall).toBeDefined();
        });
    });
    describe('Turn Creation', () => {
        it('should create chat turn with correct properties', async () => {
            const result = await importIncomingMessage({
                tx: mockTx,
                context: mockContext,
                params: mockParams,
            });
            expect(mockGetNextSequence).toHaveBeenCalledWith({
                tableName: 'chat_turns',
                chatId: 'chat-456',
                tx: mockTx,
            });
            expect(mockTx.insert).toHaveBeenCalledWith(schema.chatTurns);
            expect(result.turnId).toBe(1);
        });
        it('should handle getNextSequence failure for turn ID', async () => {
            mockGetNextSequence.mockReset();
            mockGetNextSequence.mockRejectedValueOnce(new Error('Failed to get turn sequence'));
            await expect(importIncomingMessage({
                tx: mockTx,
                context: mockContext,
                params: mockParams,
            })).rejects.toThrow('Failed to get turn sequence');
        });
        it('should handle empty turn ID response', async () => {
            mockGetNextSequence.mockReset();
            mockGetNextSequence.mockResolvedValueOnce([]);
            await expect(importIncomingMessage({
                tx: mockTx,
                context: mockContext,
                params: mockParams,
            })).rejects.toThrow('Unexpected failure retrieving next turn sequence');
        });
        it('should include turn metadata from context', async () => {
            await importIncomingMessage({
                tx: mockTx,
                context: mockContext,
                params: mockParams,
            });
            const turnInsertCall = mockTx.insert.mock.calls.find((call) => call[0] === schema.chatTurns);
            expect(turnInsertCall).toBeDefined();
        });
    });
    describe('Message Creation', () => {
        it('should create messages for all prompt entries', async () => {
            mockGetNextSequence.mockReset();
            mockGetNextSequence
                .mockResolvedValueOnce([1, 2, 3, 4, 5, 6, 7])
                .mockResolvedValueOnce([10, 11, 12]);
            const result = await importIncomingMessage({
                tx: mockTx,
                context: mockContext,
                params: mockParams,
            });
            expect(mockGetNextSequence).toHaveBeenCalledWith({
                tableName: 'chat_messages',
                chatId: 'chat-456',
                turnId: 1,
                count: 2,
                tx: mockTx,
            });
            expect(result.nextMessageOrder).toBe(3);
        });
        it('should handle insufficient message IDs', async () => {
            mockGetNextSequence.mockReset();
            mockGetNextSequence
                .mockResolvedValueOnce([1])
                .mockResolvedValueOnce([10]);
            await expect(importIncomingMessage({
                tx: mockTx,
                context: mockContext,
                params: mockParams,
            })).rejects.toThrow('Failed to reserve enough message ids');
        });
        it('should handle messages with tool calls', async () => {
            const paramsWithToolCall = {
                prompt: [
                    {
                        role: 'user',
                        content: [{ type: 'text', text: 'Use a tool please' }],
                    },
                    {
                        role: 'assistant',
                        content: [
                            {
                                type: 'tool-call',
                                toolCallId: 'tool-123',
                                toolName: 'search',
                                input: { query: 'test' },
                            },
                        ],
                    },
                    {
                        role: 'tool',
                        content: [
                            {
                                type: 'tool-result',
                                toolCallId: 'tool-123',
                                toolName: 'search',
                                output: { type: 'text', value: 'search results' },
                            },
                        ],
                    },
                ],
            };
            mockGetNextSequence.mockReset();
            mockGetNextSequence
                .mockResolvedValueOnce([1])
                .mockResolvedValueOnce([10, 11, 12, 13]);
            await importIncomingMessage({
                tx: mockTx,
                context: mockContext,
                params: paramsWithToolCall,
            });
            expect(mockTx.insert).toHaveBeenCalledWith(schema.chatMessages);
        });
        it('should handle messages with string content', async () => {
            const paramsWithStringContent = {
                prompt: [
                    {
                        role: 'user',
                        content: [{ type: 'text', text: 'Simple string message' }],
                    },
                ],
            };
            mockGetNextSequence.mockReset();
            mockGetNextSequence
                .mockResolvedValueOnce([1])
                .mockResolvedValueOnce([10, 11]);
            await importIncomingMessage({
                tx: mockTx,
                context: mockContext,
                params: paramsWithStringContent,
            });
            expect(mockTx.insert).toHaveBeenCalledWith(schema.chatMessages);
        });
        it('should assign correct message order', async () => {
            const multiMessageParams = {
                prompt: [
                    { role: 'user', content: [{ type: 'text', text: 'Message 1' }] },
                    { role: 'assistant', content: [{ type: 'text', text: 'Message 2' }] },
                    { role: 'user', content: [{ type: 'text', text: 'Message 3' }] },
                ],
            };
            mockGetNextSequence.mockReset();
            mockGetNextSequence
                .mockResolvedValueOnce([1])
                .mockResolvedValueOnce([10, 11, 12, 13]);
            const result = await importIncomingMessage({
                tx: mockTx,
                context: mockContext,
                params: multiMessageParams,
            });
            expect(result.nextMessageOrder).toBe(4);
        });
    });
    describe('Context Variations', () => {
        it('should handle minimal context', async () => {
            const minimalContext = createUserChatHistoryContext({
                userId: 'user-minimal',
            });
            mockGetNextSequence.mockReset();
            mockGetNextSequence
                .mockResolvedValueOnce([1, 2, 3, 4, 5, 6])
                .mockResolvedValueOnce([10, 11, 12]);
            const result = await importIncomingMessage({
                tx: mockTx,
                context: minimalContext,
                params: mockParams,
            });
            expect(result.chatId).toBeDefined();
            expect(result.turnId).toBe(1);
        });
        it('should handle context with all optional fields', async () => {
            const fullContext = createUserChatHistoryContext({
                userId: 'user-full',
                chatId: 'chat-full',
                requestId: 'session-full',
                model: 'gpt-4-turbo',
            });
            const result = await importIncomingMessage({
                tx: mockTx,
                context: fullContext,
                params: mockParams,
            });
            expect(result.chatId).toBe('chat-full');
        });
        it('should handle empty prompt array', async () => {
            const emptyParams = {
                prompt: [],
            };
            mockGetNextSequence.mockReset();
            mockGetNextSequence
                .mockResolvedValueOnce([1, 2, 3, 4, 5])
                .mockResolvedValueOnce([10, 11]);
            const result = await importIncomingMessage({
                tx: mockTx,
                context: mockContext,
                params: emptyParams,
            });
            expect(result.nextMessageOrder).toBe(1);
        });
        it('should handle numeric userId', async () => {
            const contextWithNumericUserId = { ...mockContext, userId: '123' };
            mockGetNextSequence.mockReset();
            mockGetNextSequence
                .mockResolvedValueOnce([1, 2, 3, 4, 5])
                .mockResolvedValueOnce([10, 11]);
            const result = await importIncomingMessage({
                tx: mockTx,
                context: contextWithNumericUserId,
                params: mockParams,
            });
            expect(result.chatId).toBeDefined();
        });
    });
    describe('Error Handling', () => {
        it('should propagate database transaction errors', async () => {
            const dbError = new Error('Transaction failed');
            mockTx.insert.mockReturnValue({
                values: jest.fn().mockRejectedValue(dbError),
            });
            await expect(importIncomingMessage({
                tx: mockTx,
                context: mockContext,
                params: mockParams,
            })).rejects.toThrow('Transaction failed');
        });
        it('should handle chat existence check errors', async () => {
            const checkError = new Error('Chat check failed');
            mockTx.select.mockReturnValue({
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        limit: jest.fn().mockReturnValue({
                            execute: jest.fn().mockRejectedValue(checkError),
                        }),
                    }),
                }),
            });
            await expect(importIncomingMessage({
                tx: mockTx,
                context: mockContext,
                params: mockParams,
            })).rejects.toThrow('Chat check failed');
        });
        it('should handle message insertion errors', async () => {
            mockGetNextSequence.mockReset();
            mockGetNextSequence
                .mockResolvedValueOnce([1])
                .mockResolvedValueOnce([10, 11, 12]);
            mockTx.insert.mockReset();
            let insertCallCount = 0;
            mockTx.insert.mockImplementation(() => {
                insertCallCount++;
                if (insertCallCount === 3) {
                    throw new Error('Message insert failed');
                }
                return {
                    values: jest.fn().mockReturnValue({
                        returning: jest.fn().mockReturnValue({
                            execute: jest.fn().mockResolvedValue([
                                {
                                    messageId: 100,
                                    content: '',
                                    role: 'assistant',
                                },
                            ]),
                        }),
                        execute: jest.fn().mockResolvedValue(undefined),
                    }),
                };
            });
            await expect(importIncomingMessage({
                tx: mockTx,
                context: mockContext,
                params: mockParams,
            })).rejects.toThrow('Message insert failed');
        });
    });
    describe('Integration Tests', () => {
        it('should handle complete workflow with tool calls', async () => {
            const complexParams = {
                prompt: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant.',
                    },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Search for recent news about AI' },
                        ],
                    },
                    {
                        role: 'assistant',
                        content: [
                            {
                                type: 'tool-call',
                                toolCallId: 'search-1',
                                toolName: 'web_search',
                                input: { query: 'recent AI news' },
                            },
                        ],
                    },
                    {
                        role: 'tool',
                        content: [
                            {
                                type: 'tool-result',
                                toolCallId: 'search-1',
                                toolName: 'web_search',
                                output: { type: 'text', value: 'Found 10 articles about AI' },
                            },
                        ],
                    },
                    {
                        role: 'assistant',
                        content: [
                            {
                                type: 'text',
                                text: 'Based on my search, here are the latest AI developments...',
                            },
                        ],
                    },
                ],
            };
            mockGetNextSequence.mockReset();
            mockGetNextSequence
                .mockResolvedValueOnce([5])
                .mockResolvedValueOnce([50, 51, 52, 53, 54, 55]);
            const result = await importIncomingMessage({
                tx: mockTx,
                context: mockContext,
                params: complexParams,
            });
            expect(result.chatId).toBe('chat-456');
            expect(result.turnId).toBe(5);
            expect(result.nextMessageOrder).toBe(6);
        });
    });
});
//# sourceMappingURL=import-incoming-message.test.js.map