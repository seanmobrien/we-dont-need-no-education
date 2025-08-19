
/**
 * @fileoverview Drizzle Pagination Builder for Data Grid
 * 
 * This module provides functionality to apply dynamic pagination logic to Drizzle PgSelectBuilder
 * queries, similar to the postgres.js buildPagination function but adapted for Drizzle ORM.
 * 
 * @module lib/components/mui/data-grid/buildDrizzlePagination
 * @version 1.0.0
 * @since 2025-07-27
 */
import { LikeNextRequest } from '@/lib/nextjs-util/types';
import { PaginatedGridListRequest } from '../../types';
import type { DrizzleSelectQuery } from './types';
import { AnyPgSelect } from 'drizzle-orm/pg-core';
import { parsePaginationStats as parsePaginationStatsImpl } from '../utility';
import { deprecate } from 'util';
/**
 * Props for configuring Drizzle pagination functionality.
 */
export type BuildDrizzlePaginationProps = {
  /**
   * The Drizzle select query to apply pagination to.
   */
  query: Pick<Exclude<DrizzleSelectQuery, Array<Record<string, unknown>>>, 'limit' | 'offset'>;

  /**
   * The request object containing pagination parameters.
   */
  req:
    | URL
    | URLSearchParams
    | (PaginatedGridListRequest | undefined)
    | LikeNextRequest;
};

/**
 * Parses pagination statistics from a given request object.
 *
 * @param req - The request object which can be of type URL, URLSearchParams, or PaginationStats.
 * @returns An object containing pagination statistics including page, num, total, and offset.
 *
 * The function extracts the `page` and `num` parameters from the request object.
 * If the request object is of type URL or URLSearchParams, it retrieves these parameters from the search parameters.
 * If the request object is of type PaginationStats, it directly uses the `page` and `num` properties.
 * If the request object is undefined or null, it defaults to page 1 and num 10.
 *
 * The `page` and `num` values are normalized to ensure they are numeric and fall back to default values if necessary.
 * The `offset` is calculated based on the `page` and `num` values.
 *
 * @example
 * ```typescript
 * const url = new URL('https://example.com?page=2&num=20');
 * const stats = parsePaginationStats(url);
 * console.log(stats); // { page: 2, num: 20, total: 0, offset: 20 }
 * ```
 */
export const parsePaginationStats = deprecate((
  req:
    | URL
    | URLSearchParams
    | (PaginatedGridListRequest | undefined)
    | LikeNextRequest,
): PaginatedGridListRequest & { offset: number } => parsePaginationStatsImpl(req), 
"DP0010 - parsePaginationStats.  Import from '@/lib/components/mui/data-grid/queryHelpers/utility instead.");

/**
 * Applies dynamic pagination logic to a Drizzle select query.
 * 
 * This function parses pagination parameters from various sources and applies
 * the appropriate LIMIT and OFFSET clauses to a Drizzle query builder.
 * 
 * @param props - Configuration props for building the pagination
 * @returns The query builder with pagination applied
 * 
 * @example
 * ```typescript
 * import { db, users } from '@/drizzle/schema';
 * 
 * const query = db.select().from(users);
 * const paginatedQuery = buildDrizzlePagination({
 *   query,
 *   req: searchParams, // or URL, URLSearchParams, etc.
 * });
 * 
 * const results = await paginatedQuery;
 * ```
 */
export const buildDrizzlePagination = ({
  query,
  req,
}: BuildDrizzlePaginationProps): DrizzleSelectQuery => {
  const { num, offset } = parsePaginationStats(req);
  return (query.offset(offset) as AnyPgSelect)
  .limit(num) as DrizzleSelectQuery;
};