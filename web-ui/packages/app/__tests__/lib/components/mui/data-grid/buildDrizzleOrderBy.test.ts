/**
 * @jest-environment node
 */

/**
 * @fileoverview Unit tests for buildDrizzleOrderBy function
 *
 * Tests cover all aspects of the buildDrizzleOrderBy function including:
 * - Different source types (URL, string, GridSortModel, NextRequest)
 * - Column mapping functionality
 * - Default sorting behavior
 * - Error handling for unknown columns
 * - Helper functions (createColumnGetter, createTableColumnGetter)
 * - Edge cases and boundary conditions
 *
 * @module __tests__/lib/components/mui/data-grid/buildDrizzleOrderBy.test
 */

import { GridSortModel } from '@mui/x-data-grid';
import { asc, desc, SQL } from 'drizzle-orm';
import { PgColumn } from 'drizzle-orm/pg-core';
import {
  buildDrizzleOrderBy,
  createColumnGetter,
  createTableColumnGetter,
} from '@/lib/components/mui/data-grid/queryHelpers/drizzle/buildDrizzleOrderBy';
import type { DrizzleSelectQuery } from '@/lib/components/mui/data-grid/queryHelpers/drizzle/types';
import { NextRequest } from 'next/server';
import { log } from '@compliance-theater/logger';

