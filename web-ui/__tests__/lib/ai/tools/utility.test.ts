// Mock the database connection

const mockDb = {
  query: {
    documentUnits: {
      findFirst: jest.fn(() => Promise.resolve(1)),
      findMany: jest.fn(),
    },
  },
};
/*
const actualDrizzle = jest.requireActual('drizzle-orm/postgres-js');
const actualSchema = jest.requireActual('@/lib/drizzle-db/schema');
const mockDb = actualDrizzle.drizzle.mock({ actualSchema });
*/
jest.mock('@/lib/drizzle-db', () => ({
  db: mockDb,
}));

// Mock LoggedError
jest.mock('@/lib/react-util', () => ({
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn(),
  },
}));

import {
  resolveCaseFileId,
  resolveCaseFileIdBatch,
} from '@/lib/ai/tools/utility';
// import { db } from '@/lib/drizzle-db';
import { LoggedError } from '@/lib/react-util';

const mockLoggedError = LoggedError as jest.Mocked<typeof LoggedError>;

describe('resolveCaseFileId', () => {
  beforeEach(() => {
    // jest.clearAllMocks();
  });

  describe('when documentId is a number', () => {
    it('should return the number as-is', async () => {
      const result = await resolveCaseFileId(123);
      expect(result).toBe(123);
      expect(mockDb.query.documentUnits.findFirst).not.toHaveBeenCalled();
    });

    it('should handle zero', async () => {
      const result = await resolveCaseFileId(0);
      expect(result).toBe(0);
    });

    it('should handle negative numbers', async () => {
      const result = await resolveCaseFileId(-1);
      expect(result).toBe(-1);
    });
  });

  describe('when documentId is a valid UUID string', () => {
    const validUuid = '12345678-1234-4567-8901-123456789012';

    it('should query database and return unitId when found by emailId', async () => {
      const mockResult = { unitId: 456 };
      (mockDb.query.documentUnits.findFirst as jest.Mock).mockResolvedValue(
        mockResult,
      );

      const result = await resolveCaseFileId(validUuid);

      expect(result).toBe(456);
      expect(mockDb.query.documentUnits.findFirst).toHaveBeenCalledWith({
        where: expect.any(Function),
        columns: { unitId: true },
      });
    });

    it('should query database and return unitId when found by documentPropertyId', async () => {
      const mockResult = { unitId: 789 };
      (mockDb.query.documentUnits.findFirst as jest.Mock).mockResolvedValue(
        mockResult,
      );

      const result = await resolveCaseFileId(validUuid);

      expect(result).toBe(789);
    });

    it('should return undefined when no record is found', async () => {
      (mockDb.query.documentUnits.findFirst as jest.Mock).mockResolvedValue(
        undefined,
      );

      const result = await resolveCaseFileId(validUuid);

      expect(result).toBeUndefined();
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      (mockDb.query.documentUnits.findFirst as jest.Mock).mockRejectedValue(
        dbError,
      );

      const result = await resolveCaseFileId(validUuid);

      expect(result).toBeUndefined();
      expect(mockLoggedError.isTurtlesAllTheWayDownBaby).toHaveBeenCalledWith(
        dbError,
        {
          log: true,
          source: 'resolveCaseFileId',
          message:
            'Error querying for case file ID - validate document ID format',
          include: { documentId: validUuid },
        },
      );
    });
  });

  describe('when documentId is a numeric string', () => {
    it('should parse valid numeric string', async () => {
      const result = await resolveCaseFileId('123');
      expect(result).toBe(123);
      expect(
        mockDb.query.documentUnits.findFirst as jest.Mock,
      ).not.toHaveBeenCalled();
    });

    it('should handle string with leading zeros', async () => {
      const result = await resolveCaseFileId('0123');
      expect(result).toBe(123);
    });

    it('should return undefined for invalid numeric string', async () => {
      const result = await resolveCaseFileId('abc123');
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty string', async () => {
      const result = await resolveCaseFileId('');
      expect(result).toBeUndefined();
    });

    it('should return undefined for string with only spaces', async () => {
      const result = await resolveCaseFileId('   ');
      expect(result).toBeUndefined();
    });
  });

  describe('when documentId is invalid', () => {
    it('should return undefined for null', async () => {
      const result = await resolveCaseFileId(null as unknown as string);
      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined', async () => {
      const result = await resolveCaseFileId(undefined as unknown as string);
      expect(result).toBeUndefined();
    });

    it('should return undefined for object', async () => {
      const result = await resolveCaseFileId({} as unknown as string);
      expect(result).toBeUndefined();
    });

    it('should return undefined for array', async () => {
      const result = await resolveCaseFileId([] as unknown as string);
      expect(result).toBeUndefined();
    });
  });

  describe('UUID validation edge cases', () => {
    it('should handle invalid UUID format', async () => {
      const invalidUuid = '12345678-1234-5678-9012-123456789012'; // version 5, not 4
      const result = await resolveCaseFileId(invalidUuid);
      // Since it's not a valid UUID, it will try parseInt which returns 12345678
      expect(result).toBe(undefined);
      expect(mockDb.query.documentUnits.findFirst).not.toHaveBeenCalled();
    });

    it('should handle UUID with wrong length', async () => {
      const shortUuid = '12345678-1234-4567-8901-12345678901';
      const result = await resolveCaseFileId(shortUuid);
      // Since it's not a valid UUID, it will try parseInt which returns 12345678
      expect(result).toBe(undefined);
    });

    it('should handle UUID with invalid characters', async () => {
      const invalidUuid = '12345678-1234-4567-8901-12345678901G';
      const result = await resolveCaseFileId(invalidUuid);
      // Since it's not a valid UUID, it will try parseInt which returns 12345678
      expect(result).toBe(undefined);
    });
  });
});

