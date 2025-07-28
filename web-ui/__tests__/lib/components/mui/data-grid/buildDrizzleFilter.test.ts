/**
 * @jest-environment node
 */

/**
 * @fileoverview Unit tests for buildDrizzleFilter functions
 * 
 * Tests cover all aspects of the buildDrizzleFilter functions including:
 * - Different source types (URL, string, GridFilterModel, NextRequest)
 * - Column mapping functionality
 * - Default filtering behavior
 * - Error handling for unknown columns
 * - All filter operators
 * - Edge cases and boundary conditions
 * 
 * @module __tests__/lib/components/mui/data-grid/buildDrizzleFilter.test
 */

import { GridFilterModel, GridFilterItem, GridLogicOperator } from '@mui/x-data-grid-pro';
import { and, or, eq, ne, ilike, isNull, isNotNull, inArray, notInArray, gt, lt, gte, lte, between, notBetween, SQL, sql } from 'drizzle-orm';
import { PgColumn } from 'drizzle-orm/pg-core';
import {
  buildDrizzleAttachmentOrEmailFilter,
  buildDrizzleItemFilter,
  buildDrizzleQueryFilter,
} from '@/lib/components/mui/data-grid/queryHelpers/drizzle/buildDrizzleFilter';
import { NextRequest } from 'next/server';
import { LikeNextRequest } from '@/lib/nextjs-util';

// Mock console.warn to track warning messages
const originalConsoleWarn = console.warn;
const mockConsoleWarn = jest.fn();

// Mock Drizzle imports
jest.mock('drizzle-orm', () => ({
  and: jest.fn((...conditions) => ({ type: 'and', conditions, queryChunks: ['and condition'] })),
  or: jest.fn((...conditions) => ({ type: 'or', conditions, queryChunks: ['or condition'] })),
  eq: jest.fn((col, val) => ({ type: 'eq', column: col, value: val, queryChunks: ['eq condition'] })),
  ne: jest.fn((col, val) => ({ type: 'ne', column: col, value: val, queryChunks: ['ne condition'] })),
  like: jest.fn((col, val) => ({ type: 'like', column: col, value: val, queryChunks: ['like condition'] })),
  ilike: jest.fn((col, val) => ({ type: 'ilike', column: col, value: val, queryChunks: ['ilike condition'] })),
  isNull: jest.fn((col) => ({ type: 'isNull', column: col, queryChunks: ['isNull condition'] })),
  isNotNull: jest.fn((col) => ({ type: 'isNotNull', column: col, queryChunks: ['isNotNull condition'] })),
  inArray: jest.fn((col, val) => ({ type: 'inArray', column: col, value: val, queryChunks: ['inArray condition'] })),
  notInArray: jest.fn((col, val) => ({ type: 'notInArray', column: col, value: val, queryChunks: ['notInArray condition'] })),
  gt: jest.fn((col, val) => ({ type: 'gt', column: col, value: val, queryChunks: ['gt condition'] })),
  lt: jest.fn((col, val) => ({ type: 'lt', column: col, value: val, queryChunks: ['lt condition'] })),
  gte: jest.fn((col, val) => ({ type: 'gte', column: col, value: val, queryChunks: ['gte condition'] })),
  lte: jest.fn((col, val) => ({ type: 'lte', column: col, value: val, queryChunks: ['lte condition'] })),
  between: jest.fn((col, min, max) => ({ type: 'between', column: col, min, max, queryChunks: ['between condition'] })),
  notBetween: jest.fn((col, min, max) => ({ type: 'notBetween', column: col, min, max, queryChunks: ['notBetween condition'] })),
  sql: jest.fn((template, ...values) => ({ type: 'sql', template, values, queryChunks: ['sql condition'] })),
}));

// Create mock column objects that resemble Drizzle PgColumn
const createMockColumn = (name: string, dataType: 'string' | 'number' | 'boolean' = 'string'): PgColumn => {
  // Mock column with proper type configuration
  const mockColumn = {
    name,
    type: 'column',
    tableName: 'test_table',
    dataType: dataType === 'string' ? 'text' : dataType === 'number' ? 'integer' : 'boolean',
    table: 'test_table', // Add table property to match real Drizzle columns
    // Add the proper config structure expected by Drizzle
    _: {
      name,
      dataType: dataType === 'string' ? 'string' : dataType === 'number' ? 'number' : 'boolean',
      columnType: dataType === 'string' ? 'PgUUID' : dataType === 'number' ? 'PgInteger' : 'PgBoolean',
      notNull: false,
      hasDefault: false,
      primary: false,
    }
  } as unknown as PgColumn;
  
  return mockColumn;
};