// Mock logger
const mockLogger = {
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('@compliance-theater/logger');

// Mock Drizzle imports
jest.mock('drizzle-orm', () => ({
  asc: jest.fn((col) => ({ type: 'asc', column: col })),
  desc: jest.fn((col) => ({ type: 'desc', column: col })),
  sql: jest.fn((template, ...values) => ({ type: 'sql', template, values })),
}));

// Create mock column objects that resemble Drizzle PgColumn
const createMockColumn = (name: string): PgColumn =>
  ({
    name,
    type: 'column',
    tableName: 'test_table',
    dataType: 'text',
  } as unknown as PgColumn);

// Create mock SQL expression
const createMockSQL = (expression: string): SQL =>
  ({
    type: 'sql',
    expression,
  } as unknown as SQL);

// Mock query builder that tracks orderBy calls
type MockQuery = {
  orderBy: jest.MockedFunction<(...columns: (SQL | PgColumn)[]) => MockQuery>;
  offset: jest.MockedFunction<(value: number) => MockQuery>;
  limit: jest.MockedFunction<(value: number) => MockQuery>;
  where: jest.MockedFunction<(condition: SQL) => MockQuery>;
  prepare: jest.MockedFunction<() => any>;
  execute: jest.MockedFunction<() => any>;
  _: any;
  as: jest.MockedFunction<(alias: string) => any>;
  _orderByCalls: Array<(SQL | PgColumn)[]>;
};

const createMockQuery = (): MockQuery => {
  const query: MockQuery = {
    orderBy: jest.fn(),
    offset: jest.fn(),
    limit: jest.fn(),
    where: jest.fn(),
    prepare: jest.fn(),
    execute: jest.fn(),
    _: {},
    as: jest.fn(),
    _orderByCalls: [],
  };

  // Make orderBy return the same query instance and track calls
  query.orderBy.mockImplementation((...columns) => {
    query._orderByCalls.push(columns);
    return query;
  });

  query.offset.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.where.mockReturnValue(query);
  query.prepare.mockReturnValue({});
  query.execute.mockResolvedValue([]);
  query.as.mockReturnValue(query);

  return query;
};

// Mock columns for testing
const mockColumns = {
  id: createMockColumn('id'),
  name: createMockColumn('name'),
  email: createMockColumn('email'),
  createdAt: createMockColumn('created_at'),
  updatedAt: createMockColumn('updated_at'),
};

// Mock SQL expressions
const mockSQLExpressions = {
  fullName: createMockSQL("CONCAT(first_name, ' ', last_name)"),
  customSort: createMockSQL('custom_expression'),
};

describe('buildDrizzleOrderBy', () => {
  let mockQuery: MockQuery;

  beforeEach(() => {
    // jest.clearAllMocks();
    jest.clearAllMocks();
    (log as jest.Mock).mockImplementation((cb) => cb(mockLogger));
    mockQuery = createMockQuery();
  });

  describe('Basic functionality', () => {
    it('should return original query when no source provided', () => {
      const getColumn = (name: string) =>
        mockColumns[name as keyof typeof mockColumns];

      const result = buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: undefined,
        getColumn,
      });

      expect(result).toBe(mockQuery);
      expect(mockQuery.orderBy).not.toHaveBeenCalled();
    });

    it('should apply default sort when no source provided but defaultSort specified', () => {
      const getColumn = (name: string) =>
        mockColumns[name as keyof typeof mockColumns];

      const result = buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: undefined,
        defaultSort: 'name',
        getColumn,
      });

      expect(result).toBe(mockQuery);
      expect(mockQuery.orderBy).toHaveBeenCalledWith({
        type: 'asc',
        column: mockColumns.name,
      });
    });

    it('should handle empty GridSortModel source', () => {
      const getColumn = (name: string) =>
        mockColumns[name as keyof typeof mockColumns];

      const result = buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: [] as GridSortModel,
        getColumn,
      });

      expect(result).toBe(mockQuery);
      expect(mockQuery.orderBy).not.toHaveBeenCalled();
    });
  });

  describe('GridSortModel source', () => {
    it('should handle single column ascending sort', () => {
      const getColumn = (name: string) =>
        mockColumns[name as keyof typeof mockColumns];
      const sortModel: GridSortModel = [{ field: 'name', sort: 'asc' }];

      const result = buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: sortModel,
        getColumn,
      });

      expect(result).toBe(mockQuery);
      expect(asc).toHaveBeenCalledWith(mockColumns.name);
      expect(mockQuery.orderBy).toHaveBeenCalledWith({
        type: 'asc',
        column: mockColumns.name,
      });
    });

    it('should handle single column descending sort', () => {
      const getColumn = (name: string) =>
        mockColumns[name as keyof typeof mockColumns];
      const sortModel: GridSortModel = [{ field: 'email', sort: 'desc' }];

      buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: sortModel,
        getColumn,
      });

      expect(desc).toHaveBeenCalledWith(mockColumns.email);
      expect(mockQuery.orderBy).toHaveBeenCalledWith({
        type: 'desc',
        column: mockColumns.email,
      });
    });

    it('should handle multiple column sorts', () => {
      const getColumn = (name: string) =>
        mockColumns[name as keyof typeof mockColumns];
      const sortModel: GridSortModel = [
        { field: 'name', sort: 'asc' },
        { field: 'email', sort: 'desc' },
        { field: 'createdAt', sort: 'asc' },
      ];

      buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: sortModel,
        getColumn,
      });

      expect(mockQuery.orderBy).toHaveBeenCalledWith(
        { type: 'asc', column: mockColumns.name },
        { type: 'desc', column: mockColumns.email },
        { type: 'asc', column: mockColumns.createdAt }
      );
    });

    it('should skip unknown columns and log warnings', () => {
      const getColumn = (name: string) =>
        name === 'name' ? mockColumns.name : undefined;

      const sortModel: GridSortModel = [
        { field: 'name', sort: 'asc' },
        { field: 'unknown_column', sort: 'desc' },
        { field: 'another_unknown', sort: 'asc' },
      ];

      buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: sortModel,
        getColumn,
      });

      expect(mockQuery.orderBy).toHaveBeenCalledWith({
        type: 'asc',
        column: mockColumns.name,
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "buildDrizzleOrderBy: Unknown column 'unknown_column' (mapped from 'unknown_column')"
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "buildDrizzleOrderBy: Unknown column 'another_unknown' (mapped from 'another_unknown')"
      );
    });

    it('should return original query when all columns are unknown', () => {
      const getColumn = () => undefined;
      const sortModel: GridSortModel = [
        { field: 'unknown1', sort: 'asc' },
        { field: 'unknown2', sort: 'desc' },
      ];

      const result = buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: sortModel,
        getColumn,
      });

      expect(result).toBe(mockQuery);
      expect(mockQuery.orderBy).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    });
  });

  describe('URL and string sources', () => {
    it('should parse sort from URL string', () => {
      const getColumn = (name: string) =>
        mockColumns[name as keyof typeof mockColumns];
      const urlString = 'https://example.com/api/data?sort=name:asc,email:desc';

      buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: urlString,
        getColumn,
      });

      expect(mockQuery.orderBy).toHaveBeenCalledWith(
        { type: 'asc', column: mockColumns.name },
        { type: 'desc', column: mockColumns.email }
      );
    });

    it('should parse sort from URL object', () => {
      const getColumn = (name: string) =>
        mockColumns[name as keyof typeof mockColumns];
      const url = new URL('https://example.com/api/data?sort=createdAt:desc');

      buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: url,
        getColumn,
      });

      expect(mockQuery.orderBy).toHaveBeenCalledWith({
        type: 'desc',
        column: mockColumns.createdAt,
      });
    });

    it('should handle URL with no sort parameter', () => {
      const getColumn = (name: string) =>
        mockColumns[name as keyof typeof mockColumns];
      const url = new URL('https://example.com/api/data');

      const result = buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: url,
        defaultSort: 'id',
        getColumn,
      });

      expect(result).toBe(mockQuery);
      expect(mockQuery.orderBy).toHaveBeenCalledWith({
        type: 'asc',
        column: mockColumns.id,
      });
    });

    it('should handle URL with empty sort parameter', () => {
      const getColumn = (name: string) =>
        mockColumns[name as keyof typeof mockColumns];
      const url = new URL('https://example.com/api/data?sort=');

      const result = buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: url,
        defaultSort: 'name',
        getColumn,
      });

      expect(result).toBe(mockQuery);
      expect(mockQuery.orderBy).toHaveBeenCalledWith({
        type: 'asc',
        column: mockColumns.name,
      });
    });
  });

  describe('NextRequest source', () => {
    it('should parse sort from NextRequest', () => {
      const getColumn = (name: string) =>
        mockColumns[name as keyof typeof mockColumns];
      const request = new NextRequest(
        'https://example.com/api/data?sort=email:desc'
      );

      buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: request,
        getColumn,
      });

      expect(mockQuery.orderBy).toHaveBeenCalledWith({
        type: 'desc',
        column: mockColumns.email,
      });
    });

    it('should handle NextRequest with no url', () => {
      const getColumn = (name: string) =>
        mockColumns[name as keyof typeof mockColumns];
      const request = { url: undefined } as unknown as NextRequest; // Mock NextRequest without url

      const result = buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: request,
        defaultSort: 'id',
        getColumn,
      });

      expect(result).toBe(mockQuery);
      expect(mockQuery.orderBy).toHaveBeenCalledWith({
        type: 'asc',
        column: mockColumns.id,
      });
    });
  });

  describe('Column mapping', () => {
    it('should apply column mapping with object map', () => {
      const getColumn = (name: string) =>
        mockColumns[name as keyof typeof mockColumns];
      const columnMap = {
        display_name: 'name',
        user_email: 'email',
      };

      const sortModel: GridSortModel = [
        { field: 'display_name', sort: 'asc' },
        { field: 'user_email', sort: 'desc' },
      ];

      buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: sortModel,
        columnMap,
        getColumn,
      });

      expect(mockQuery.orderBy).toHaveBeenCalledWith(
        { type: 'asc', column: mockColumns.name },
        { type: 'desc', column: mockColumns.email }
      );
    });

    it('should apply column mapping with function map', () => {
      const getColumn = (name: string) =>
        mockColumns[name as keyof typeof mockColumns];
      const columnMap = (field: string) => {
        const mapping: Record<string, string> = {
          frontend_name: 'name',
          frontend_email: 'email',
        };
        return mapping[field] || field;
      };

      const sortModel: GridSortModel = [
        { field: 'frontend_name', sort: 'desc' },
      ];

      buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: sortModel,
        columnMap,
        getColumn,
      });

      expect(mockQuery.orderBy).toHaveBeenCalledWith({
        type: 'desc',
        column: mockColumns.name,
      });
    });

    it('should log warning with mapped column names', () => {
      const getColumn = () => undefined; // All columns unknown
      const columnMap = { frontend_field: 'backend_field' };

      const sortModel: GridSortModel = [
        { field: 'frontend_field', sort: 'asc' },
      ];

      buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: sortModel,
        columnMap,
        getColumn,
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "buildDrizzleOrderBy: Unknown column 'backend_field' (mapped from 'frontend_field')"
      );
    });
  });

  describe('Default sort handling', () => {
    it('should handle string default sort', () => {
      const getColumn = (name: string) =>
        mockColumns[name as keyof typeof mockColumns];

      buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: undefined,
        defaultSort: 'email',
        getColumn,
      });

      expect(mockQuery.orderBy).toHaveBeenCalledWith({
        type: 'asc',
        column: mockColumns.email,
      });
    });

    it('should handle GridSortModel default sort', () => {
      const getColumn = (name: string) =>
        mockColumns[name as keyof typeof mockColumns];
      const defaultSort: GridSortModel = [
        { field: 'name', sort: 'desc' },
        { field: 'email', sort: 'asc' },
      ];

      buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: undefined,
        defaultSort,
        getColumn,
      });

      expect(mockQuery.orderBy).toHaveBeenCalledWith(
        { type: 'desc', column: mockColumns.name },
        { type: 'asc', column: mockColumns.email }
      );
    });

    it('should handle SQL expression default sort', () => {
      const getColumn = () => undefined; // Not used for SQL expressions
      const sqlExpression = mockSQLExpressions.fullName;

      buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: undefined,
        defaultSort: sqlExpression,
        getColumn,
      });

      expect(mockQuery.orderBy).toHaveBeenCalledWith({
        type: 'asc',
        column: sqlExpression,
      });
    });

    it('should handle PgColumn default sort', () => {
      const getColumn = () => undefined; // Not used for direct columns
      const column = mockColumns.createdAt;

      buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: undefined,
        defaultSort: column,
        getColumn,
      });

      expect(mockQuery.orderBy).toHaveBeenCalledWith({
        type: 'asc',
        column: column,
      });
    });

    it('should apply column mapping to string default sort', () => {
      const getColumn = (name: string) =>
        mockColumns[name as keyof typeof mockColumns];
      const columnMap = { display_field: 'name' };

      buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: undefined,
        defaultSort: 'display_field',
        columnMap,
        getColumn,
      });

      expect(mockQuery.orderBy).toHaveBeenCalledWith({
        type: 'asc',
        column: mockColumns.name,
      });
    });

    it('should log warning for unknown default sort column', () => {
      const getColumn = () => undefined;

      const result = buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: undefined,
        defaultSort: 'unknown_column',
        getColumn,
      });

      expect(result).toBe(mockQuery);
      expect(mockQuery.orderBy).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "buildDrizzleOrderBy: Unknown default sort column 'unknown_column' (mapped from 'unknown_column')"
      );
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle malformed sort URL gracefully', () => {
      const getColumn = (name: string) =>
        mockColumns[name as keyof typeof mockColumns];
      // This will create an invalid URL, which should be handled gracefully

      expect(() => {
        buildDrizzleOrderBy({
          query: mockQuery as unknown as DrizzleSelectQuery,
          source: 'not-a-valid-url',
          defaultSort: 'name',
          getColumn,
        });
      }).not.toThrow();
    });

    it('should prioritize source sort over default sort', () => {
      const getColumn = (name: string) =>
        mockColumns[name as keyof typeof mockColumns];
      const sortModel: GridSortModel = [{ field: 'email', sort: 'desc' }];

      buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: sortModel,
        defaultSort: 'name',
        getColumn,
      });

      expect(mockQuery.orderBy).toHaveBeenCalledWith({
        type: 'desc',
        column: mockColumns.email,
      });
      expect(mockQuery.orderBy).not.toHaveBeenCalledWith({
        type: 'asc',
        column: mockColumns.name,
      });
    });

    it('should handle getColumn function that throws errors', () => {
      const getColumn = () => {
        throw new Error('Column getter error');
      };

      expect(() => {
        buildDrizzleOrderBy({
          query: mockQuery as unknown as DrizzleSelectQuery,
          source: [{ field: 'name', sort: 'asc' }],
          getColumn,
        });
      }).toThrow('Column getter error');
    });

    it('should handle null/undefined column results', () => {
      const getColumn = (name: string) =>
        name === 'valid' ? mockColumns.name : (null as unknown as PgColumn);

      const sortModel: GridSortModel = [
        { field: 'valid', sort: 'asc' },
        { field: 'invalid', sort: 'desc' },
      ];

      buildDrizzleOrderBy({
        query: mockQuery as unknown as DrizzleSelectQuery,
        source: sortModel,
        getColumn,
      });

      expect(mockQuery.orderBy).toHaveBeenCalledWith({
        type: 'asc',
        column: mockColumns.name,
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "buildDrizzleOrderBy: Unknown column 'invalid' (mapped from 'invalid')"
      );
    });
  });
});

