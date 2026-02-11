/**
 * @jest-environment jsdom
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
// it's not worth the effort to try and fix types for all these mocks

jest.mock('@/lib/react-util', () => ({
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn().mockImplementation((error) => {
      // Return a LoggedError that extends Error and can be thrown
      return new Error(error instanceof Error ? error.message : String(error));
    }),
  },
}));

import { drizDbWithInit, drizDb } from '@compliance-theater/database';
import { DrizzleRepositoryConfig } from '@/lib/api/_types';
import { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import {
  FilteredTestDrizzleRepository,
  TestDrizzleRepository,
  TestModel,
} from './target-repositories';
import { DatabaseMockType } from '../jest.setup';
import { hideConsoleOutput } from '@/__tests__/test-utils';

const mockConsole = hideConsoleOutput();

describe('BaseDrizzleRepository', () => {
  let repository: TestDrizzleRepository;
  let mockDb: DatabaseMockType;
  let mockTable: PgTable;
  let mockIdColumn: PgColumn;
  let mockRecordMapper: (record: Record<string, unknown>) => TestModel;
  let mockSummaryMapper: (
    record: Record<string, unknown>,
  ) => Partial<TestModel>;

  beforeEach(async () => {
    // jest.clearAllMocks();
    mockDb = (await drizDbWithInit()).innerMock as DatabaseMockType;
    mockDb.__setRecords([]);

    // Mock table and column
    mockTable = {} as PgTable;
    mockIdColumn = {} as PgColumn;

    // Mock mappers
    mockRecordMapper = jest.fn((record) => ({
      id: record.id as number,
      name: record.name as string,
      description: (record.description as string) || null,
    }));

    mockSummaryMapper = jest.fn((record) => ({
      id: record.id as number,
      name: record.name as string,
    }));

    const config: DrizzleRepositoryConfig<TestModel, 'id'> = {
      table: mockTable,
      idColumn: mockIdColumn,
      recordMapper: mockRecordMapper,
      summaryMapper: mockSummaryMapper,
      tableName: 'test_table',
      idField: 'id',
    };

    repository = new TestDrizzleRepository(config);
  });
  afterEach(() => {
    mockConsole.dispose();
  });

  describe('list', () => {
    it('should return paginated results with default pagination', async () => {
      const mockCountRecord = { count: 5 };
      const mockRecords = [
        { id: 1, name: 'Test 1' },
        { id: 2, name: 'Test 2' },
      ];

      // Mock count query - first select call returns count query
      const mockCountQuery = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            execute: jest.fn().mockResolvedValue([mockCountRecord]),
          }),
          execute: jest.fn().mockResolvedValue([mockCountRecord]),
        }),
        execute: jest.fn().mockResolvedValue([mockCountRecord]),
      };

      // Mock data query - second select call returns data query
      const mockDataQuery = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            offset: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                execute: jest.fn().mockResolvedValue(mockRecords),
              }),
            }),
          }),
          offset: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              execute: jest.fn().mockResolvedValue(mockRecords),
            }),
          }),
        }),
      };

      mockDb.select
        .mockReturnValueOnce(mockCountQuery)
        .mockReturnValueOnce(mockDataQuery);

      const result = await repository.list();

      expect(result).toEqual({
        results: [
          { id: 1, name: 'Test 1' },
          { id: 2, name: 'Test 2' },
        ],
        pageStats: {
          total: 5,
          page: 1,
          num: 10,
        },
      });

      expect(mockSummaryMapper).toHaveBeenCalledTimes(2);
    });

    it('should handle custom pagination parameters', async () => {
      const mockCountRecord = { count: 15 };
      const mockRecords = [{ id: 3, name: 'Test 3' }];

      // Mock count query
      const mockCountQuery = {
        from: jest.fn().mockReturnValue({
          execute: jest.fn().mockResolvedValue([mockCountRecord]),
        }),
        execute: jest.fn().mockResolvedValue([mockCountRecord]),
      };

      // Mock data query
      const mockDataQuery = {
        from: jest.fn().mockReturnValue({
          offset: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              execute: jest.fn().mockResolvedValue(mockRecords),
            }),
          }),
        }),
      };

      mockDb.select
        .mockReturnValueOnce(mockCountQuery)
        .mockReturnValueOnce(mockDataQuery);

      const result = await repository.list({ page: 2, num: 5, total: 15 });

      expect(result.pageStats).toEqual({
        total: 15,
        page: 2,
        num: 5,
      });
    });
  });

  describe('get', () => {
    it('should return a single record when found', async () => {
      const mockRecord = { id: 1, name: 'Test', description: 'Description' };

      const mockSelectQuery = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            execute: jest.fn().mockResolvedValue([mockRecord]),
          }),
        }),
      };

      mockDb.select.mockReturnValue(mockSelectQuery);

      const result = await repository.get(1);

      expect(result).toEqual({
        id: 1,
        name: 'Test',
        description: 'Description',
      });

      expect(mockRecordMapper).toHaveBeenCalledWith(mockRecord);
    });

    it('should return null when record not found', async () => {
      const mockSelectQuery = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            execute: jest.fn().mockResolvedValue([]),
          }),
        }),
      };

      mockDb.select.mockReturnValue(mockSelectQuery);

      const result = await repository.get(999);

      expect(result).toBeNull();
    });

    it('should throw error when multiple records found', async () => {
      mockConsole.setup();
      const mockRecords = [
        { id: 1, name: 'Test 1' },
        { id: 1, name: 'Test 2' },
      ];

      const mockSelectQuery = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            execute: jest.fn().mockResolvedValue(mockRecords),
          }),
        }),
      };

      mockDb.select.mockReturnValue(mockSelectQuery);

      let rejected: unknown | undefined = undefined;
      await repository.get(1).catch((e) => {
        rejected = e;
      });
      expect(rejected).toBeDefined();
    });
  });

  describe('create', () => {
    it('should create and return a new record', async () => {
      const newModel = { name: 'New Test', description: 'New Description' };
      const createdRecord = {
        id: 1,
        name: 'New Test',
        description: 'New Description',
      };

      const mockInsertQuery = {
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([createdRecord]),
        }),
      };

      mockDb.insert.mockReturnValue(mockInsertQuery);

      const result = await repository.create(newModel);

      expect(result).toEqual({
        id: 1,
        name: 'New Test',
        description: 'New Description',
      });

      expect(mockRecordMapper).toHaveBeenCalledWith(createdRecord);
    });

    it('should throw error when create fails', async () => {
      mockConsole.setup();
      const newModel = { name: 'New Test', description: 'New Description' };

      const mockInsertQuery = {
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([]),
        }),
      };

      mockDb.insert.mockReturnValue(mockInsertQuery);
      let rejected: unknown | undefined = undefined;
      await repository.create(newModel).catch((e) => (rejected = e));
      expect(rejected).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update and return the updated record', async () => {
      const updateModel = { id: 1, name: 'Updated Test' };
      const updatedRecord = {
        id: 1,
        name: 'Updated Test',
        description: 'Description',
      };

      const mockUpdateQuery = {
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedRecord]),
          }),
        }),
      };

      mockDb.update.mockReturnValue(mockUpdateQuery);

      const result = await repository.update(updateModel);

      expect(result).toEqual({
        id: 1,
        name: 'Updated Test',
        description: 'Description',
      });

      expect(mockRecordMapper).toHaveBeenCalledWith(updatedRecord);
    });

    it('should throw error when record not found for update', async () => {
      mockConsole.setup();
      const updateModel = { id: 999, name: 'Updated Test' };

      const mockUpdateQuery = {
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      };

      mockDb.update.mockReturnValue(mockUpdateQuery);
      let rejected: unknown | undefined = undefined;
      await repository.update(updateModel).catch((e) => (rejected = e));
      expect(rejected).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete and return true when successful', async () => {
      const deletedRecord = { id: 1, name: 'Test', description: 'Description' };

      const mockDeleteQuery = {
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockReturnValue({
            then: jest.fn().mockImplementation((callback) => {
              return callback([deletedRecord]);
            }),
          }),
        }),
      };

      mockDb.delete.mockReturnValue(mockDeleteQuery);

      const result = await repository.delete(1);

      expect(result).toBe(true);
      expect(mockRecordMapper).toHaveBeenCalledWith(deletedRecord);
    });

    it('should return false when record not found for deletion', async () => {
      const mockDeleteQuery = {
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockReturnValue({
            then: jest.fn().mockImplementation((callback) => {
              return callback([]);
            }),
          }),
        }),
      };

      mockDb.delete.mockReturnValue(mockDeleteQuery);

      const result = await repository.delete(999);

      expect(result).toBe(false);
    });
  });

  describe('innerQuery', () => {
    it('should execute callback with repository instance', () => {
      const mockCallback = jest.fn().mockReturnValue('test result');

      const result = repository.innerQuery(mockCallback);

      expect(result).toBe('test result');
      expect(mockCallback).toHaveBeenCalledWith(repository);
    });
  });

  describe('buildQueryConditions integration', () => {
    it('should apply custom query conditions to both count and data queries', async () => {
      const filteredRepository = new FilteredTestDrizzleRepository(
        {
          table: mockTable,
          idColumn: mockIdColumn,
          recordMapper: mockRecordMapper,
          summaryMapper: mockSummaryMapper,
          tableName: 'test_table',
          idField: 'id',
        },
        'filtered-name',
      );

      const mockCountRecord = { count: 3 };
      const mockRecords = [{ id: 1, name: 'filtered-name' }];

      // Mock count query with where clause
      const mockCountQuery = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            execute: jest.fn().mockResolvedValue([mockCountRecord]),
          }),
        }),
      };

      // Mock data query with where clause
      const mockDataQuery = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            offset: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                execute: jest.fn().mockResolvedValue(mockRecords),
              }),
            }),
          }),
        }),
      };

      mockDb.select
        .mockReturnValueOnce(mockCountQuery)
        .mockReturnValueOnce(mockDataQuery);

      const result = await filteredRepository.list();

      expect(result.pageStats.total).toBe(3);
      expect(result.results).toHaveLength(1);

      // Verify that where() was called on both queries (count and data)
      const selectCalls = mockDb.select.mock.calls;
      expect(selectCalls).toHaveLength(2);
    });

    it('should work without custom conditions (base case)', async () => {
      const mockCountRecord = { count: 2 };
      const mockRecords = [
        { id: 1, name: 'test' },
        { id: 2, name: 'test2' },
      ];

      // Mock count query without where clause
      const mockCountQuery = {
        from: jest.fn().mockReturnValue({
          execute: jest.fn().mockResolvedValue([mockCountRecord]),
        }),
      };

      // Mock data query without where clause
      const mockDataQuery = {
        from: jest.fn().mockReturnValue({
          offset: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              execute: jest.fn().mockResolvedValue(mockRecords),
            }),
          }),
        }),
      };

      mockDb.select
        .mockReturnValueOnce(mockCountQuery)
        .mockReturnValueOnce(mockDataQuery);

      const result = await repository.list();

      expect(result.pageStats.total).toBe(2);
      expect(result.results).toHaveLength(2);
    });
  });
});
