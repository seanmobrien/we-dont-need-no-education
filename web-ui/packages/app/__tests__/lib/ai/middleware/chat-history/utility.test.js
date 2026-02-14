import { getNextSequence } from '@/lib/ai/middleware/chat-history/utility';
import { drizDb } from '@compliance-theater/database/orm';
let mockDb;
const mockTx = {
    execute: jest.fn(),
};
describe('Chat History Utility Functions', () => {
    beforeEach(() => {
        mockDb = drizDb();
    });
    describe('getNextSequence', () => {
        beforeEach(() => {
            mockDb = drizDb();
            mockDb.execute.mockResolvedValue([{ allocate_scoped_ids: 1 }]);
        });
        describe('chat_turns table', () => {
            it('should generate single turn ID', async () => {
                const chatId = 'chat-123';
                const expectedId = 1;
                mockDb.execute.mockResolvedValue([
                    { allocate_scoped_ids: expectedId },
                ]);
                const result = await getNextSequence({
                    chatId,
                    tableName: 'chat_turns',
                });
                expect(result).toEqual([expectedId]);
                expect(mockDb.execute).toHaveBeenCalledWith(`SELECT * FROM allocate_scoped_ids('chat_turns', '${chatId}', 0, 1)`);
            });
            it('should generate multiple turn IDs', async () => {
                const chatId = 'chat-456';
                const count = 3;
                const expectedIds = [1, 2, 3];
                mockDb.execute.mockResolvedValue(expectedIds.map((id) => ({ allocate_scoped_ids: id })));
                const result = await getNextSequence({
                    chatId,
                    tableName: 'chat_turns',
                    count,
                });
                expect(result).toEqual(expectedIds);
                expect(mockDb.execute).toHaveBeenCalledWith(`SELECT * FROM allocate_scoped_ids('chat_turns', '${chatId}', 0, ${count})`);
            });
            it('should use provided transaction', async () => {
                const chatId = 'chat-789';
                const expectedId = 5;
                mockTx.execute.mockResolvedValue([
                    { allocate_scoped_ids: expectedId },
                ]);
                const result = await getNextSequence({
                    chatId,
                    tableName: 'chat_turns',
                    tx: mockTx,
                });
                expect(result).toEqual([expectedId]);
                expect(mockTx.execute).toHaveBeenCalledWith(`SELECT * FROM allocate_scoped_ids('chat_turns', '${chatId}', 0, 1)`);
                expect(mockDb.execute).not.toHaveBeenCalled();
            });
            it('should handle zero count correctly', async () => {
                const chatId = 'chat-zero';
                mockDb.execute.mockResolvedValue([]);
                const result = await getNextSequence({
                    chatId,
                    tableName: 'chat_turns',
                    count: 0,
                });
                expect(result).toEqual([]);
                expect(mockDb.execute).toHaveBeenCalledWith(`SELECT * FROM allocate_scoped_ids('chat_turns', '${chatId}', 0, 0)`);
            });
        });
        describe('chat_messages table', () => {
            it('should generate single message ID with turnId', async () => {
                const chatId = 'chat-123';
                const turnId = 2;
                const expectedId = 10;
                mockDb.execute.mockResolvedValue([
                    { allocate_scoped_ids: expectedId },
                ]);
                const result = await getNextSequence({
                    chatId,
                    tableName: 'chat_messages',
                    turnId,
                });
                expect(result).toEqual([expectedId]);
                expect(mockDb.execute).toHaveBeenCalledWith(`SELECT * FROM allocate_scoped_ids('chat_messages', '${chatId}', ${turnId}, 1)`);
            });
            it('should generate multiple message IDs', async () => {
                const chatId = 'chat-456';
                const turnId = 3;
                const count = 5;
                const expectedIds = [11, 12, 13, 14, 15];
                mockDb.execute.mockResolvedValue(expectedIds.map((id) => ({ allocate_scoped_ids: id })));
                const result = await getNextSequence({
                    chatId,
                    tableName: 'chat_messages',
                    turnId,
                    count,
                });
                expect(result).toEqual(expectedIds);
                expect(mockDb.execute).toHaveBeenCalledWith(`SELECT * FROM allocate_scoped_ids('chat_messages', '${chatId}', ${turnId}, ${count})`);
            });
            it('should use provided transaction for messages', async () => {
                const chatId = 'chat-789';
                const turnId = 1;
                const expectedId = 20;
                mockTx.execute.mockResolvedValue([
                    { allocate_scoped_ids: expectedId },
                ]);
                const result = await getNextSequence({
                    chatId,
                    tableName: 'chat_messages',
                    turnId,
                    tx: mockTx,
                });
                expect(result).toEqual([expectedId]);
                expect(mockTx.execute).toHaveBeenCalledWith(`SELECT * FROM allocate_scoped_ids('chat_messages', '${chatId}', ${turnId}, 1)`);
                expect(mockDb.execute).not.toHaveBeenCalled();
            });
            it('should handle large count values', async () => {
                const chatId = 'chat-large';
                const turnId = 1;
                const count = 100;
                const expectedIds = Array.from({ length: count }, (_, i) => i + 1);
                mockDb.execute.mockResolvedValue(expectedIds.map((id) => ({ allocate_scoped_ids: id })));
                const result = await getNextSequence({
                    chatId,
                    tableName: 'chat_messages',
                    turnId,
                    count,
                });
                expect(result).toEqual(expectedIds);
                expect(result).toHaveLength(count);
                expect(mockDb.execute).toHaveBeenCalledWith(`SELECT * FROM allocate_scoped_ids('chat_messages', '${chatId}', ${turnId}, ${count})`);
            });
        });
        describe('error handling', () => {
            it('should propagate database errors for chat_turns', async () => {
                const chatId = 'chat-error';
                const dbError = new Error('Database connection failed');
                mockDb.execute.mockRejectedValue(dbError);
                await expect(getNextSequence({
                    chatId,
                    tableName: 'chat_turns',
                })).rejects.toThrow('Database connection failed');
            });
            it('should propagate database errors for chat_messages', async () => {
                const chatId = 'chat-error';
                const turnId = 1;
                const dbError = new Error('Invalid turnId');
                mockDb.execute.mockRejectedValue(dbError);
                await expect(getNextSequence({
                    chatId,
                    tableName: 'chat_messages',
                    turnId,
                })).rejects.toThrow('Invalid turnId');
            });
            it('should propagate transaction errors', async () => {
                const chatId = 'chat-tx-error';
                const txError = new Error('Transaction rolled back');
                mockTx.execute.mockRejectedValue(txError);
                await expect(getNextSequence({
                    chatId,
                    tableName: 'chat_turns',
                    tx: mockTx,
                })).rejects.toThrow('Transaction rolled back');
            });
        });
        describe('edge cases', () => {
            it('should handle empty chatId', async () => {
                const chatId = '';
                const expectedId = 1;
                mockDb.execute.mockResolvedValue([
                    { allocate_scoped_ids: expectedId },
                ]);
                const result = await getNextSequence({
                    chatId,
                    tableName: 'chat_turns',
                });
                expect(result).toEqual([expectedId]);
                expect(mockDb.execute).toHaveBeenCalledWith(`SELECT * FROM allocate_scoped_ids('chat_turns', '', 0, 1)`);
            });
            it('should handle special characters in chatId', async () => {
                const chatId = "chat-with-'quotes-and-special-chars";
                const expectedId = 1;
                mockDb.execute.mockResolvedValue([
                    { allocate_scoped_ids: expectedId },
                ]);
                const result = await getNextSequence({
                    chatId,
                    tableName: 'chat_turns',
                });
                expect(result).toEqual([expectedId]);
                expect(mockDb.execute).toHaveBeenCalledWith(`SELECT * FROM allocate_scoped_ids('chat_turns', '${chatId}', 0, 1)`);
            });
            it('should handle zero turnId for messages', async () => {
                const chatId = 'chat-zero-turn';
                const turnId = 0;
                const expectedId = 1;
                mockDb.execute.mockResolvedValue([
                    { allocate_scoped_ids: expectedId },
                ]);
                const result = await getNextSequence({
                    chatId,
                    tableName: 'chat_messages',
                    turnId,
                });
                expect(result).toEqual([expectedId]);
                expect(mockDb.execute).toHaveBeenCalledWith(`SELECT * FROM allocate_scoped_ids('chat_messages', '${chatId}', 0, 1)`);
            });
            it('should handle malformed database response', async () => {
                const chatId = 'chat-malformed';
                mockDb.execute.mockResolvedValue([
                    { wrong_field: 123 },
                ]);
                const result = await getNextSequence({
                    chatId,
                    tableName: 'chat_turns',
                });
                expect(result).toEqual([undefined]);
            });
            it('should handle empty database response', async () => {
                const chatId = 'chat-empty';
                mockDb.execute.mockResolvedValue([]);
                const result = await getNextSequence({
                    chatId,
                    tableName: 'chat_turns',
                });
                expect(result).toEqual([]);
            });
        });
        describe('type safety', () => {
            it('should enforce turnId requirement for chat_messages', () => {
                const validCall = getNextSequence({
                    chatId: 'test',
                    tableName: 'chat_messages',
                    turnId: 1,
                });
                expect(validCall).toBeDefined();
            });
            it('should not require turnId for chat_turns', () => {
                const validCall = getNextSequence({
                    chatId: 'test',
                    tableName: 'chat_turns',
                });
                expect(validCall).toBeDefined();
            });
        });
    });
});
//# sourceMappingURL=utility.test.js.map