describe('createColumnGetter', () => {
  it('should create a getter that returns correct columns', () => {
    const columns = {
      id: mockColumns.id,
      name: mockColumns.name,
      email: mockColumns.email,
    };

    const getColumn = createColumnGetter(columns);

    expect(getColumn('id')).toBe(mockColumns.id);
    expect(getColumn('name')).toBe(mockColumns.name);
    expect(getColumn('email')).toBe(mockColumns.email);
    expect(getColumn('unknown')).toBeUndefined();
  });

  it('should handle SQL expressions in column map', () => {
    const columns = {
      name: mockColumns.name,
      full_name: mockSQLExpressions.fullName,
    };

    const getColumn = createColumnGetter(columns);

    expect(getColumn('name')).toBe(mockColumns.name);
    expect(getColumn('full_name')).toBe(mockSQLExpressions.fullName);
  });

  it('should return undefined for missing columns', () => {
    const columns = {
      name: mockColumns.name,
    };

    const getColumn = createColumnGetter(columns);

    expect(getColumn('missing')).toBeUndefined();
    expect(getColumn('')).toBeUndefined();
  });
});

describe('createTableColumnGetter', () => {
  const mockTable = {
    id: mockColumns.id,
    name: mockColumns.name,
    email: mockColumns.email,
    createdAt: mockColumns.createdAt,
    created_at: mockColumns.createdAt, // snake_case version
    updatedAt: mockColumns.updatedAt,
    nonColumnProperty: 'not a column',
    anotherNonColumn: 123,
  };

  it('should get columns by exact property name', () => {
    const getColumn = createTableColumnGetter(mockTable);

    expect(getColumn('id')).toBe(mockColumns.id);
    expect(getColumn('name')).toBe(mockColumns.name);
    expect(getColumn('email')).toBe(mockColumns.email);
  });

  it('should handle camelCase to snake_case conversion', () => {
    const getColumn = createTableColumnGetter(mockTable);

    expect(getColumn('created_at')).toBe(mockColumns.createdAt);
    expect(getColumn('createdAt')).toBe(mockColumns.createdAt);
  });

  it('should handle snake_case to camelCase conversion', () => {
    const getColumn = createTableColumnGetter(mockTable);

    expect(getColumn('updated_at')).toBe(mockColumns.updatedAt);
    expect(getColumn('updatedAt')).toBe(mockColumns.updatedAt);
  });

  it('should prioritize custom mappings over automatic conversions', () => {
    const customColumn = createMockColumn('custom');
    const customMappings = {
      name: customColumn,
    };

    const getColumn = createTableColumnGetter(mockTable, customMappings);

    expect(getColumn('name')).toBe(customColumn);
    expect(getColumn('email')).toBe(mockColumns.email); // Should still work for non-custom
  });

  it('should handle SQL expressions in custom mappings', () => {
    const customMappings = {
      full_name: mockSQLExpressions.fullName,
    };

    const getColumn = createTableColumnGetter(mockTable, customMappings);

    expect(getColumn('full_name')).toBe(mockSQLExpressions.fullName);
    expect(getColumn('name')).toBe(mockColumns.name);
  });

  it('should return undefined for non-object properties', () => {
    const getColumn = createTableColumnGetter(mockTable);

    expect(getColumn('nonColumnProperty')).toBeUndefined();
    expect(getColumn('anotherNonColumn')).toBeUndefined();
  });

  it('should return undefined for missing properties', () => {
    const getColumn = createTableColumnGetter(mockTable);

    expect(getColumn('missing')).toBeUndefined();
    expect(getColumn('')).toBeUndefined();
    expect(getColumn('unknown_field')).toBeUndefined();
  });

  it('should handle empty custom mappings', () => {
    const getColumn = createTableColumnGetter(mockTable, {});

    expect(getColumn('name')).toBe(mockColumns.name);
    expect(getColumn('email')).toBe(mockColumns.email);
  });

  it('should handle complex field name conversions', () => {
    const complexTable = {
      firstName: createMockColumn('first_name'),
      first_name: createMockColumn('first_name'),
      'user-email': createMockColumn('user_email'), // This won't be found automatically
    };

    const getColumn = createTableColumnGetter(complexTable);

    expect(getColumn('firstName')).toBe(complexTable.firstName);
    expect(getColumn('first_name')).toBe(complexTable.first_name);
    expect(getColumn('user-email')).toBeUndefined(); // Dashes not handled
  });
});

