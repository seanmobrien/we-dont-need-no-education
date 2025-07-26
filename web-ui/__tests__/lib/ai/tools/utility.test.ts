/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock the database connection

import { DbDatabaseType, drizDb, drizDbWithInit } from '@/lib/drizzle-db';
/*
const actualDrizzle = jest.requireActual('drizzle-orm/postgres-js');
const actualSchema = jest.requireActual('@/lib/drizzle-db/schema');
const mockDb = actualDrizzle.drizzle.mock({ actualSchema });
*/
let mockDb = drizDb() as jest.Mocked<DbDatabaseType>;

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
import { array } from 'zod';

const mockLoggedError = LoggedError as jest.Mocked<typeof LoggedError>;

describe('resolveCaseFileId', () => {
  beforeEach(() => {
    // jest.clearAllMocks();
    mockDb = drizDb() as jest.Mocked<DbDatabaseType>;
    (mockDb.query.documentUnits.findFirst as jest.Mock).mockImplementation(() => {
      return Promise.resolve(1);
    });    
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
      expect(result).toBe(12345678);
      expect(mockDb.query.documentUnits.findFirst).not.toHaveBeenCalled();
    });

    it('should handle UUID with wrong length', async () => {
      const shortUuid = '12345678-1234-4567-8901-12345678901';
      const result = await resolveCaseFileId(shortUuid);
      // Since it's not a valid UUID, it will try parseInt which returns 12345678
      expect(result).toBe(12345678);
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
    // mockDb.query.documentUnits.findMany.mockClear();
    mockLoggedError.isTurtlesAllTheWayDownBaby.mockClear();
  });

  describe('with empty input', () => {
    beforeEach(() => {
      mockDb = drizDb() as jest.Mocked<DbDatabaseType>;
    });
    it('should return empty array for empty input', async () => {
      const result = await resolveCaseFileIdBatch([]);
      expect(result).toEqual([]);
      expect(mockDb.query.documentUnits.findMany).not.toHaveBeenCalled();
    });
  });

  describe('with only numeric inputs', () => {
    beforeEach(() => {
      mockDb = drizDb() as jest.Mocked<DbDatabaseType>;
    });
    it('should return all numeric IDs as-is', async () => {
      const requests = [
        { caseFileId: 123 },
        { caseFileId: 456 },
        { caseFileId: 789 },
      ];

      const result = await resolveCaseFileIdBatch(requests);

      expect(result).toEqual([
        { caseFileId: 123 },
        { caseFileId: 456 },
        { caseFileId: 789 },
      ]);
      expect(mockDb.query.documentUnits.findMany).not.toHaveBeenCalled();
    });
  });

  describe('with only string numeric inputs', () => {
    beforeEach(() => {
      mockDb = drizDb() as jest.Mocked<DbDatabaseType>;
    });
    it('should parse and return numeric values', async () => {
      const requests = [
        { caseFileId: '123' },
        { caseFileId: '456' },
        { caseFileId: '789' },
      ];

      const result = await resolveCaseFileIdBatch(requests);

      expect(result).toEqual([
        { caseFileId: 123 },
        { caseFileId: 456 },
        { caseFileId: 789 },
      ]);
      expect(mockDb.query.documentUnits.findMany).not.toHaveBeenCalled();
    });
  });

  describe('with UUID inputs', () => {
    const uuid1 = '12345678-1234-4567-8901-123456789012';
    const uuid2 = '87654321-4321-4321-8901-210987654321';

    const setupMockRecords = (source: Array<{ unitId: number; documentPropertyId?: string | null; emailId?: string | null }>) => {
      mockDb = drizDb() as jest.Mocked<DbDatabaseType>;
      const mockRecords = [...source];
      
      // Mock drizDbWithInit to return the mockDb and resolve with the records
      (drizDbWithInit as jest.Mock).mockImplementation((cb?: (db: DbDatabaseType) => any) => {
        if (cb) {
          const result = cb(mockDb);
          return Promise.resolve(result);
        }
        return Promise.resolve(mockDb);
      });
      
      // Setup the findMany mock on the mockDb
      (mockDb.query.documentUnits.findMany as jest.Mock).mockReturnValue({
        execute: jest.fn().mockResolvedValue(mockRecords)
      });
      
      return mockRecords;
    }

    it('should resolve UUIDs from database', async () => {
      const requests = [{ caseFileId: uuid1 }, { caseFileId: uuid2 }];

      setupMockRecords(
        [
          { unitId: 100, documentPropertyId: uuid1, emailId: null },
          { unitId: 200, documentPropertyId: null, emailId: uuid2 },
        ]
      )
      const result = await resolveCaseFileIdBatch(requests);

      expect(result).toEqual([{ caseFileId: 100 }, { caseFileId: 200 }]);

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
      const requests = [{ caseFileId: uuid1 }, { caseFileId: uuid2 }];

      setupMockRecords([]);

      const result = await resolveCaseFileIdBatch(requests);

      expect(result).toEqual([]);
    });

    it('should handle partial matches from database', async () => {
      const requests = [{ caseFileId: uuid1 }, { caseFileId: uuid2 }];
      setupMockRecords([
        { unitId: 100, documentPropertyId: uuid1, emailId: null },
      ]);

      const result = await resolveCaseFileIdBatch(requests);

      expect(result).toEqual([{ caseFileId: 100 }]);
    });
  });

  describe('with mixed input types', () => {
    beforeEach(() => {
      mockDb = drizDb() as jest.Mocked<DbDatabaseType>;
    });
    it('should handle combination of numbers, numeric strings, and UUIDs', async () => {
      const uuid = '12345678-1234-4567-8901-123456789012';
      const requests = [
        { caseFileId: 123 }, // number
        { caseFileId: '456' }, // numeric string
        { caseFileId: uuid }, // UUID
        { caseFileId: 789 }, // number
        { caseFileId: 999 }, // number
      ];

      // Mock drizDbWithInit for this test
      (drizDbWithInit as jest.Mock).mockImplementation((cb?: (db: DbDatabaseType) => any) => {
        if (cb) {
          const result = cb(mockDb);
          return Promise.resolve(result);
        }
        return Promise.resolve(mockDb);
      });

      const mockRecords = [
        { unitId: 999, documentPropertyId: uuid, emailId: null },
      ];

      (mockDb.query.documentUnits.findMany as jest.Mock).mockReturnValue({
        execute: jest.fn().mockResolvedValue(mockRecords)
      });

      const result = await resolveCaseFileIdBatch(requests);

      expect(result).toEqual([
        { caseFileId: 123 },
        { caseFileId: 456 },
        { caseFileId: 789 },
        { caseFileId: 999 }, // Last 999 is original number, UUID resolves to 999 too
        { caseFileId: 999 }, // UUID resolved to 999
      ]);
    });

    it('should filter out invalid inputs', async () => {
      const requests = [
        { caseFileId: 123 }, // valid number
        { caseFileId: 'invalid' }, // invalid string
        { caseFileId: null as unknown as string }, // invalid type
        { caseFileId: {} as unknown as string }, // invalid type
        { caseFileId: '456' }, // valid numeric string
      ];

      const result = await resolveCaseFileIdBatch(requests);

      expect(result).toEqual([{ caseFileId: 123 }, { caseFileId: 456 }]);
    });
  });

  describe('database error handling', () => {
    beforeEach(() => {
      mockDb = drizDb() as jest.Mocked<DbDatabaseType>;
    });
    it('should handle database query errors', async () => {
      const uuid = '12345678-1234-4567-8901-123456789012';
      const requests = [{ caseFileId: uuid }];

      // Mock drizDbWithInit to reject with the error
      (drizDbWithInit as jest.Mock).mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Should throw the error since there's no error handling in the batch function
      await expect(resolveCaseFileIdBatch(requests)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('edge cases', () => {
      
    beforeEach(() => {
      mockDb = drizDb() as jest.Mocked<DbDatabaseType>;
    });
    it('should handle requests with only invalid UUIDs', async () => {
      const requests = [
        { caseFileId: '12345678-1234-5678-9012-123456789012' }, // version 5, not 4
        { caseFileId: 'not-a-uuid' },
      ];

      const result = await resolveCaseFileIdBatch(requests);

      expect(result).toEqual([]);
      expect(mockDb.query.documentUnits.findMany).not.toHaveBeenCalled();
    });

    it('should handle zero and negative numbers', async () => {
      const requests = [
        { caseFileId: 0 },
        { caseFileId: -1 },
        { caseFileId: '-5' },
      ];

      const result = await resolveCaseFileIdBatch(requests);

      expect(result).toEqual([
        { caseFileId: 0 },
        { caseFileId: -1 },
        { caseFileId: -5 },
      ]);
    });

    it('should handle large numbers', async () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      const requests = [
        { caseFileId: largeNumber },
        { caseFileId: largeNumber.toString() },
      ];

      const result = await resolveCaseFileIdBatch(requests);

      expect(result).toEqual([
        { caseFileId: largeNumber },
        { caseFileId: largeNumber },
      ]);
    });
  });
});
