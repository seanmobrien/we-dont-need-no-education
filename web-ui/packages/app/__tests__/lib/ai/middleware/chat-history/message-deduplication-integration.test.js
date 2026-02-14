jest.unmock('@opentelemetry/api');
jest.unmock('@opentelemetry/sdk-trace-base');
import { setupImpersonationMock } from '@/__tests__/jest.mock-impersonation';
setupImpersonationMock();
import { importIncomingMessage } from '@/lib/ai/middleware/chat-history/import-incoming-message';
import { getNewMessages } from '@/lib/ai/middleware/chat-history/utility';
import { getNextSequence } from '@/lib/ai/middleware/chat-history/utility';
import { generateChatId } from '@/lib/ai/core';
import { log } from '@compliance-theater/logger';
import { createUserChatHistoryContext } from '@/lib/ai/middleware/chat-history/create-chat-history-context';
jest.mock('@/lib/ai/middleware/chat-history/utility');
jest.mock('@/lib/ai/core');
jest.mock('@compliance-theater/logger');
jest.mock('@compliance-theater/database', () => ({
    schema: {
        chats: {
            id: 'mocked-chats-id-column',
            _: { config: { name: 'chats' } },
        },
        chatTurns: {
            _: { config: { name: 'chat_turns' } },
        },
        chatMessages: {
            role: 'mocked-role-column',
            content: 'mocked-content-column',
            messageOrder: 'mocked-order-column',
            chatId: 'mocked-chatid-column',
            _: { config: { name: 'chat_messages' } },
        },
    },
}));
const mockGetNextSequence = getNextSequence;
const mockGetNewMessages = getNewMessages;
const mockGenerateChatId = generateChatId;
const mockLog = log;
describe('Message Deduplication Integration', () => {
    let mockTx;
    let mockContext;
    beforeEach(() => {
        mockTx = {
            select: jest.fn().mockReturnValue({
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        orderBy: jest.fn().mockReturnValue([]),
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
            chatId: 'existing-chat-456',
            model: 'gpt-4o',
            requestId: 'session-789',
        });
        mockGenerateChatId.mockReturnValue({ seed: 1, id: 'generated-chat-id' });
        mockLog.mockImplementation((cb) => cb({
            verbose: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
        }));
        mockGetNextSequence.mockReset();
        mockGetNewMessages.mockReset();
    });
    describe('First conversation turn (all messages new)', () => {
        it('should save all messages in the first turn', async () => {
            const firstTurnMessages = [
                {
                    role: 'user',
                    content: [{ type: 'text', text: 'Hello, how are you?' }],
                    messageOrder: 1,
                },
                {
                    role: 'assistant',
                    content: [
                        { type: 'text', text: 'I am doing well, thank you!' },
                    ],
                    messageOrder: 2,
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'What can you help me with?' },
                    ],
                    messageOrder: 3,
                },
            ];
            const mockParams = {
                prompt: firstTurnMessages,
            };
            mockGetNewMessages.mockResolvedValue(firstTurnMessages);
            mockGetNextSequence
                .mockResolvedValueOnce([1])
                .mockResolvedValueOnce([10, 11, 12, 13]);
            const result = await importIncomingMessage({
                tx: mockTx,
                context: mockContext,
                params: mockParams,
            });
            expect(mockGetNewMessages).toHaveBeenCalledWith(mockTx, 'existing-chat-456', firstTurnMessages, 1);
            expect(mockGetNextSequence).toHaveBeenNthCalledWith(2, {
                tableName: 'chat_messages',
                chatId: 'existing-chat-456',
                turnId: 1,
                count: 3,
                tx: mockTx,
            });
            expect(result.chatId).toBe('existing-chat-456');
            expect(result.turnId).toBe(1);
        });
    });
    describe('Second conversation turn (some messages duplicate)', () => {
        it('should only save new messages in subsequent turns', async () => {
            const secondTurnMessages = [
                {
                    role: 'user',
                    content: [{ type: 'text', text: 'Hello, how are you?' }],
                    messageOrder: 1,
                },
                {
                    role: 'assistant',
                    content: [
                        { type: 'text', text: 'I am doing well, thank you!' },
                    ],
                    messageOrder: 2,
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'What can you help me with?' },
                    ],
                    messageOrder: 3,
                },
                {
                    role: 'user',
                    content: [{ type: 'text', text: 'Can you write a poem?' }],
                    messageOrder: 4,
                },
            ];
            const newMessages = [
                {
                    role: 'user',
                    content: [{ type: 'text', text: 'Can you write a poem?' }],
                },
            ];
            const mockParams = {
                prompt: secondTurnMessages,
            };
            mockGetNewMessages.mockResolvedValue(newMessages);
            mockGetNextSequence
                .mockResolvedValueOnce([2])
                .mockResolvedValueOnce([20, 21]);
            const result = await importIncomingMessage({
                tx: mockTx,
                context: mockContext,
                params: mockParams,
            });
            expect(mockGetNewMessages).toHaveBeenCalledWith(mockTx, 'existing-chat-456', secondTurnMessages, 2);
            expect(mockGetNextSequence).toHaveBeenNthCalledWith(2, {
                tableName: 'chat_messages',
                chatId: 'existing-chat-456',
                turnId: 2,
                count: 1,
                tx: mockTx,
            });
            expect(result.chatId).toBe('existing-chat-456');
            expect(result.turnId).toBe(2);
        });
    });
    describe('Third conversation turn (no new messages)', () => {
        it('should handle turns with no new user messages', async () => {
            const thirdTurnMessages = [
                {
                    role: 'user',
                    content: [{ type: 'text', text: 'Hello, how are you?' }],
                },
                {
                    role: 'assistant',
                    content: [
                        { type: 'text', text: 'I am doing well, thank you!' },
                    ],
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'What can you help me with?' },
                    ],
                },
                {
                    role: 'user',
                    content: [{ type: 'text', text: 'Can you write a poem?' }],
                },
            ];
            const newMessages = [];
            const mockParams = {
                prompt: thirdTurnMessages,
            };
            mockGetNewMessages.mockResolvedValue(newMessages);
            mockGetNextSequence
                .mockResolvedValueOnce([3])
                .mockResolvedValueOnce([30]);
            const result = await importIncomingMessage({
                tx: mockTx,
                context: mockContext,
                params: mockParams,
            });
            expect(mockGetNewMessages).toHaveBeenCalledWith(mockTx, 'existing-chat-456', thirdTurnMessages, 3);
            expect(mockGetNextSequence).toHaveBeenNthCalledWith(1, {
                tableName: 'chat_turns',
                chatId: 'existing-chat-456',
                tx: mockTx,
            });
            expect(result.chatId).toBe('existing-chat-456');
            expect(result.turnId).toBe(3);
        });
    });
    describe('Edge cases', () => {
        it('should handle empty prompt arrays gracefully', async () => {
            const mockParams = {
                prompt: [],
            };
            mockGetNewMessages.mockResolvedValue([]);
            mockGetNextSequence
                .mockResolvedValueOnce([4])
                .mockResolvedValueOnce([40]);
            const result = await importIncomingMessage({
                tx: mockTx,
                context: createUserChatHistoryContext({
                    userId: 'user-123',
                    chatId: 'existing-chat-456',
                    model: 'gpt-4o',
                    requestId: 'session-789',
                }),
                params: mockParams,
            });
            expect(mockGetNewMessages).toHaveBeenCalledWith(mockTx, 'existing-chat-456', [], 4);
            expect(result.chatId).toBe('existing-chat-456');
        });
    });
});
//# sourceMappingURL=message-deduplication-integration.test.js.map