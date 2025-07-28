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

import { parsePaginationStats } from '@/data-models';
import { type LikeNextRequest } from '@/lib/nextjs-util';
import { PaginatedGridListRequest } from '../../types';
import type { DrizzleSelectQuery } from './types';
import { AnyPgSelect } from 'drizzle-orm/pg-core';
/**
 * Props for configuring Drizzle pagination functionality.
 */
export type BuildDrizzlePaginationProps = {
  /**
   * The Drizzle select query to apply pagination to.
   */
  query: Pick<DrizzleSelectQuery, 'limit' | 'offset'>;

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