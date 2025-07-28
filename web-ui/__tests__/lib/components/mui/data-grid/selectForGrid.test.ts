/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @fileoverview Unit tests for selectForGrid utility function
 * 
 * This file contains comprehensive tests for the selectForGrid function,
 * verifying its ability to integrate filtering, sorting, and pagination
 * for Drizzle ORM queries in data grid operations.
 */

import { selectForGrid } from '@/lib/components/mui/data-grid/queryHelpers/drizzle/selectForGrid';
import { NextRequest } from 'next/server';
import { CallToActionDetails } from '@/data-models';

// Mock the dependencies
jest.mock('@/data-models', () => ({
  parsePaginationStats: jest.fn(),
}));

jest.mock('@/lib/components/mui/data-grid/queryHelpers', () => ({
  buildDrizzlePagination: jest.fn(),
  buildDrizzleOrderBy: jest.fn(),
  buildDrizzleQueryFilter: jest.fn(),
}));

import { parsePaginationStats } from '@/data-models';
import {
  buildDrizzleOrderBy,
  buildDrizzlePagination,
  buildDrizzleQueryFilter,
} from '@/lib/components/mui/data-grid/queryHelpers';
import { makeMockDb } from '@/__tests__/jest.setup';

const mockParsePaginationStats = parsePaginationStats as jest.MockedFunction<typeof parsePaginationStats>;
const mockBuildDrizzleQueryFilter = buildDrizzleQueryFilter as jest.MockedFunction<typeof buildDrizzleQueryFilter>;
const mockBuildDrizzleOrderBy = buildDrizzleOrderBy as jest.MockedFunction<typeof buildDrizzleOrderBy>;
const mockBuildDrizzlePagination = buildDrizzlePagination as jest.MockedFunction<typeof buildDrizzlePagination>;

