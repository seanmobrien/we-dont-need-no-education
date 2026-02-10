

/**
 * @fileoverview Unit tests for selectForGrid utility function
 *
 * This file contains comprehensive tests for the selectForGrid function,
 * verifying its ability to integrate filtering, sorting, and pagination
 * for Drizzle ORM queries in data grid operations.
 */

import { selectForGrid } from '@/lib/components/mui/data-grid/queryHelpers/drizzle/selectForGrid';
import { NextRequest } from 'next/server';
import { CallToActionDetails } from '@/data-models/api/email-properties/extended-properties';

// Mock the dependencies before importing
jest.mock('@/lib/components/mui/data-grid/queryHelpers/utility', () => {
  const orig = jest.requireActual(
    '/lib/components/mui/data-grid/queryHelpers/utility',
  );
  return {
    ...orig,
    parsePaginationStats: jest.fn(),
  };
});

jest.mock('@/lib/components/mui/data-grid/queryHelpers', () => ({
  buildDrizzlePagination: jest.fn(),
  buildDrizzleOrderBy: jest.fn(),
  buildDrizzleQueryFilter: jest.fn(),
}));

jest.mock(
  '/lib/components/mui/data-grid/queryHelpers/drizzle/buildDrizzleFilter',
  () => ({
    buildDrizzleQueryFilter: jest.fn(),
  }),
);

jest.mock(
  '/lib/components/mui/data-grid/queryHelpers/drizzle/buildDrizzleOrderBy',
  () => ({
    buildDrizzleOrderBy: jest.fn(),
  }),
);

jest.mock(
  '/lib/components/mui/data-grid/queryHelpers/drizzle/buildDrizzlePagination',
  () => ({
    buildDrizzlePagination: jest.fn(),
  }),
);

import { parsePaginationStats } from '@/lib/components/mui/data-grid/queryHelpers/utility';

import {
  buildDrizzleOrderBy,
  buildDrizzlePagination,
  buildDrizzleQueryFilter,
  DrizzleSelectQuery,
} from '@/lib/components/mui/data-grid/queryHelpers';
import { buildDrizzleQueryFilter as buildDrizzleFilter } from '@/lib/components/mui/data-grid/queryHelpers/drizzle/buildDrizzleFilter';
import { buildDrizzleOrderBy as buildDrizzleOrder } from '@/lib/components/mui/data-grid/queryHelpers/drizzle/buildDrizzleOrderBy';
import { buildDrizzlePagination as buildDrizzlePage } from '@/lib/components/mui/data-grid/queryHelpers/drizzle/buildDrizzlePagination';

// Import and mock the countQueryFactory
import * as selectForGridModule from '@/lib/components/mui/data-grid/queryHelpers/drizzle/selectForGrid';

const mockCountQueryFactory = jest.fn();

const mockParsePaginationStats = parsePaginationStats as jest.MockedFunction<
  typeof parsePaginationStats
>;
const mockBuildDrizzleQueryFilter =
  buildDrizzleQueryFilter as jest.MockedFunction<
    typeof buildDrizzleQueryFilter
  >;
const mockBuildDrizzleOrderBy = buildDrizzleOrderBy as jest.MockedFunction<
  typeof buildDrizzleOrderBy
>;
const mockBuildDrizzlePagination =
  buildDrizzlePagination as jest.MockedFunction<typeof buildDrizzlePagination>;
const mockBuildDrizzleFilter = buildDrizzleFilter as jest.MockedFunction<
  typeof buildDrizzleFilter
>;
const mockBuildDrizzleOrder = buildDrizzleOrder as jest.MockedFunction<
  typeof buildDrizzleOrder
>;
const mockBuildDrizzlePage = buildDrizzlePage as jest.MockedFunction<
  typeof buildDrizzlePage
>;