// Create mock SQL expression
const createMockSQL = (expression: string): SQL => ({
  type: 'sql',
  expression,
}) as unknown as SQL;

// Mock query builder that tracks where calls
type MockQuery = {
  where: jest.MockedFunction<(condition: SQL) => MockQuery>;
  orderBy: jest.MockedFunction<(...columns: (SQL | PgColumn)[]) => MockQuery>;
  offset: jest.MockedFunction<(value: number) => MockQuery>;
  limit: jest.MockedFunction<(value: number) => MockQuery>;
  _whereCalls: Array<SQL>;
  // Add minimal Drizzle interface properties to satisfy type checking
  prepare: jest.MockedFunction<() => any>;
  execute: jest.MockedFunction<() => any>;
  _: any;
  as: jest.MockedFunction<(alias: string) => any>;
};

const createMockQuery = (): MockQuery => {
  const query: MockQuery = {
    where: jest.fn(),
    orderBy: jest.fn(),
    offset: jest.fn(),
    limit: jest.fn(),
    _whereCalls: [],
    // Add minimal Drizzle interface properties
    prepare: jest.fn(),
    execute: jest.fn(),
    _: {
      config: {
        where: undefined // Start with no where clause - appendFilter checks for !query._?.config?.where?.queryChunks?.length
      }
    },
    as: jest.fn(),
  };

  // Make where return the same query instance and track calls
  query.where.mockImplementation((condition) => {
    query._whereCalls.push(condition);
    // Update the internal config to simulate Drizzle's behavior - add queryChunks if missing
    if (condition && !(condition as any).queryChunks) {
      (condition as any).queryChunks = ['mocked condition'];
    }
    query._.config.where = condition;
    return query;
  });

  query.orderBy.mockReturnValue(query);
  query.offset.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.prepare.mockReturnValue({});
  query.execute.mockReturnValue(Promise.resolve([]));
  query.as.mockReturnValue(query);

  return query;
};

// Mock columns for testing
const mockColumns = {
  id: createMockColumn('id', 'string'),
  name: createMockColumn('name', 'string'),
  email: createMockColumn('email', 'string'),
  emailId: createMockColumn('email_id', 'string'), // EmailColumnType is string/UUID
  documentId: createMockColumn('document_id', 'number'), // DocumentId is number/integer
  createdAt: createMockColumn('created_at', 'string'),
  updatedAt: createMockColumn('updated_at', 'string'),
};

// Mock SQL expressions
const mockSQLExpressions = {
  fullName: createMockSQL("CONCAT(first_name, ' ', last_name)"),
  customFilter: createMockSQL('custom_expression'),
};

describe('buildDrizzleAttachmentOrEmailFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.warn = mockConsoleWarn;
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
  });

  describe('Basic functionality', () => {
    it('should return undefined when email_id is not provided', () => {
      const result = buildDrizzleAttachmentOrEmailFilter({
        attachments: true,
        email_id: undefined,
        email_id_column: mockColumns.emailId as any,
        document_id_column: mockColumns.documentId as any,
      });

      expect(result).toBeUndefined();
    });

    it('should include attachments when attachments is true', () => {
      const emailId = 'email-123';
      const result = buildDrizzleAttachmentOrEmailFilter({
        attachments: true,
        email_id: emailId,
        email_id_column: mockColumns.emailId as any,
        document_id_column: mockColumns.documentId as any,
      });

      expect(eq).toHaveBeenCalledWith(mockColumns.emailId, emailId);
      expect(result).toEqual({
        type: 'eq',
        column: mockColumns.emailId,
        value: emailId,
        queryChunks: ['eq condition'],
      });
    });

    it('should exclude attachments when attachments is false', () => {
      const emailId = 'email-123';
      const result = buildDrizzleAttachmentOrEmailFilter({
        attachments: false,
        email_id: emailId,
        email_id_column: mockColumns.emailId as any,
        document_id_column: mockColumns.documentId as any,
      });

      expect(eq).toHaveBeenCalledWith(mockColumns.documentId, expect.any(Object));
      expect(result).toEqual({
        type: 'eq',
        column: mockColumns.documentId,
        value: expect.any(Object),
        queryChunks: ['eq condition'],
      });
    });

    it('should use custom emailToDocumentIdFn when provided', () => {
      const emailId = 'email-123';
      const mockEmailToDocumentId = jest.fn().mockReturnValue(createMockSQL('custom_fn_result'));
      
      buildDrizzleAttachmentOrEmailFilter({
        attachments: false,
        email_id: emailId,
        email_id_column: mockColumns.emailId as any,
        document_id_column: mockColumns.documentId as any,
        emailToDocumentIdFn: mockEmailToDocumentId,
      });

      expect(mockEmailToDocumentId).toHaveBeenCalledWith(emailId);
      expect(eq).toHaveBeenCalledWith(mockColumns.documentId, expect.any(Object));
    });
  });

  describe('URL and URLSearchParams sources', () => {
    it('should parse attachments from URL', () => {
      const emailId = 'email-123';
      const url = new URL('https://example.com?attachments=true');
      
      buildDrizzleAttachmentOrEmailFilter({
        attachments: url,
        email_id: emailId,
        email_id_column: mockColumns.emailId as any,
        document_id_column: mockColumns.documentId as any,
      });

      expect(eq).toHaveBeenCalledWith(mockColumns.emailId, emailId);
    });

    it('should parse attachments from URLSearchParams', () => {
      const emailId = 'email-123';
      const searchParams = new URLSearchParams('attachments=false');
      
      buildDrizzleAttachmentOrEmailFilter({
        attachments: searchParams,
        email_id: emailId,
        email_id_column: mockColumns.emailId as any,
        document_id_column: mockColumns.documentId as any,
      });

      expect(eq).toHaveBeenCalledWith(mockColumns.documentId, expect.any(Object));
    });

    it('should parse attachments from NextRequest-like object', () => {
      const emailId = 'email-123';
      const request = { 
        url: 'https://example.com?attachments=true'
      } as LikeNextRequest;
      
      buildDrizzleAttachmentOrEmailFilter({
        attachments: request,
        email_id: emailId,
        email_id_column: mockColumns.emailId as any,
        document_id_column: mockColumns.documentId as any,
      });

      expect(eq).toHaveBeenCalledWith(mockColumns.emailId, emailId);
    });

    it('should default to including attachments when parameter is missing', () => {
      const emailId = 'email-123';
      const url = new URL('https://example.com');
      
      buildDrizzleAttachmentOrEmailFilter({
        attachments: url,
        email_id: emailId,
        email_id_column: mockColumns.emailId as any,
        document_id_column: mockColumns.documentId as any,
      });

      expect(eq).toHaveBeenCalledWith(mockColumns.emailId, emailId);
    });

    it('should handle truthy/falsy values correctly', () => {
      const emailId = 'email-123';
      const falsyValues = ['false', '0', '', 'no', 'off'];
      const truthyValues = ['true', '1', 'yes', 'y'];

      falsyValues.forEach((value) => {
        jest.clearAllMocks();
        const url = new URL(`https://example.com?attachments=${value}`);
        
        buildDrizzleAttachmentOrEmailFilter({
          attachments: url,
          email_id: emailId,
          email_id_column: mockColumns.emailId as any,
          document_id_column: mockColumns.documentId as any,
        });

        expect(eq).toHaveBeenCalledWith(mockColumns.documentId, expect.any(Object));
      });

      truthyValues.forEach((value) => {
        jest.clearAllMocks();
        const url = new URL(`https://example.com?attachments=${value}`);
        
        buildDrizzleAttachmentOrEmailFilter({
          attachments: url,
          email_id: emailId,
          email_id_column: mockColumns.emailId as any,
          document_id_column: mockColumns.documentId as any,
        });

        expect(eq).toHaveBeenCalledWith(mockColumns.emailId, emailId);
      });
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid attachments parameter', () => {
      const emailId = 'email-123';
      const invalidAttachments = { invalid: 'object' };
      
      expect(() => {
        buildDrizzleAttachmentOrEmailFilter({
          attachments: invalidAttachments as unknown as LikeNextRequest,
          email_id: emailId,
          email_id_column: mockColumns.emailId as any,
          document_id_column: mockColumns.documentId as any,
        });
      }).toThrow('Invalid attachments parameter');
    });
  });
});