describe('selectForGrid', () => {
  let mockQuery: any;
  let mockCountQuery: any;
  let mockReq: NextRequest;
  let mockGetColumn: jest.Mock;
  let mockRecordMapper: jest.Mock;

  beforeEach(() => {
    // jest.clearAllMocks();
    const mockDb = makeMockDb();
    (mockDb.select as jest.Mock).mockReturnValue({ 
      from: jest.fn().mockImplementation((q) => q),
      ...mockDb,
    });
    (mockDb.$count as jest.Mock).mockReturnValue(2);
    // Create mock query objects that are functions
    mockQuery = jest.fn();
    mockCountQuery = jest.fn();
    mockQuery.as = jest.fn().mockReturnThis();
    mockQuery.limit = jest.fn().mockReturnThis();
    mockQuery.from = jest.fn().mockReturnThis();
    mockQuery.offset = jest.fn().mockReturnThis();
    // Create mock request
    mockReq = {
      url: 'https://example.com/api/data?page=1&pageSize=10&filter=test',
    } as NextRequest;

    // Create mock functions
    mockGetColumn = jest.fn().mockImplementation((name: string) => {
      return name === 'property_id' ? { name: 'property_id' } : undefined;
    });


    mockRecordMapper = jest.fn().mockImplementation((record: Record<string, unknown>) => ({
      ...record,
      mapped: true,
    }));

    // Setup default mock returns
    mockParsePaginationStats.mockReturnValue({
      page: 1,
      num: 10,
      offset: 0,
      total: 0,
    });

    // The build functions should return the query they receive
    mockBuildDrizzleQueryFilter.mockImplementation((params) => params.query);
    mockBuildDrizzleOrderBy.mockImplementation((params) => params.query);
    mockBuildDrizzlePagination.mockImplementation(
      (params) => params.query as any,
    );
  });

  describe('Basic functionality', () => {


    it('should apply record mapper when provided', async () => {
      const mockResults = [
        { id: 1, name: 'Test 1' },
        { id: 2, name: 'Test 2' },
      ];
      const mockCountResult = [{ count: 50 }];

      mockQuery.mockResolvedValue(mockResults);
      mockCountQuery.mockResolvedValue(mockCountResult);

      const result = await selectForGrid({
        req: mockReq,
        emailId: 'test-email-id',
        query: mockQuery,
        getColumn: mockGetColumn,
        recordMapper: mockRecordMapper,
      });

      // Verify record mapper was called for each result
      expect(mockRecordMapper).toHaveBeenCalledTimes(2);

      // Verify mapped results
      expect(result.results).toEqual([
        { id: 1, name: 'Test 1', mapped: true },
        { id: 2, name: 'Test 2', mapped: true },
      ]);
    });

    it('should work without record mapper', async () => {
      const mockResults = [
        { id: 1, name: 'Test 1' },
        { id: 2, name: 'Test 2' },
      ];
      const mockCountResult = [{ count: 25 }];

      mockQuery.mockResolvedValue(mockResults);
      mockCountQuery.mockResolvedValue(mockCountResult);

      const result = await selectForGrid({
        req: mockReq,
        emailId: 'test-email-id',
        query: mockQuery,
        getColumn: mockGetColumn,
      });

      // Verify results are returned as-is
      expect(result.results).toEqual(mockResults);
      expect(mockRecordMapper).not.toHaveBeenCalled();
    });
  });



  describe('Pagination handling', () => {
    it('should parse pagination stats from request URL', async () => {
      const mockResults: any[] = [];
      const mockCountResult = [{ count: 0 }];

      mockQuery.mockResolvedValue(mockResults);
      mockCountQuery.mockResolvedValue(mockCountResult);

      await selectForGrid({
        req: mockReq,
        emailId: 'test-email-id',
        query: mockQuery,
        getColumn: mockGetColumn,
        
      });

      // Verify pagination stats were parsed from the request URL
      expect(mockParsePaginationStats).toHaveBeenCalledWith(new URL(mockReq.url));
    });

  });

  describe('Count handling', () => {
    it('should handle empty count result', async () => {
      const mockResults: any[] = [];
      const mockCountResult: any[] = [];

      mockQuery.mockResolvedValue(mockResults);
      mockCountQuery.mockResolvedValue(mockCountResult);

      const result = await selectForGrid({
        req: mockReq,
        emailId: 'test-email-id',
        query: mockQuery,
        getColumn: mockGetColumn,
        
      });

      expect(result.pageStats.total).toBe(2);
    });

    it('should handle non-array count result', async () => {
      const mockResults: any[] = [];
      const mockCountResult = { count: 75 }; // Not an array

      mockQuery.mockResolvedValue(mockResults);
      mockCountQuery.mockResolvedValue(mockCountResult);

      const result = await selectForGrid({
        req: mockReq,
        emailId: 'test-email-id',
        query: mockQuery,
        getColumn: mockGetColumn,
        
      });

      expect(result.pageStats.total).toBe(2);
    });


  });

  describe('Error handling', () => {
    it('should handle query execution errors', async () => {
      const error = new Error('Database connection failed');
      mockQuery.mockRejectedValue(error);

      await expect(selectForGrid({
        req: mockReq,
        emailId: 'test-email-id',
        query: mockQuery,
        getColumn: mockGetColumn,
        
      })).rejects.toThrow('Database connection failed');
    });


    it('should handle record mapper errors', async () => {
      const mockResults = [{ id: 1, name: 'Test' }];
      const mockCountResult = [{ count: 1 }];
      const error = new Error('Mapping failed');

      mockQuery.mockResolvedValue(mockResults);
      mockCountQuery.mockResolvedValue(mockCountResult);
      mockRecordMapper.mockImplementation(() => {
        throw error;
      });

      await expect(selectForGrid({
        req: mockReq,
        emailId: 'test-email-id',
        query: mockQuery,
        getColumn: mockGetColumn,
        
        recordMapper: mockRecordMapper,
      })).rejects.toThrow('Mapping failed');
    });
  });

  describe('Integration scenarios', () => {
    it('should work with realistic CallToActionDetails scenario', async () => {
      const mockResults = [
        {
          propertyId: '123e4567-e89b-12d3-a456-426614174000',
          propertyValue: 'Test call to action',
          severity: 3,
          inferred: false,
          complianceRating: 4.5,
        },
      ];
      const mockCountResult = [{ count: 1 }];

      mockQuery.mockResolvedValue(mockResults);
      mockCountQuery.mockResolvedValue(mockCountResult);

      const ctaRecordMapper = (record: Record<string, unknown>): Partial<CallToActionDetails> => ({
        propertyId: record.propertyId as string,
        value: record.propertyValue as string,
        severity: record.severity as number,
        inferred: record.inferred as boolean,
        compliance_rating: record.complianceRating as number,
      });

      const result = await selectForGrid<CallToActionDetails>({
        req: mockReq,
        emailId: 'test-email-id',
        query: mockQuery,
        getColumn: mockGetColumn,
        
        recordMapper: ctaRecordMapper as any,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({
        propertyId: '123e4567-e89b-12d3-a456-426614174000',
        value: 'Test call to action',
        severity: 3,
        inferred: false,
        compliance_rating: 4.5,
      });
    });

    
  });

  describe('Type safety', () => {
    it('should preserve generic type information', async () => {
      interface CustomType {
        id: number;
        name: string;
        custom: boolean;
      }

      const mockResults = [{ id: 1, name: 'Test', other: 'value' }];
      const mockCountResult = [{ count: 1 }];

      mockQuery.mockResolvedValue(mockResults);
      mockCountQuery.mockResolvedValue(mockCountResult);

      const customMapper = (record: Record<string, unknown>): Partial<CustomType> => ({
        id: record.id as number,
        name: record.name as string,
        custom: true,
      });

      const result = await selectForGrid<CustomType>({
        req: mockReq,
        emailId: 'test-email-id',
        query: mockQuery,
        getColumn: mockGetColumn,
        
        recordMapper: customMapper as any,
      });

      // TypeScript should infer the correct return type
      expect(result.results[0].id).toBe(1);
      expect(result.results[0].name).toBe('Test');
      expect(result.results[0].custom).toBe(true);
    });
  });
});