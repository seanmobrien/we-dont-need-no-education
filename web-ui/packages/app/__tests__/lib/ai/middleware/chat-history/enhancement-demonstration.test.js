import { getNewMessages } from '@/lib/ai/middleware/chat-history/utility';
describe('Chat History Enhancement Demonstration', () => {
    let mockTx;
    beforeEach(() => {
        const whereOrderBy = {
            leftJoin: jest.fn(),
            where: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockReturnValue([]),
            }),
        };
        whereOrderBy.leftJoin.mockReturnValue(whereOrderBy);
        mockTx = {
            select: jest.fn().mockReturnValue({
                from: jest.fn().mockReturnValue(whereOrderBy),
            }),
        };
    });
    it('demonstrates the enhancement: only new messages are saved', async () => {
        const existingMessages = [
            {
                role: 'user',
                content: [{ type: 'text', text: 'Hello' }],
                messageOrder: 1,
            },
            {
                role: 'assistant',
                content: [{ type: 'text', text: 'Hi there!' }],
                messageOrder: 2,
            },
        ];
        const turn2Messages = [
            {
                role: 'user',
                content: [{ type: 'text', text: 'Hello' }],
            },
            {
                role: 'assistant',
                content: [{ type: 'text', text: 'Hi there!' }],
            },
            {
                role: 'user',
                content: [{ type: 'text', text: 'How can you help me?' }],
            },
        ];
        mockTx.select().from().where().orderBy.mockResolvedValue(existingMessages);
        const newMessages = await getNewMessages(mockTx, 'chat-123', turn2Messages);
        expect(newMessages).toHaveLength(1);
        expect(newMessages[0]).toEqual({
            role: 'user',
            content: [{ type: 'text', text: 'How can you help me?' }],
        });
    });
    it('shows the enhancement gracefully handles empty and new chats', async () => {
        const newChatMessages = [
            {
                role: 'user',
                content: [{ type: 'text', text: 'First message ever' }],
            },
            {
                role: 'assistant',
                content: [{ type: 'text', text: 'Welcome! How can I help?' }],
            },
        ];
        mockTx.select().from().where().orderBy.mockResolvedValue([]);
        const newMessages = await getNewMessages(mockTx, 'new-chat-456', newChatMessages);
        expect(newMessages).toHaveLength(2);
        expect(newMessages).toEqual(newChatMessages);
    });
    it('validates the enhancement is content and role aware', async () => {
        const existingMessages = [
            {
                role: 'user',
                content: [{ type: 'text', text: 'Hello world' }],
                messageOrder: 1,
            },
        ];
        const mixedMessages = [
            {
                role: 'user',
                content: [{ type: 'text', text: 'Hello world' }],
            },
            {
                role: 'assistant',
                content: [{ type: 'text', text: 'Hello world' }],
            },
            {
                role: 'user',
                content: [{ type: 'text', text: 'Hello World' }],
            },
            {
                role: 'user',
                content: [{ type: 'text', text: 'Hello world!' }],
            },
        ];
        mockTx.select().from().where().orderBy.mockResolvedValue(existingMessages);
        const newMessages = await getNewMessages(mockTx, 'chat-789', mixedMessages);
        expect(newMessages).toHaveLength(3);
        expect(newMessages.map((m) => {
            const textContent = Array.isArray(m.content)
                ? m.content
                    .filter((part) => part.type === 'text')
                    .map((part) => 'content' in part
                    ? part.content
                    : 'text' in part
                        ? part.text
                        : '')
                    .join('')
                : m.content;
            return `${m.role}:${textContent}`;
        })).toEqual([
            'assistant:Hello world',
            'user:Hello World',
            'user:Hello world!',
        ]);
    });
});
//# sourceMappingURL=enhancement-demonstration.test.js.map