describe('resolveCaseFileIdBatch', () => {
  beforeEach(() => {
    // jest.clearAllMocks();
  });

  describe('with empty input', () => {
    it('should return empty array for empty input', async () => {
      const result = await resolveCaseFileIdBatch([]);
      expect(result).toEqual([]);
      expect(mockDb.query.documentUnits.findMany).not.toHaveBeenCalled();
    });
  });

  describe('with only numeric inputs', () => {
    it('should return all numeric IDs as-is', async () => {
      const requests = [
        { case_file_id: 123 },
        { case_file_id: 456 },
        { case_file_id: 789 },
      ];

      const result = await resolveCaseFileIdBatch(requests);

      expect(result).toEqual([
        { case_file_id: 123 },
        { case_file_id: 456 },
        { case_file_id: 789 },
      ]);
      expect(mockDb.query.documentUnits.findMany).not.toHaveBeenCalled();
    });
  });

  describe('with only string numeric inputs', () => {
    it('should parse and return numeric values', async () => {
      const requests = [
        { case_file_id: '123' },
        { case_file_id: '456' },
        { case_file_id: '789' },
      ];

      const result = await resolveCaseFileIdBatch(requests);

      expect(result).toEqual([
        { case_file_id: 123 },
        { case_file_id: 456 },
        { case_file_id: 789 },
      ]);
      expect(mockDb.query.documentUnits.findMany).not.toHaveBeenCalled();
    });
  });

  describe('with UUID inputs', () => {
    const uuid1 = '12345678-1234-4567-8901-123456789012';
    const uuid2 = '87654321-4321-4321-8901-210987654321';

    it('should resolve UUIDs from database', async () => {
      const requests = [{ case_file_id: uuid1 }, { case_file_id: uuid2 }];

      const mockRecords = [
        { unitId: 100, documentPropertyId: uuid1, emailId: null },
        { unitId: 200, documentPropertyId: null, emailId: uuid2 },
      ];

      (mockDb.query.documentUnits.findMany as jest.Mock).mockResolvedValue(
        mockRecords,
      );

      const result = await resolveCaseFileIdBatch(requests);

      expect(result).toEqual([{ case_file_id: 100 }, { case_file_id: 200 }]);

      expect(mockDb.query.documentUnits.findMany).toHaveBeenCalledWith({
        where: expect.any(Function),
        columns: {
          unitId: true,
          documentPropertyId: true,
          emailId: true,
        },
      });
    });

    it('should handle UUIDs not found in database', async () => {
      const requests = [{ case_file_id: uuid1 }, { case_file_id: uuid2 }];

      (mockDb.query.documentUnits.findMany as jest.Mock).mockResolvedValue([]);

      const result = await resolveCaseFileIdBatch(requests);

      expect(result).toEqual([]);
    });

    it('should handle partial matches from database', async () => {
      const requests = [{ case_file_id: uuid1 }, { case_file_id: uuid2 }];

      const mockRecords = [
        { unitId: 100, documentPropertyId: uuid1, emailId: null },
      ];

      (mockDb.query.documentUnits.findMany as jest.Mock).mockResolvedValue(
        mockRecords,
      );

      const result = await resolveCaseFileIdBatch(requests);

      expect(result).toEqual([{ case_file_id: 100 }]);
    });
  });

  describe('with mixed input types', () => {
    it('should handle combination of numbers, numeric strings, and UUIDs', async () => {
      const uuid = '12345678-1234-4567-8901-123456789012';
      const requests = [
        { case_file_id: 123 }, // number
        { case_file_id: '456' }, // numeric string
        { case_file_id: uuid }, // UUID
        { case_file_id: 789 }, // number
      ];

      const mockRecords = [
        { unitId: 999, documentPropertyId: uuid, emailId: null },
      ];

      (mockDb.query.documentUnits.findMany as jest.Mock).mockResolvedValue(
        mockRecords,
      );

      const result = await resolveCaseFileIdBatch(requests);

      expect(result).toEqual([
        { case_file_id: 123 },
        { case_file_id: 456 },
        { case_file_id: 789 },
        { case_file_id: 999 },
      ]);
    });

    it('should filter out invalid inputs', async () => {
      const requests = [
        { case_file_id: 123 }, // valid number
        { case_file_id: 'invalid' }, // invalid string
        { case_file_id: null as unknown as string }, // invalid type
        { case_file_id: {} as unknown as string }, // invalid type
        { case_file_id: '456' }, // valid numeric string
      ];

      const result = await resolveCaseFileIdBatch(requests);

      expect(result).toEqual([{ case_file_id: 123 }, { case_file_id: 456 }]);
    });
  });

  describe('database error handling', () => {
    it('should handle database query errors', async () => {
      const uuid = '12345678-1234-4567-8901-123456789012';
      const requests = [{ case_file_id: uuid }];

      (mockDb.query.documentUnits.findMany as jest.Mock).mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Should throw the error since there's no error handling in the batch function
      await expect(resolveCaseFileIdBatch(requests)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle requests with only invalid UUIDs', async () => {
      const requests = [
        { case_file_id: '12345678-1234-5678-9012-123456789012' }, // version 5, not 4
        { case_file_id: 'not-a-uuid' },
      ];

      const result = await resolveCaseFileIdBatch(requests);

      expect(result).toEqual([]);
      expect(mockDb.query.documentUnits.findMany).not.toHaveBeenCalled();
    });

    it('should handle zero and negative numbers', async () => {
      const requests = [
        { case_file_id: 0 },
        { case_file_id: -1 },
        { case_file_id: '-5' },
      ];

      const result = await resolveCaseFileIdBatch(requests);

      expect(result).toEqual([
        { case_file_id: 0 },
        { case_file_id: -1 },
        { case_file_id: -5 },
      ]);
    });

    it('should handle large numbers', async () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      const requests = [
        { case_file_id: largeNumber },
        { case_file_id: largeNumber.toString() },
      ];

      const result = await resolveCaseFileIdBatch(requests);

      expect(result).toEqual([
        { case_file_id: largeNumber },
        { case_file_id: largeNumber },
      ]);
    });
  });
});