describe('buildDrizzleItemFilter', () => {
  const getColumn = (name: string) => mockColumns[name as keyof typeof mockColumns];

  beforeEach(() => {
    jest.clearAllMocks();
    console.warn = mockConsoleWarn;
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
  });

  describe('Equality operators', () => {
    it('should handle equals operator', () => {
      const item: GridFilterItem = { field: 'name', operator: 'equals', value: 'John' };
      const result = buildDrizzleItemFilter({ item, getColumn });

      expect(eq).toHaveBeenCalledWith(mockColumns.name, 'John');
      expect(result).toEqual({ type: 'eq', column: mockColumns.name, value: 'John', queryChunks: ['eq condition'] });
    });

    it('should handle notEquals operator', () => {
      const item: GridFilterItem = { field: 'name', operator: 'notEquals', value: 'John' };
      const result = buildDrizzleItemFilter({ item, getColumn });

      expect(ne).toHaveBeenCalledWith(mockColumns.name, 'John');
      expect(result).toEqual({ type: 'ne', column: mockColumns.name, value: 'John', queryChunks: ['ne condition'] });
    });
  });

  describe('String operators', () => {
    it('should handle contains operator', () => {
      const item: GridFilterItem = { field: 'name', operator: 'contains', value: 'John' };
      const result = buildDrizzleItemFilter({ item, getColumn });

      expect(ilike).toHaveBeenCalledWith(mockColumns.name, '%John%');
      expect(result).toEqual({ type: 'ilike', column: mockColumns.name, value: '%John%', queryChunks: ['ilike condition'] });
    });

    it('should handle notContains operator', () => {
      const item: GridFilterItem = { field: 'name', operator: 'notContains', value: 'John' };
      const result = buildDrizzleItemFilter({ item, getColumn });

      expect(sql).toHaveBeenCalled();
      expect(result).toEqual({ type: 'sql', template: expect.any(Array), values: expect.any(Array), queryChunks: ['sql condition'] });
    });

    it('should handle startsWith operator', () => {
      const item: GridFilterItem = { field: 'name', operator: 'startsWith', value: 'John' };
      const result = buildDrizzleItemFilter({ item, getColumn });

      expect(ilike).toHaveBeenCalledWith(mockColumns.name, 'John%');
      expect(result).toEqual({ type: 'ilike', column: mockColumns.name, value: 'John%', queryChunks: ['ilike condition'] });
    });

    it('should handle endsWith operator', () => {
      const item: GridFilterItem = { field: 'name', operator: 'endsWith', value: 'John' };
      const result = buildDrizzleItemFilter({ item, getColumn });

      expect(ilike).toHaveBeenCalledWith(mockColumns.name, '%John');
      expect(result).toEqual({ type: 'ilike', column: mockColumns.name, value: '%John', queryChunks: ['ilike condition'] });
    });
  });

  describe('Null operators', () => {
    it('should handle isEmpty operator', () => {
      const item: GridFilterItem = { field: 'name', operator: 'isEmpty', value: '' };
      buildDrizzleItemFilter({ item, getColumn });

      expect(or).toHaveBeenCalled();
      expect(isNull).toHaveBeenCalledWith(mockColumns.name);
      expect(eq).toHaveBeenCalledWith(mockColumns.name, '');
    });

    it('should handle isNotEmpty operator', () => {
      const item: GridFilterItem = { field: 'name', operator: 'isNotEmpty', value: '' };
      buildDrizzleItemFilter({ item, getColumn });

      expect(and).toHaveBeenCalled();
      expect(isNotNull).toHaveBeenCalledWith(mockColumns.name);
      expect(ne).toHaveBeenCalledWith(mockColumns.name, '');
    });

    it('should handle isNull operator', () => {
      const item: GridFilterItem = { field: 'name', operator: 'isNull', value: null };
      const result = buildDrizzleItemFilter({ item, getColumn });

      expect(isNull).toHaveBeenCalledWith(mockColumns.name);
      expect(result).toEqual({ type: 'isNull', column: mockColumns.name, queryChunks: ['isNull condition'] });
    });

    it('should handle isNotNull operator', () => {
      const item: GridFilterItem = { field: 'name', operator: 'isNotNull', value: null };
      const result = buildDrizzleItemFilter({ item, getColumn });

      expect(isNotNull).toHaveBeenCalledWith(mockColumns.name);
      expect(result).toEqual({ type: 'isNotNull', column: mockColumns.name, queryChunks: ['isNotNull condition'] });
    });
  });

  describe('Array operators', () => {
    it('should handle isAnyOf operator', () => {
      const item: GridFilterItem = { field: 'name', operator: 'isAnyOf', value: ['John', 'Jane'] };
      const result = buildDrizzleItemFilter({ item, getColumn });

      expect(inArray).toHaveBeenCalledWith(mockColumns.name, ['John', 'Jane']);
      expect(result).toEqual({ type: 'inArray', column: mockColumns.name, value: ['John', 'Jane'], queryChunks: ['inArray condition'] });
    });

    it('should handle isNoneOf operator', () => {
      const item: GridFilterItem = { field: 'name', operator: 'isNoneOf', value: ['John', 'Jane'] };
      const result = buildDrizzleItemFilter({ item, getColumn });

      expect(notInArray).toHaveBeenCalledWith(mockColumns.name, ['John', 'Jane']);
      expect(result).toEqual({ type: 'notInArray', column: mockColumns.name, value: ['John', 'Jane'], queryChunks: ['notInArray condition'] });
    });

    it('should handle in operator (PostgreSQL array containment)', () => {
      const item: GridFilterItem = { field: 'name', operator: 'in', value: 'John' };
      const result = buildDrizzleItemFilter({ item, getColumn });

      expect(sql).toHaveBeenCalled();
      expect(result).toEqual({ type: 'sql', template: expect.any(Array), values: expect.any(Array), queryChunks: ['sql condition'] });
    });
  });

  describe('Comparison operators', () => {
    it('should handle isGreaterThan operator', () => {
      const item: GridFilterItem = { field: 'id', operator: 'isGreaterThan', value: 10 };
      const result = buildDrizzleItemFilter({ item, getColumn });

      expect(gt).toHaveBeenCalledWith(mockColumns.id, 10);
      expect(result).toEqual({ type: 'gt', column: mockColumns.id, value: 10, queryChunks: ['gt condition'] });
    });

    it('should handle isLessThan operator', () => {
      const item: GridFilterItem = { field: 'id', operator: 'isLessThan', value: 10 };
      const result = buildDrizzleItemFilter({ item, getColumn });

      expect(lt).toHaveBeenCalledWith(mockColumns.id, 10);
      expect(result).toEqual({ type: 'lt', column: mockColumns.id, value: 10, queryChunks: ['lt condition'] });
    });

    it('should handle isGreaterThanOrEqual operator', () => {
      const item: GridFilterItem = { field: 'id', operator: 'isGreaterThanOrEqual', value: 10 };
      const result = buildDrizzleItemFilter({ item, getColumn });

      expect(gte).toHaveBeenCalledWith(mockColumns.id, 10);
      expect(result).toEqual({ type: 'gte', column: mockColumns.id, value: 10, queryChunks: ['gte condition'] });
    });

    it('should handle isLessThanOrEqual operator', () => {
      const item: GridFilterItem = { field: 'id', operator: 'isLessThanOrEqual', value: 10 };
      const result = buildDrizzleItemFilter({ item, getColumn });

      expect(lte).toHaveBeenCalledWith(mockColumns.id, 10);
      expect(result).toEqual({ type: 'lte', column: mockColumns.id, value: 10, queryChunks: ['lte condition'] });
    });
  });

  describe('Range operators', () => {
    it('should handle isBetween operator', () => {
      const item: GridFilterItem = { field: 'id', operator: 'isBetween', value: [1, 10] };
      const result = buildDrizzleItemFilter({ item, getColumn });

      expect(between).toHaveBeenCalledWith(mockColumns.id, 1, 10);
      expect(result).toEqual({ type: 'between', column: mockColumns.id, min: 1, max: 10, queryChunks: ['between condition'] });
    });

    it('should handle isNotBetween operator', () => {
      const item: GridFilterItem = { field: 'id', operator: 'isNotBetween', value: [1, 10] };
      const result = buildDrizzleItemFilter({ item, getColumn });

      expect(notBetween).toHaveBeenCalledWith(mockColumns.id, 1, 10);
      expect(result).toEqual({ type: 'notBetween', column: mockColumns.id, min: 1, max: 10, queryChunks: ['notBetween condition'] });
    });
  });

  describe('Column mapping', () => {
    it('should apply column mapping with object map', () => {
      const columnMap = {
        'display_name': 'name',
        'user_email': 'email',
      };
      
      const item: GridFilterItem = { field: 'display_name', operator: 'equals', value: 'John' };
      buildDrizzleItemFilter({ item, getColumn, columnMap });

      expect(eq).toHaveBeenCalledWith(mockColumns.name, 'John');
    });

    it('should apply column mapping with function map', () => {
      const columnMap = (field: string) => {
        const mapping: Record<string, string> = {
          'frontend_name': 'name',
          'frontend_email': 'email',
        };
        return mapping[field] || field;
      };
      
      const item: GridFilterItem = { field: 'frontend_name', operator: 'equals', value: 'John' };
      buildDrizzleItemFilter({ item, getColumn, columnMap });

      expect(eq).toHaveBeenCalledWith(mockColumns.name, 'John');
    });
  });

  describe('Error handling', () => {
    it('should return undefined and log warning for unknown columns', () => {
      const getUnknownColumn = () => undefined;
      const item: GridFilterItem = { field: 'unknown_field', operator: 'equals', value: 'test' };
      
      const result = buildDrizzleItemFilter({ item, getColumn: getUnknownColumn });

      expect(result).toBeUndefined();
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "buildDrizzleItemFilter: Unknown column 'unknown_field' (mapped from 'unknown_field')"
      );
    });

    it('should throw error for unsupported operator', () => {
      const item: GridFilterItem = { field: 'name', operator: 'unsupported' as 'equals', value: 'test' };
      
      expect(() => {
        buildDrizzleItemFilter({ item, getColumn });
      }).toThrow('Unsupported operator: unsupported');
    });
  });
});

