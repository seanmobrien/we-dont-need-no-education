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
import { GridFilterModel, GridSortModel } from '@mui/x-data-grid-pro';

import { normalizeNullableNumeric } from '@/data-models';
import { isLikeNextRequest, type LikeNextRequest } from '@/lib/nextjs-util';
import { PaginatedGridListRequest } from '../../types';
import type { DrizzleSelectQuery } from './types';
import { AnyPgSelect } from 'drizzle-orm/pg-core';
import { parseFilterOptions, parseSortOptions } from '../utility';
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
export const parsePaginationStats = (
  req:
    | URL
    | URLSearchParams
    | (PaginatedGridListRequest | undefined)
    | LikeNextRequest,
): PaginatedGridListRequest & { offset: number } => {
  let page: number | string | undefined | null;
  let num: number | string | undefined | null;
  let filter: GridFilterModel | undefined;
  let sort: GridSortModel | undefined;
  if (isLikeNextRequest(req)) {
    req = new URL(req.url!);
  }
  if (!!req && ('searchParams' in req || 'get' in req)) {
    if ('searchParams' in req) {
      req = req.searchParams;
    }
    page = req.get('page');
    num = req.get('num');
    filter = parseFilterOptions(req);
    sort = parseSortOptions(req);
  } else {
    if (!req) {
      page = undefined;
      num = undefined;
      filter = undefined;
      sort = undefined;
    } else {
      page = req.page;
      num = req.num;
      filter = req.filter;
      sort = req.sort;
    }
  }
  page = normalizeNullableNumeric(Number(page), 1) ?? 1;
  num = normalizeNullableNumeric(Number(num), 10) ?? 10;
  return {
    filter,
    sort,
    page,
    num,
    total: 0,
    offset: (page - 1) * num,
  };
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