/**
 * @fileoverview Unit tests for chat history utility functions
 *
 * These tests verify the behavior of utility functions used throughout
 * the chat history middleware, particularly the getNextSequence function
 * for generating scoped IDs.
 *
 * @module __tests__/lib/ai/middleware/chat-history/utility.test.ts
 */

import { getNextSequence } from '@/lib/ai/middleware/chat-history/utility';
import { drizDb } from '@/lib/drizzle-db';
import type { DbDatabaseType, DbTransactionType } from '@/lib/drizzle-db';

let mockDb: jest.Mocked<DbDatabaseType>;

const mockTx = {
  execute: jest.fn(),
} as unknown as jest.Mocked<DbTransactionType>;

describe('Chat History Utility Functions', () => {
  beforeEach(() => {
    // jest.clearAllMocks();
    mockDb = drizDb() as jest.Mocked<DbDatabaseType>;

    /*
    mockDb.execute.mockImplementation((query: string | SQLWrapper) => {
      // Mock implementation to return a predictable sequence of IDs      
      const match = String(query).match(/allocate_scoped_ids\('(\w+)', '(\w+)', (\d+), (\d+)\)/);
      if (match) {
        const count = parseInt(match[4], 10);
        const ret = Array.from({ length: count }, () => ({
          allocate_scoped_ids: ++idCounter,
        })) as any;
        ret.find = jest.fn();
        const check = jest.fn(() =>));
        return Promise.resolve(
          ret as PgRaw<RowList<Record<string, unknown>[]>>
        );
      }
      return Promise.reject(new Error('Invalid query'));
    });
    */
  });

  describe('getNextSequence', () => {
    beforeEach(() => {
      mockDb = drizDb() as jest.Mocked<DbDatabaseType>;
      mockDb.execute.mockResolvedValue([{ allocate_scoped_ids: 1 }] as any);
    });

    describe('chat_turns table', () => {
      it('should generate single turn ID', async () => {
        // Arrange
        const chatId = 'chat-123';
        const expectedId = 1;
        mockDb.execute.mockResolvedValue([
          { allocate_scoped_ids: expectedId },
        ] as any);

        // Act
        const result = await getNextSequence({
          chatId,
          tableName: 'chat_turns',
        });

        // Assert
        expect(result).toEqual([expectedId]);
        expect(mockDb.execute).toHaveBeenCalledWith(
          `SELECT * FROM allocate_scoped_ids('chat_turns', '${chatId}', 0, 1)`,
        );
      });

      it('should generate multiple turn IDs', async () => {
        // Arrange
        const chatId = 'chat-456';
        const count = 3;
        const expectedIds = [1, 2, 3];
        mockDb.execute.mockResolvedValue(
          expectedIds.map((id) => ({ allocate_scoped_ids: id })) as any,
        );

        // Act
        const result = await getNextSequence({
          chatId,
          tableName: 'chat_turns',
          count,
        });

        // Assert
        expect(result).toEqual(expectedIds);
        expect(mockDb.execute).toHaveBeenCalledWith(
          `SELECT * FROM allocate_scoped_ids('chat_turns', '${chatId}', 0, ${count})`,
        );
      });

      it('should use provided transaction', async () => {
        // Arrange
        const chatId = 'chat-789';
        const expectedId = 5;
        mockTx.execute.mockResolvedValue([
          { allocate_scoped_ids: expectedId },
        ] as any);

        // Act
        const result = await getNextSequence({
          chatId,
          tableName: 'chat_turns',
          tx: mockTx,
        });

        // Assert
        expect(result).toEqual([expectedId]);
        expect(mockTx.execute).toHaveBeenCalledWith(
          `SELECT * FROM allocate_scoped_ids('chat_turns', '${chatId}', 0, 1)`,
        );
        expect(mockDb.execute).not.toHaveBeenCalled();
      });

      it('should handle zero count correctly', async () => {
        // Arrange
        const chatId = 'chat-zero';
        mockDb.execute.mockResolvedValue([] as any);

        // Act
        const result = await getNextSequence({
          chatId,
          tableName: 'chat_turns',
          count: 0,
        });

        // Assert
        expect(result).toEqual([]);
        expect(mockDb.execute).toHaveBeenCalledWith(
          `SELECT * FROM allocate_scoped_ids('chat_turns', '${chatId}', 0, 0)`,
        );
      });
    });

    describe('chat_messages table', () => {
      it('should generate single message ID with turnId', async () => {
        // Arrange
        const chatId = 'chat-123';
        const turnId = 2;
        const expectedId = 10;
        mockDb.execute.mockResolvedValue([
          { allocate_scoped_ids: expectedId },
        ] as any);

        // Act
        const result = await getNextSequence({
          chatId,
          tableName: 'chat_messages',
          turnId,
        });

        // Assert
        expect(result).toEqual([expectedId]);
        expect(mockDb.execute).toHaveBeenCalledWith(
          `SELECT * FROM allocate_scoped_ids('chat_messages', '${chatId}', ${turnId}, 1)`,
        );
      });

      it('should generate multiple message IDs', async () => {
        // Arrange
        const chatId = 'chat-456';
        const turnId = 3;
        const count = 5;
        const expectedIds = [11, 12, 13, 14, 15];
        mockDb.execute.mockResolvedValue(
          expectedIds.map((id) => ({ allocate_scoped_ids: id })) as any,
        );

        // Act
        const result = await getNextSequence({
          chatId,
          tableName: 'chat_messages',
          turnId,
          count,
        });

        // Assert
        expect(result).toEqual(expectedIds);
        expect(mockDb.execute).toHaveBeenCalledWith(
          `SELECT * FROM allocate_scoped_ids('chat_messages', '${chatId}', ${turnId}, ${count})`,
        );
      });

      it('should use provided transaction for messages', async () => {
        // Arrange
        const chatId = 'chat-789';
        const turnId = 1;
        const expectedId = 20;
        mockTx.execute.mockResolvedValue([
          { allocate_scoped_ids: expectedId },
        ] as any);

        // Act
        const result = await getNextSequence({
          chatId,
          tableName: 'chat_messages',
          turnId,
          tx: mockTx,
        });

        // Assert
        expect(result).toEqual([expectedId]);
        expect(mockTx.execute).toHaveBeenCalledWith(
          `SELECT * FROM allocate_scoped_ids('chat_messages', '${chatId}', ${turnId}, 1)`,
        );
        expect(mockDb.execute).not.toHaveBeenCalled();
      });

      it('should handle large count values', async () => {
        // Arrange
        const chatId = 'chat-large';
        const turnId = 1;
        const count = 100;
        const expectedIds = Array.from({ length: count }, (_, i) => i + 1);
        mockDb.execute.mockResolvedValue(
          expectedIds.map((id) => ({ allocate_scoped_ids: id })) as any,
        );

        // Act
        const result = await getNextSequence({
          chatId,
          tableName: 'chat_messages',
          turnId,
          count,
        });

        // Assert
        expect(result).toEqual(expectedIds);
        expect(result).toHaveLength(count);
        expect(mockDb.execute).toHaveBeenCalledWith(
          `SELECT * FROM allocate_scoped_ids('chat_messages', '${chatId}', ${turnId}, ${count})`,
        );
      });
    });

    describe('error handling', () => {
      it('should propagate database errors for chat_turns', async () => {
        // Arrange
        const chatId = 'chat-error';
        const dbError = new Error('Database connection failed');
        mockDb.execute.mockRejectedValue(dbError);

        // Act & Assert
        await expect(
          getNextSequence({
            chatId,
            tableName: 'chat_turns',
          }),
        ).rejects.toThrow('Database connection failed');
      });

      it('should propagate database errors for chat_messages', async () => {
        // Arrange
        const chatId = 'chat-error';
        const turnId = 1;
        const dbError = new Error('Invalid turnId');
        mockDb.execute.mockRejectedValue(dbError);

        // Act & Assert
        await expect(
          getNextSequence({
            chatId,
            tableName: 'chat_messages',
            turnId,
          }),
        ).rejects.toThrow('Invalid turnId');
      });

      it('should propagate transaction errors', async () => {
        // Arrange
        const chatId = 'chat-tx-error';
        const txError = new Error('Transaction rolled back');
        mockTx.execute.mockRejectedValue(txError);

        // Act & Assert
        await expect(
          getNextSequence({
            chatId,
            tableName: 'chat_turns',
            tx: mockTx,
          }),
        ).rejects.toThrow('Transaction rolled back');
      });
    });

    describe('edge cases', () => {
      it('should handle empty chatId', async () => {
        // Arrange
        const chatId = '';
        const expectedId = 1;
        mockDb.execute.mockResolvedValue([
          { allocate_scoped_ids: expectedId },
        ] as any);

        // Act
        const result = await getNextSequence({
          chatId,
          tableName: 'chat_turns',
        });

        // Assert
        expect(result).toEqual([expectedId]);
        expect(mockDb.execute).toHaveBeenCalledWith(
          `SELECT * FROM allocate_scoped_ids('chat_turns', '', 0, 1)`,
        );
      });

      it('should handle special characters in chatId', async () => {
        // Arrange
        const chatId = "chat-with-'quotes-and-special-chars";
        const expectedId = 1;
        mockDb.execute.mockResolvedValue([
          { allocate_scoped_ids: expectedId },
        ] as any);

        // Act
        const result = await getNextSequence({
          chatId,
          tableName: 'chat_turns',
        });

        // Assert
        expect(result).toEqual([expectedId]);
        expect(mockDb.execute).toHaveBeenCalledWith(
          `SELECT * FROM allocate_scoped_ids('chat_turns', '${chatId}', 0, 1)`,
        );
      });

      it('should handle zero turnId for messages', async () => {
        // Arrange
        const chatId = 'chat-zero-turn';
        const turnId = 0;
        const expectedId = 1;
        mockDb.execute.mockResolvedValue([
          { allocate_scoped_ids: expectedId },
        ] as any);

        // Act
        const result = await getNextSequence({
          chatId,
          tableName: 'chat_messages',
          turnId,
        });

        // Assert
        expect(result).toEqual([expectedId]);
        expect(mockDb.execute).toHaveBeenCalledWith(
          `SELECT * FROM allocate_scoped_ids('chat_messages', '${chatId}', 0, 1)`,
        );
      });

      it('should handle malformed database response', async () => {
        // Arrange
        const chatId = 'chat-malformed';
        mockDb.execute.mockResolvedValue([
          { wrong_field: 123 },
        ] as unknown as any);

        // Act
        const result = await getNextSequence({
          chatId,
          tableName: 'chat_turns',
        });

        // Assert
        expect(result).toEqual([undefined]);
      });

      it('should handle empty database response', async () => {
        // Arrange
        const chatId = 'chat-empty';
        mockDb.execute.mockResolvedValue([] as any);

        // Act
        const result = await getNextSequence({
          chatId,
          tableName: 'chat_turns',
        });

        // Assert
        expect(result).toEqual([]);
      });
    });

    describe('type safety', () => {
      it('should enforce turnId requirement for chat_messages', () => {
        // This test ensures TypeScript compilation catches missing turnId
        // The following would cause a TypeScript error:
        // getNextSequence({ chatId: 'test', tableName: 'chat_messages' })

        // This should compile correctly:
        const validCall = getNextSequence({
          chatId: 'test',
          tableName: 'chat_messages',
          turnId: 1,
        });

        expect(validCall).toBeDefined();
      });

      it('should not require turnId for chat_turns', () => {
        // This should compile correctly without turnId:
        const validCall = getNextSequence({
          chatId: 'test',
          tableName: 'chat_turns',
        });

        expect(validCall).toBeDefined();
      });
    });
  });
});
