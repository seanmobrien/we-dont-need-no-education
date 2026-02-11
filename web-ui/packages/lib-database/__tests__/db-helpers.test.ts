import { getDocumentRelationReason } from '../src/orm/db-helpers';

// Mock the database
const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  execute: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
} as any;

describe('Database Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDocumentRelationReason', () => {
    it('should return reason ID when reason is already a number', async () => {
      const result = await getDocumentRelationReason({
        db: mockDb,
        reason: 42,
        add: true,
      });

      expect(result).toBe(42);
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should return undefined for null reason', async () => {
      const result = await getDocumentRelationReason({
        db: mockDb,
        reason: null,
        add: true,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined reason', async () => {
      const result = await getDocumentRelationReason({
        db: mockDb,
        reason: undefined,
        add: true,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined for empty string reason', async () => {
      const result = await getDocumentRelationReason({
        db: mockDb,
        reason: '',
        add: true,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined for whitespace-only reason', async () => {
      const result = await getDocumentRelationReason({
        db: mockDb,
        reason: '   ',
        add: true,
      });

      expect(result).toBeUndefined();
    });

    it('should look up existing reason by normalized name', async () => {
      mockDb.execute.mockResolvedValueOnce([{ id: 123, reason: 'duplicate' }]);

      const result = await getDocumentRelationReason({
        db: mockDb,
        reason: 'Duplicate',
        add: true,
      });

      expect(result).toBe(123);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should normalize reason to lowercase', async () => {
      mockDb.execute.mockResolvedValueOnce([{ id: 123, reason: 'related' }]);

      await getDocumentRelationReason({
        db: mockDb,
        reason: 'RELATED',
        add: true,
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should create new reason when not found and add is true', async () => {
      // First call to check if exists returns empty
      mockDb.execute.mockResolvedValueOnce([]);
      // Second call to insert returns the new ID
      mockDb.execute.mockResolvedValueOnce([{ id: 999 }]);

      const result = await getDocumentRelationReason({
        db: mockDb,
        reason: 'new-reason',
        add: true,
      });

      expect(result).toBe(999);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalled();
    });

    it('should not create new reason when not found and add is false', async () => {
      mockDb.execute.mockResolvedValueOnce([]);

      const result = await getDocumentRelationReason({
        db: mockDb,
        reason: 'non-existent',
        add: false,
      });

      expect(result).toBeUndefined();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockDb.execute.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        getDocumentRelationReason({
          db: mockDb,
          reason: 'test',
          add: true,
        })
      ).rejects.toThrow();
    });

    it('should trim whitespace from reason', async () => {
      mockDb.execute.mockResolvedValueOnce([{ id: 456, reason: 'trimmed' }]);

      await getDocumentRelationReason({
        db: mockDb,
        reason: '  trimmed  ',
        add: true,
      });

      expect(mockDb.select).toHaveBeenCalled();
    });
  });
});