describe('selectForGrid', () => {
  let mockQuery: any;
  let mockReq: NextRequest;
  let mockGetColumn: jest.Mock;
  let mockRecordMapper: jest.Mock;

  beforeEach(() => {
    // jest.clearAllMocks();

    // Create mock request
    mockReq = {
      url: 'https://example.com/api/data?page=1&pageSize=10&filter=test',
    } as NextRequest;

    // Create mock query that can be executed
    mockQuery = jest.fn();

    // Create mock functions
    mockGetColumn = jest.fn().mockImplementation((name: string) => {
      return name === 'property_id' ? { name: 'property_id' } : undefined;
    });

    mockRecordMapper = jest
      .fn()
      .mockImplementation((record: Record<string, unknown>) => ({
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
    mockBuildDrizzlePagination.mockImplementation(() => {
      // This function will be overridden in each test to return the appropriate results
      return [] as DrizzleSelectQuery;
    });

    // Mock the specific build functions from drizzle modules
    mockBuildDrizzleFilter.mockImplementation((params) => params.query);
    mockBuildDrizzleOrder.mockImplementation((params) => params.query);
    mockBuildDrizzlePage.mockImplementation(() => {
      // This function will be overridden in each test to return the appropriate results
      return [] as DrizzleSelectQuery;
    });

    // Mock the countQueryFactory
    mockCountQueryFactory.mockReturnValue({
      select: () => Promise.resolve([]),
      count: Promise.resolve(0),
    });

    // Spy on the module and replace the countQueryFactory
    jest
      .spyOn(selectForGridModule, 'countQueryFactory')
      .mockImplementation(mockCountQueryFactory);
  });

  describe('Basic functionality', () => {
    it('should apply record mapper when provided', async () => {
      const mockResults = [
        { id: 1, name: 'Test 1' },
        { id: 2, name: 'Test 2' },
      ];

      // Mock the countQueryFactory to return proper select and count functions
      mockCountQueryFactory.mockReturnValue({
        select: mockResults, // This returns the results directly, not a function
        count: Promise.resolve(50),
      });

      // Mock buildDrizzlePagination to return the results
      mockBuildDrizzlePagination.mockImplementation(() => mockResults);
      mockBuildDrizzlePage.mockImplementation(() => mockResults);

      const result = await selectForGrid({
        req: mockReq,
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

      // Mock the countQueryFactory to return proper select and count functions
      mockCountQueryFactory.mockReturnValue({
        select: mockResults, // This returns the results directly, not a function
        count: Promise.resolve(25),
      });

      // Mock buildDrizzlePagination to return the results
      mockBuildDrizzlePagination.mockImplementation(() => mockResults);
      mockBuildDrizzlePage.mockImplementation(() => mockResults);

      const result = await selectForGrid({
        req: mockReq,
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

      // Mock the countQueryFactory to return empty results
      mockCountQueryFactory.mockReturnValue({
        select: mockResults,
        count: Promise.resolve(0),
      });

      // Mock buildDrizzlePagination to return empty results
      mockBuildDrizzlePagination.mockImplementation(() => mockResults);
      mockBuildDrizzlePage.mockImplementation(() => mockResults);

      await selectForGrid({
        req: mockReq,
        query: mockQuery,
        getColumn: mockGetColumn,
      });

      // Verify pagination stats were parsed from the request URL
      expect(mockParsePaginationStats).toHaveBeenCalledWith(
        new URL(mockReq.url),
      );
    });
  });

  describe('Count handling', () => {
    it('should handle empty count result', async () => {
      const mockResults: any[] = [];

      // Mock the countQueryFactory to return empty results
      mockCountQueryFactory.mockReturnValue({
        select: mockResults,
        count: Promise.resolve(0),
      });

      // Mock buildDrizzlePagination to return empty results
      mockBuildDrizzlePagination.mockImplementation(() => mockResults);
      mockBuildDrizzlePage.mockImplementation(() => mockResults);

      const result = await selectForGrid({
        req: mockReq,
        query: mockQuery,
        getColumn: mockGetColumn,
      });

      expect(result.pageStats.total).toBe(0);
    });

    it('should handle non-array count result', async () => {
      const mockResults: any[] = [];

      // Mock the countQueryFactory to return count of 75
      mockCountQueryFactory.mockReturnValue({
        select: mockResults,
        count: Promise.resolve(75),
      });

      // Mock buildDrizzlePagination to return empty results
      mockBuildDrizzlePagination.mockImplementation(() => mockResults);
      mockBuildDrizzlePage.mockImplementation(() => mockResults);

      const result = await selectForGrid({
        req: mockReq,
        query: mockQuery,
        getColumn: mockGetColumn,
      });

      expect(result.pageStats.total).toBe(75);
    });
  });

  describe('Error handling', () => {
    it('should handle query execution errors', async () => {
      const error = new Error('Database connection failed');

      // Mock the countQueryFactory to return proper select and count functions
      mockCountQueryFactory.mockReturnValue({
        select: [], // This should be the result after query factory, not a promise
        count: Promise.resolve(0),
      });

      // Mock buildDrizzlePagination to return a function that rejects
      mockBuildDrizzlePagination.mockImplementation(
        () => (() => Promise.reject(error)) as unknown as DrizzleSelectQuery,
      );
      mockBuildDrizzlePage.mockImplementation(
        () => (() => Promise.reject(error)) as unknown as DrizzleSelectQuery,
      );

      await expect(
        selectForGrid({
          req: mockReq,
          query: mockQuery,
          getColumn: mockGetColumn,
        }),
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle record mapper errors', async () => {
      const mockResults = [{ id: 1, name: 'Test' }];
      const error = new Error('Mapping failed');

      // Mock the countQueryFactory to return mock results
      mockCountQueryFactory.mockReturnValue({
        select: mockResults,
        count: Promise.resolve(1),
      });

      // Mock buildDrizzlePagination to return the results
      mockBuildDrizzlePagination.mockImplementation(() => mockResults);
      mockBuildDrizzlePage.mockImplementation(() => mockResults);

      mockRecordMapper.mockImplementation(() => {
        throw error;
      });

      await expect(
        selectForGrid({
          req: mockReq,
          query: mockQuery,
          getColumn: mockGetColumn,
          recordMapper: mockRecordMapper,
        }),
      ).rejects.toThrow('Mapping failed');
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

      // Mock the countQueryFactory to return mock results
      mockCountQueryFactory.mockReturnValue({
        select: mockResults,
        count: Promise.resolve(1),
      });

      // Mock buildDrizzlePagination to return the results
      mockBuildDrizzlePagination.mockImplementation(() => mockResults);
      mockBuildDrizzlePage.mockImplementation(() => mockResults);

      const ctaRecordMapper = (
        record: Record<string, unknown>,
      ): Partial<CallToActionDetails> => ({
        propertyId: record.propertyId as string,
        value: record.propertyValue as string,
        severity: record.severity as number,
        inferred: record.inferred as boolean,
        compliance_rating: record.complianceRating as number,
      });

      const result = await selectForGrid<CallToActionDetails>({
        req: mockReq,
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

      // Mock the countQueryFactory to return mock results
      mockCountQueryFactory.mockReturnValue({
        select: mockResults,
        count: Promise.resolve(1),
      });

      // Mock buildDrizzlePagination to return the results
      mockBuildDrizzlePagination.mockImplementation(() => mockResults);
      mockBuildDrizzlePage.mockImplementation(() => mockResults);

      const customMapper = (
        record: Record<string, unknown>,
      ): Partial<CustomType> => ({
        id: record.id as number,
        name: record.name as string,
        custom: true,
      });

      const result = await selectForGrid<CustomType>({
        req: mockReq,
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