describe('buildDrizzleQueryFilter', () => {
  let mockQuery: MockQuery;
  const getColumn = (name: string) => mockColumns[name as keyof typeof mockColumns];

  beforeEach(() => {
    jest.clearAllMocks();
    console.warn = mockConsoleWarn;
    mockQuery = createMockQuery();
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
  });

  describe('Basic functionality', () => {
    it('should return original query when no source provided', () => {
      const result = buildDrizzleQueryFilter({
        query: mockQuery as any,
        source: undefined,
        getColumn,
      });

      expect(result).toBe(mockQuery);
      expect(mockQuery.where).not.toHaveBeenCalled();
    });

    it('should return original query when filter model has no items', () => {
      const filterModel: GridFilterModel = { items: [] };
      const result = buildDrizzleQueryFilter({
        query: mockQuery as any,
        source: filterModel,
        getColumn,
      });

      expect(result).toBe(mockQuery);
      expect(mockQuery.where).not.toHaveBeenCalled();
    });

    it('should apply single filter condition', () => {
      const filterModel: GridFilterModel = {
        items: [{ field: 'name', operator: 'equals', value: 'John' }],
      };
      
      const result = buildDrizzleQueryFilter({
        query: mockQuery as any,
        source: filterModel,
        getColumn,
      });

      expect(result).toBe(mockQuery);
      expect(mockQuery.where).toHaveBeenCalledWith({
        type: 'and',
        conditions: [{ 
          type: 'eq', 
          column: mockColumns.name, 
          value: 'John',
          queryChunks: ['eq condition'] 
        }],
        queryChunks: ['and condition']
      });
    });

    it('should apply multiple filter conditions with AND logic', () => {
      const filterModel: GridFilterModel = {
        items: [
          { field: 'name', operator: 'equals', value: 'John' },
          { field: 'email', operator: 'contains', value: 'example.com' },
        ],
        logicOperator: GridLogicOperator.And,
      };
      
      buildDrizzleQueryFilter({
        query: mockQuery as any,
        source: filterModel,
        getColumn,
      });

      expect(and).toHaveBeenCalledWith(
        { type: 'eq', column: mockColumns.name, value: 'John', queryChunks: ['eq condition'] },
        { type: 'ilike', column: mockColumns.email, value: '%example.com%', queryChunks: ['ilike condition'] }
      );
    });

    it('should apply multiple filter conditions with OR logic', () => {
      const filterModel: GridFilterModel = {
        items: [
          { field: 'name', operator: 'equals', value: 'John' },
          { field: 'email', operator: 'contains', value: 'example.com' },
        ],
        logicOperator: GridLogicOperator.Or,
      };
      
      buildDrizzleQueryFilter({
        query: mockQuery as any,
        source: filterModel,
        getColumn,
      });

      expect(or).toHaveBeenCalledWith(
        { type: 'eq', column: mockColumns.name, value: 'John', queryChunks: ['eq condition'] },
        { type: 'ilike', column: mockColumns.email, value: '%example.com%', queryChunks: ['ilike condition'] }
      );
    });
  });

  describe('URL and string sources', () => {
    it('should parse filter from URL string', () => {
      const urlString = 'https://example.com/api/data?filter=' + encodeURIComponent(JSON.stringify({
        items: [{ field: 'name', operator: 'equals', value: 'John' }]
      }));
      
      buildDrizzleQueryFilter({
        query: mockQuery as any,
        source: urlString,
        getColumn,
      });

      expect(mockQuery.where).toHaveBeenCalled();
    });

    it('should parse filter from URL object', () => {
      const filterModel = { items: [{ field: 'name', operator: 'equals', value: 'John' }] };
      const url = new URL('https://example.com/api/data?filter=' + encodeURIComponent(JSON.stringify(filterModel)));
      
      buildDrizzleQueryFilter({
        query: mockQuery as any,
        source: url,
        getColumn,
      });

      expect(mockQuery.where).toHaveBeenCalled();
    });

    it('should handle URL with no filter parameter', () => {
      const url = new URL('https://example.com/api/data');
      
      const result = buildDrizzleQueryFilter({
        query: mockQuery as any,
        source: url,
        getColumn,
      });

      expect(result).toBe(mockQuery);
      expect(mockQuery.where).not.toHaveBeenCalled();
    });

    it('should handle malformed URL gracefully', () => {
      const result = buildDrizzleQueryFilter({
        query: mockQuery as any,
        source: 'not-a-valid-url',
        getColumn,
      });

      expect(result).toBe(mockQuery);
      expect(mockQuery.where).not.toHaveBeenCalled();
    });
  });

  describe('NextRequest source', () => {
    it('should parse filter from NextRequest', () => {
      const filterModel = { items: [{ field: 'name', operator: 'equals', value: 'John' }] };
      const request = new NextRequest('https://example.com/api/data?filter=' + encodeURIComponent(JSON.stringify(filterModel)));
      
      buildDrizzleQueryFilter({
        query: mockQuery as any,
        source: request,
        getColumn,
      });

      expect(mockQuery.where).toHaveBeenCalled();
    });

    it('should handle NextRequest with malformed URL', () => {
      const request = { url: 'invalid-url' } as LikeNextRequest;
      
      const result = buildDrizzleQueryFilter({
        query: mockQuery as any,
        source: request,
        getColumn,
      });

      expect(result).toBe(mockQuery);
      expect(mockQuery.where).not.toHaveBeenCalled();
    });
  });

  describe('Default filter handling', () => {
    it('should apply default filter when no source filter', () => {
      const defaultFilter: GridFilterModel = {
        items: [{ field: 'name', operator: 'isNotEmpty', value: '' }],
      };
      
      buildDrizzleQueryFilter({
        query: mockQuery as any,
        source: undefined,
        getColumn,
        defaultFilter,
      });

      expect(mockQuery.where).toHaveBeenCalled();
    });

    it('should prioritize source filter over default filter', () => {
      const sourceFilter: GridFilterModel = {
        items: [{ field: 'email', operator: 'contains', value: 'test' }],
      };
      const defaultFilter: GridFilterModel = {
        items: [{ field: 'name', operator: 'isNotEmpty', value: '' }],
      };
      
      buildDrizzleQueryFilter({
        query: mockQuery as any,
        source: sourceFilter,
        getColumn,
        defaultFilter,
      });

      expect(ilike).toHaveBeenCalledWith(mockColumns.email, '%test%');
      expect(and).not.toHaveBeenCalledWith(expect.objectContaining({
        type: 'and',
        conditions: expect.arrayContaining([
          expect.objectContaining({ column: mockColumns.name })
        ])
      }));
    });
  });

  describe('Column mapping', () => {
    it('should apply column mapping to filter items', () => {
      const columnMap = {
        'display_name': 'name',
        'user_email': 'email',
      };
      
      const filterModel: GridFilterModel = {
        items: [
          { field: 'display_name', operator: 'equals', value: 'John' },
          { field: 'user_email', operator: 'contains', value: 'example' },
        ],
      };
      
      buildDrizzleQueryFilter({
        query: mockQuery as any,
        source: filterModel,
        getColumn,
        columnMap,
      });

      expect(eq).toHaveBeenCalledWith(mockColumns.name, 'John');
      expect(ilike).toHaveBeenCalledWith(mockColumns.email, '%example%');
    });
  });

  describe('Additional filters', () => {
    it('should apply additional filters from URL', () => {
      const additional = {
        status: { operator: 'equals' as const, value: 'active' },
      };
      
      const url = new URL('https://example.com/api/data?status=active');
      
      buildDrizzleQueryFilter({
        query: mockQuery as any,
        source: url,
        getColumn: (name) => name === 'status' ? mockColumns.name : getColumn(name),
        additional,
      });

      expect(mockQuery.where).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle filters with unknown columns', () => {
      const filterModel: GridFilterModel = {
        items: [
          { field: 'name', operator: 'equals', value: 'John' },
          { field: 'unknown_field', operator: 'equals', value: 'test' },
        ],
      };
      
      buildDrizzleQueryFilter({
        query: mockQuery as any,
        source: filterModel,
        getColumn,
      });

      expect(mockQuery.where).toHaveBeenCalledWith({
        type: 'and',
        conditions: [{ type: 'eq', column: mockColumns.name, value: 'John', queryChunks: ['eq condition'] }],
        queryChunks: ['and condition']
      });
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "buildDrizzleItemFilter: Unknown column 'unknown_field' (mapped from 'unknown_field')"
      );
    });

    it('should return original query when all filters are invalid', () => {
      const filterModel: GridFilterModel = {
        items: [
          { field: 'unknown1', operator: 'equals', value: 'test1' },
          { field: 'unknown2', operator: 'equals', value: 'test2' },
        ],
      };
      
      const result = buildDrizzleQueryFilter({
        query: mockQuery as any,
        source: filterModel,
        getColumn,
      });

      expect(result).toBe(mockQuery);
      expect(mockQuery.where).not.toHaveBeenCalled();
    });

    it('should handle empty filter model gracefully', () => {
      const filterModel: GridFilterModel = { items: [] };
      
      const result = buildDrizzleQueryFilter({
        query: mockQuery as any,
        source: filterModel,
        getColumn,
      });

      expect(result).toBe(mockQuery);
      expect(mockQuery.where).not.toHaveBeenCalled();
    });
  });
});