describe('Integration tests', () => {
  it('should work end-to-end with realistic data', () => {
    const mockQuery = createMockQuery();

    // Simulate a realistic table schema
    const userTable = {
      id: createMockColumn('id'),
      firstName: createMockColumn('first_name'),
      lastName: createMockColumn('last_name'),
      email: createMockColumn('email'),
      createdAt: createMockColumn('created_at'),
      updatedAt: createMockColumn('updated_at'),
    };

    // Create column getter with custom mappings
    const getColumn = createTableColumnGetter(userTable, {
      full_name: createMockSQL("CONCAT(first_name, ' ', last_name)"),
      display_name: userTable.firstName,
    });

    // Column mapping for frontend to backend
    const columnMap = {
      name: 'firstName',
      created: 'createdAt',
      modified: 'updatedAt',
    };

    // Test with URL source
    const url =
      'https://api.example.com/users?sort=name:asc,email:desc,created:asc';

    buildDrizzleOrderBy({
      query: mockQuery as unknown as DrizzleSelectQuery,
      source: url,
      columnMap,
      getColumn,
    });

    expect(mockQuery.orderBy).toHaveBeenCalledWith(
      { type: 'asc', column: userTable.firstName },
      { type: 'desc', column: userTable.email },
      { type: 'asc', column: userTable.createdAt }
    );
  });

  it('should handle mixed column types (regular columns and SQL expressions)', () => {
    const mockQuery = createMockQuery();

    const getColumn = (name: string) => {
      switch (name) {
        case 'name':
          return mockColumns.name;
        case 'email':
          return mockColumns.email;
        case 'full_name':
          return mockSQLExpressions.fullName;
        case 'created_at':
          return mockColumns.createdAt;
        default:
          return undefined;
      }
    };

    const sortModel: GridSortModel = [
      { field: 'full_name', sort: 'asc' },
      { field: 'email', sort: 'desc' },
      { field: 'created_at', sort: 'asc' },
    ];

    buildDrizzleOrderBy({
      query: mockQuery as unknown as DrizzleSelectQuery,
      source: sortModel,
      getColumn,
    });

    expect(mockQuery.orderBy).toHaveBeenCalledWith(
      { type: 'asc', column: mockSQLExpressions.fullName },
      { type: 'desc', column: mockColumns.email },
      { type: 'asc', column: mockColumns.createdAt }
    );
  });

  it('should maintain query chain fluency', () => {
    const mockQuery = createMockQuery();
    const getColumn = (name: string) =>
      mockColumns[name as keyof typeof mockColumns];

    const result = buildDrizzleOrderBy({
      query: mockQuery as unknown as DrizzleSelectQuery,
      source: [{ field: 'name', sort: 'asc' }],
      getColumn,
    });

    // Should return the same query instance for chaining
    expect(result).toBe(mockQuery);

    // Should be able to chain additional operations
    (result as any).limit(10).offset(20);

    expect(mockQuery.limit).toHaveBeenCalledWith(10);
    expect(mockQuery.offset).toHaveBeenCalledWith(20);
  });
});
