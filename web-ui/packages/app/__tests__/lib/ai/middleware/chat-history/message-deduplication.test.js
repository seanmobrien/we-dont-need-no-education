import { getNewMessages } from '@/lib/ai/middleware/chat-history/utility';
describe('Message Deduplication', () => {
    let mockTx;
    let mockOrderBy;
    beforeEach(() => {
        mockOrderBy = jest.fn().mockResolvedValue([]);
        const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
        const theLeftJoin = {
            where: mockWhere,
            select: jest.fn(),
            leftJoin: jest.fn(),
        };
        const mockLeftJoin = jest.fn().mockReturnValue(theLeftJoin);
        const mockFrom = jest
            .fn()
            .mockReturnValue({ where: mockWhere, leftJoin: mockLeftJoin });
        const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });
        theLeftJoin.leftJoin.mockReturnValue(theLeftJoin);
        theLeftJoin.select.mockReturnValue({ from: mockFrom });
        mockTx = {
            select: mockSelect,
        };
    });
    describe('getNewMessages', () => {
        it('should return all messages when chat has no existing messages', async () => {
            const chatId = 'chat-123';
            const incomingMessages = [
                { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
                { role: 'assistant', content: [{ type: 'text', text: 'Hi there!' }] },
            ];
            mockOrderBy.mockResolvedValue([]);
            const result = await getNewMessages(mockTx, chatId, incomingMessages);
            expect(result).toEqual(incomingMessages);
            expect(result).toHaveLength(2);
        });
        it('should filter out duplicate messages', async () => {
            const chatId = 'chat-123';
            const incomingMessages = [
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
                    content: [{ type: 'text', text: 'How are you?' }],
                },
            ];
            const existingMessages = [
                { role: 'user', content: 'Hello', messageOrder: 1 },
                { role: 'assistant', content: 'Hi there!', messageOrder: 2 },
            ];
            mockOrderBy.mockResolvedValue(existingMessages);
            const result = await getNewMessages(mockTx, chatId, incomingMessages);
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                role: 'user',
                content: [{ type: 'text', text: 'How are you?' }],
            });
        });
        it('should handle complex content structures', async () => {
            const chatId = 'chat-123';
            const complexContent = [
                { type: 'text', text: 'Hello with metadata' },
            ];
            const incomingMessages = [
                { role: 'user', content: complexContent },
                {
                    role: 'user',
                    content: [{ type: 'text', text: 'Simple text message' }],
                },
            ];
            const existingMessages = [
                {
                    role: 'user',
                    content: JSON.stringify(complexContent),
                    messageOrder: 1,
                },
            ];
            mockOrderBy.mockResolvedValue(existingMessages);
            const result = await getNewMessages(mockTx, chatId, incomingMessages);
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                role: 'user',
                content: [{ type: 'text', text: 'Simple text message' }],
            });
        });
        it('should return empty array when all messages already exist', async () => {
            const chatId = 'chat-123';
            const incomingMessages = [
                {
                    role: 'user',
                    content: [{ type: 'text', text: 'Hello' }],
                },
                {
                    role: 'assistant',
                    content: [{ type: 'text', text: 'Hi there!' }],
                },
            ];
            const existingMessages = [
                { role: 'user', content: 'Hello', messageOrder: 1 },
                { role: 'assistant', content: 'Hi there!', messageOrder: 2 },
            ];
            mockOrderBy.mockResolvedValue(existingMessages);
            const result = await getNewMessages(mockTx, chatId, incomingMessages);
            expect(result).toHaveLength(0);
            expect(result).toEqual([]);
        });
        it('should handle mixed content types correctly', async () => {
            const chatId = 'chat-123';
            const incomingMessages = [
                {
                    role: 'user',
                    content: [{ type: 'text', text: 'Text message' }],
                },
                {
                    role: 'assistant',
                    content: [{ type: 'text', text: 'Complex' }],
                },
                {
                    role: 'user',
                    content: [{ type: 'text', text: 'New message' }],
                },
            ];
            const existingMessages = [
                { role: 'user', content: 'Text message', messageOrder: 1 },
                {
                    role: 'assistant',
                    content: '[{"type":"text","text":"Complex"}]',
                    messageOrder: 2,
                },
            ];
            mockOrderBy.mockResolvedValue(existingMessages);
            const result = await getNewMessages(mockTx, chatId, incomingMessages);
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                role: 'user',
                content: [{ type: 'text', text: 'New message' }],
            });
        });
        it('should be case sensitive for content comparison', async () => {
            const chatId = 'chat-123';
            const incomingMessages = [
                {
                    role: 'user',
                    content: [{ type: 'text', text: 'Hello' }],
                },
                {
                    role: 'user',
                    content: [{ type: 'text', text: 'hello' }],
                },
            ];
            const existingMessages = [
                { role: 'user', content: 'Hello', messageOrder: 1 },
            ];
            mockOrderBy.mockResolvedValue(existingMessages);
            const result = await getNewMessages(mockTx, chatId, incomingMessages);
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                role: 'user',
                content: [{ type: 'text', text: 'hello' }],
            });
        });
        it('should handle role differences correctly', async () => {
            const chatId = 'chat-123';
            const incomingMessages = [
                {
                    role: 'user',
                    content: [{ type: 'text', text: 'Hello' }],
                },
                {
                    role: 'assistant',
                    content: [{ type: 'text', text: 'Hello' }],
                },
            ];
            const existingMessages = [
                { role: 'user', content: 'Hello', messageOrder: 1 },
            ];
            mockOrderBy.mockResolvedValue(existingMessages);
            const result = await getNewMessages(mockTx, chatId, incomingMessages);
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                role: 'assistant',
                content: [{ type: 'text', text: 'Hello' }],
            });
        });
    });
});
//# sourceMappingURL=message-deduplication.test.js.map