describe('Integration tests', () => {
  let mockQuery: MockQuery;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = createMockQuery();
  });

  it('should work end-to-end with realistic data', () => {
    // Simulate a realistic table schema
    const userTable = {
      id: createMockColumn('id'),
      firstName: createMockColumn('first_name'),
      lastName: createMockColumn('last_name'),
      email: createMockColumn('email'),
      createdAt: createMockColumn('created_at'),
      updatedAt: createMockColumn('updated_at'),
    };
    
    // Create column getter
    const getColumn = (name: string) => userTable[name as keyof typeof userTable];
    
    // Column mapping for frontend to backend
    const columnMap = {
      'name': 'firstName',
      'created': 'createdAt',
      'modified': 'updatedAt',
    };
    
    // Test with URL source
    const filterModel: GridFilterModel = {
      items: [
        { field: 'name', operator: 'contains', value: 'John' },
        { field: 'email', operator: 'endsWith', value: 'example.com' },
        { field: 'created', operator: 'isGreaterThan', value: '2023-01-01' },
      ],
      logicOperator: GridLogicOperator.And,
    };
    
    buildDrizzleQueryFilter({
      query: mockQuery as any,
      source: filterModel,
      getColumn,
      columnMap,
    });
    
    expect(and).toHaveBeenCalledWith(
      { type: 'ilike', column: userTable.firstName, value: '%John%', queryChunks: ['ilike condition'] },
      { type: 'ilike', column: userTable.email, value: '%example.com', queryChunks: ['ilike condition'] },
      { type: 'gt', column: userTable.createdAt, value: '2023-01-01', queryChunks: ['gt condition'] }
    );
  });

  it('should handle mixed column types (regular columns and SQL expressions)', () => {
    const getColumn = (name: string) => {
      switch (name) {
        case 'name': return mockColumns.name;
        case 'email': return mockColumns.email;
        case 'full_name': return mockSQLExpressions.fullName;
        case 'created_at': return mockColumns.createdAt;
        default: return undefined;
      }
    };
    
    const filterModel: GridFilterModel = {
      items: [
        { field: 'full_name', operator: 'contains', value: 'John Doe' },
        { field: 'email', operator: 'isNotEmpty', value: '' },
        { field: 'created_at', operator: 'isNotNull', value: null },
      ],
    };
    
    buildDrizzleQueryFilter({
      query: mockQuery as any,
      source: filterModel,
      getColumn,
    });
    
    expect(and).toHaveBeenCalledWith(
      { type: 'ilike', column: mockSQLExpressions.fullName, value: '%John Doe%', queryChunks: ['ilike condition'] },
      { type: 'and', conditions: expect.any(Array), queryChunks: ['and condition'] },
      { type: 'isNotNull', column: mockColumns.createdAt, queryChunks: ['isNotNull condition'] }
    );
  });

  it('should maintain query chain fluency', () => {
    const getColumn = (name: string) => mockColumns[name as keyof typeof mockColumns];
    
    const filterModel: GridFilterModel = {
      items: [{ field: 'name', operator: 'equals', value: 'John' }],
    };
    
    const result = buildDrizzleQueryFilter({
      query: mockQuery as any,
      source: filterModel,
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
