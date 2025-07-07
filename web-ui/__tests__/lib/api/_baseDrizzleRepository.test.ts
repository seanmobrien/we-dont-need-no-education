// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
// it's not worth the effort to try and fix types for all these mocks
// Mock the dependencies
jest.mock('@/lib/drizzle-db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  log: jest.fn(),
}));

jest.mock('@/lib/react-util', () => ({
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn(),
  },
}));

import { BaseDrizzleRepository } from '@/lib/api/_baseDrizzleRepository';
import { DrizzleRepositoryConfig } from '@/lib/api/_types';
import { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import { SQL } from 'drizzle-orm';

// Test model interface
interface TestModel {
  id: number;
  name: string;
  description: string | null;
}

// Concrete implementation for testing
class TestDrizzleRepository extends BaseDrizzleRepository<TestModel, 'id'> {
  constructor(config: DrizzleRepositoryConfig<TestModel, 'id'>) {
    super(config);
  }

  protected prepareInsertData(
    model: Omit<TestModel, 'id'>,
  ): Record<string, unknown> {
    return {
      name: model.name,
      description: model.description,
    };
  }

  protected prepareUpdateData(
    model: Partial<TestModel>,
  ): Record<string, unknown> {
    const updateData: Record<string, unknown> = {};
    if (model.name !== undefined) updateData.name = model.name;
    if (model.description !== undefined)
      updateData.description = model.description;
    return updateData;
  }
}

// Test repository with custom filtering for testing the new buildQueryConditions approach
class FilteredTestDrizzleRepository extends BaseDrizzleRepository<
  TestModel,
  'id'
> {
  constructor(
    config: DrizzleRepositoryConfig<TestModel, 'id'>,
    private nameFilter?: string,
  ) {
    super(config);
  }

  protected buildQueryConditions() {
    if (this.nameFilter) {
      // This would normally use eq(table.name, this.nameFilter) but we'll mock it
      return { mockFilter: this.nameFilter } as unknown as SQL;
    }
    return undefined;
  }

  protected prepareInsertData(
    model: Omit<TestModel, 'id'>,
  ): Record<string, unknown> {
    return {
      name: model.name,
      description: model.description,
    };
  }

  protected prepareUpdateData(
    model: Partial<TestModel>,
  ): Record<string, unknown> {
    const updateData: Record<string, unknown> = {};
    if (model.name !== undefined) updateData.name = model.name;
    if (model.description !== undefined)
      updateData.description = model.description;
    return updateData;
  }
}

describe('BaseDrizzleRepository', () => {
  let repository: TestDrizzleRepository;
  let mockDb: Record<string, unknown>;
  let mockTable: PgTable;
  let mockIdColumn: PgColumn;
  let mockRecordMapper: (record: Record<string, unknown>) => TestModel;
  let mockSummaryMapper: (
    record: Record<string, unknown>,
  ) => Partial<TestModel>;

  beforeEach(() => {
    // jest.clearAllMocks();

    // Mock database
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

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
    (repository as any).db = mockDb;
  });

  describe('list', () => {
    it('should return paginated results with default pagination', async () => {
      const mockCountRecord = { count: 5 };
      const mockRecords = [
        { id: 1, name: 'Test 1' },
        { id: 2, name: 'Test 2' },
      ];

      // Mock the count query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue([mockCountRecord]),
      });

      // Mock the data query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          offset: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue(mockRecords),
          }),
        }),
      });

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

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue([mockCountRecord]),
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          offset: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue(mockRecords),
          }),
        }),
      });

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

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue([mockRecord]),
        }),
      });

      const result = await repository.get(1);

      expect(result).toEqual({
        id: 1,
        name: 'Test',
        description: 'Description',
      });

      expect(mockRecordMapper).toHaveBeenCalledWith(mockRecord);
    });

    it('should return null when record not found', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue([]),
        }),
      });

      const result = await repository.get(999);

      expect(result).toBeNull();
    });

    it('should throw error when multiple records found', async () => {
      const mockRecords = [
        { id: 1, name: 'Test 1' },
        { id: 1, name: 'Test 2' },
      ];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue(mockRecords),
        }),
      });

      await expect(repository.get(1)).rejects.toThrow(
        'Multiple records found for id: 1',
      );
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

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockReturnValue([createdRecord]),
        }),
      });

      const result = await repository.create(newModel);

      expect(result).toEqual({
        id: 1,
        name: 'New Test',
        description: 'New Description',
      });

      expect(mockRecordMapper).toHaveBeenCalledWith(createdRecord);
    });

    it('should throw error when create fails', async () => {
      const newModel = { name: 'New Test', description: 'New Description' };

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockReturnValue([]),
        }),
      });

      await expect(repository.create(newModel)).rejects.toThrow(
        'Failed to create test_table record',
      );
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

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockReturnValue([updatedRecord]),
          }),
        }),
      });

      const result = await repository.update(updateModel);

      expect(result).toEqual({
        id: 1,
        name: 'Updated Test',
        description: 'Description',
      });

      expect(mockRecordMapper).toHaveBeenCalledWith(updatedRecord);
    });

    it('should throw error when record not found for update', async () => {
      const updateModel = { id: 999, name: 'Updated Test' };

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockReturnValue([]),
          }),
        }),
      });

      await expect(repository.update(updateModel)).rejects.toThrow(
        'test_table record not found for update',
      );
    });
  });

  describe('delete', () => {
    it('should delete and return true when successful', async () => {
      const deletedRecord = { id: 1, name: 'Test', description: 'Description' };

      mockDb.delete.mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockReturnValue([deletedRecord]),
        }),
      });

      const result = await repository.delete(1);

      expect(result).toBe(true);
      expect(mockRecordMapper).toHaveBeenCalledWith(deletedRecord);
    });

    it('should return false when record not found for deletion', async () => {
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockReturnValue([]),
        }),
      });

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
      (filteredRepository as Record<string, unknown>).db = mockDb;

      const mockCountRecord = { count: 3 };
      const mockRecords = [{ id: 1, name: 'filtered-name' }];

      // Mock both count and data queries with where clauses
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue([mockCountRecord]),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            offset: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue(mockRecords),
            }),
          }),
        }),
      });

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

      // Mock queries without where clauses
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue([mockCountRecord]),
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          offset: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue(mockRecords),
          }),
        }),
      });

      const result = await repository.list();

      expect(result.pageStats.total).toBe(2);
      expect(result.results).toHaveLength(2);
    });
  });
});
