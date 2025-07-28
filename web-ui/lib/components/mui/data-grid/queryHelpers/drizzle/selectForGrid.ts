/**
 * @fileoverview Select For Grid Utility
 * 
 * This module provides functionality to apply dynamic filtering, sorting, and pagination
 * logic to Drizzle PgSelectBuilder queries for data grid operations.
 * 
 * @module lib/components/mui/data-grid/selectForGrid
 * @version 1.0.0
 * @since 2025-07-27
 */

import { PaginatedResultset, parsePaginationStats } from '@/data-models';
import { buildDrizzleQueryFilter } from './buildDrizzleFilter';
import { buildDrizzleOrderBy } from './buildDrizzleOrderBy';
import { buildDrizzlePagination } from './buildDrizzlePagination';
import type { SelectForGridProps } from './types';
import { countQueryFactory } from './selectForGridV2';
import { AnyPgSelect } from 'drizzle-orm/pg-core';
/**
 * Applies dynamic filtering, sorting, and pagination to a Drizzle query for data grid operations.
 * 
 * This function integrates the buildDrizzleFilter, buildDrizzleOrderBy, and buildDrizzlePagination
 * utilities to create a complete data grid query solution that returns paginated results with
 * 100% wire compatibility with existing API endpoints.
 * 
 * @param props - Configuration props for the grid query
 * @returns A promise that resolves to a paginated result set
 * 
 * @example
 * ```typescript
 * import { db } from '@/lib/drizzle-db';
 * import { schema } from '@/lib/drizzle-db/schema';
 * import { selectForGrid } from '@/lib/components/mui/data-grid/selectForGrid';
 * 
 * // Define the base query
 * const baseQuery = db
 *   .select({
 *     propertyId: schema.documentProperty.propertyId,
 *     value: schema.documentProperty.propertyValue,
 *     // ... other fields
 *   })
 *   .from(schema.documentProperty)
 *   .leftJoin(schema.callToActionDetails, 
 *     eq(schema.callToActionDetails.propertyId, schema.documentProperty.propertyId))
 *   .where(eq(schema.documentProperty.documentPropertyTypeId, 4));
 * 
 * // Get column mapper
 * const getColumn = (name: string) => {
 *   switch (name) {
 *     case 'property_id': return schema.documentProperty.propertyId;
 *     case 'value': return schema.documentProperty.propertyValue;
 *     default: return undefined;
 *   }
 * };
 * 
 * // Execute grid query
 * const result = await selectForGrid({
 *   req,
 *   emailId,
 *   query: baseQuery,
 *   getColumn,
 *   getCountQuery: () => db.select({ count: count() }).from(schema.documentProperty).where(...),
 *   columnMap: { displayName: 'property_value' },
 * });
 * ```
 */
export async function selectForGrid<T = Record<string, unknown>>({
  req,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  emailId: _emailId, // Currently unused but kept for API consistency
  query,
  getColumn,
  columnMap = {},
  recordMapper,
}: SelectForGridProps<T>): Promise<PaginatedResultset<Partial<T>>> {
  
  // Parse pagination parameters from the request
  const paginationStats = parsePaginationStats(new URL(req.url));
  
  // Apply filtering logic
  const filteredQuery = buildDrizzleQueryFilter({
    query,
    source: req,
    getColumn,
    columnMap,
  });
  
  // Apply sorting logic
  const sortedQuery = buildDrizzleOrderBy({
    query: filteredQuery,
    source: req,
    getColumn,
    columnMap,
  });

  const {
    select,
    count
  } = countQueryFactory(sortedQuery as AnyPgSelect);

  
  // Apply pagination logic
  const paginatedQuery: unknown = buildDrizzlePagination({
    query: select,
    req,
  });
  
  // Execute both queries concurrently
  const [results, totalCount] = await Promise.all([
    typeof paginatedQuery === 'function' ? paginatedQuery() : paginatedQuery,
    count,
  ]);
  
  // Transform results if mapper is provided
  const transformedResults = recordMapper 
    ? (results as Record<string, unknown>[]).map(recordMapper)
    : results as Partial<T>[];  
  
  // Return paginated result set with wire compatibility
  return {
    results: transformedResults,
    pageStats: {
      page: paginationStats.page,
      num: paginationStats.num,
      total: totalCount,
    },
  };
}