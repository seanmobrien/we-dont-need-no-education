/**
 * @fileoverview Drizzle OrderBy Builder for Data Grid
 *
 * This module provides functionality to apply dynamic ordering logic to Drizzle PgSelectBuilder
 * queries, similar to the postgres.js buildOrderBy function but adapted for Drizzle ORM.
 *
 * @module lib/components/mui/data-grid/buildDrizzleOrderBy
 * @version 1.0.0
 * @since 2025-07-26
 */

import { isLikeNextRequest } from '@compliance-theater/nextjs/guards';
import { log } from '@compliance-theater/logger';
import type { GridSortModel } from '@mui/x-data-grid-pro';
import { asc, desc, SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { isGridSortModel } from '../../guards';
import type { BuildDrizzleOrderByProps, DrizzleSortedQuery } from './types';
import { columnMapFactory, parseSortOptions } from '../utility';

/**
 * Applies dynamic order by logic to a Drizzle select query.
 *
 * This function parses sort options from various sources (URL parameters, GridSortModel, etc.)
 * and applies the appropriate orderBy clauses to a Drizzle query builder.
 *
 * @param props - Configuration props for building the order by clause
 * @returns The query builder with orderBy applied
 *
 * @example
 * ```typescript
 * // Basic usage with a simple column map
 * const query = db.select().from(users);
 * const orderedQuery = buildDrizzleOrderBy({
 *   query,
 *   source: searchParams, // or URL, GridSortModel, etc.
 *   defaultSort: 'name',
 *   columnMap: { displayName: 'name', userEmail: 'email' },
 *   getColumn: (name) => {
 *     switch (name) {
 *       case 'name': return users.name;
 *       case 'email': return users.email;
 *       case 'created_at': return users.createdAt;
 *       default: return undefined;
 *     }
 *   }
 * });
 *
 * // Usage with table schema object
 * const tableColumns = {
 *   name: users.name,
 *   email: users.email,
 *   created_at: users.createdAt,
 * };
 *
 * const orderedQuery = buildDrizzleOrderBy({
 *   query: db.select().from(users),
 *   source: req.url,
 *   defaultSort: [{ field: 'name', sort: 'asc' }],
 *   getColumn: (name) => tableColumns[name as keyof typeof tableColumns]
 * });
 *
 * // Advanced usage with custom SQL expressions
 * const orderedQuery = buildDrizzleOrderBy({
 *   query: db.select().from(users),
 *   source: sortModel,
 *   getColumn: (name) => {
 *     switch (name) {
 *       case 'full_name':
 *         return sql`${users.firstName} || ' ' || ${users.lastName}`;
 *       case 'name':
 *         return users.name;
 *       default:
 *         return undefined;
 *     }
 *   }
 * });
 * ```
 */
export const buildDrizzleOrderBy = ({
  query,
  source,
  defaultSort,
  columnMap = {},
  getColumn,
}: BuildDrizzleOrderByProps): DrizzleSortedQuery => {
  // Create column mapping function
  const columnMapper = columnMapFactory(columnMap);

  /**
   * Applies a GridSortModel to the query builder.
   *
   * @param sortModel - The sort model to apply
   * @returns The query builder with orderBy applied
   */
  const applySortModel = (sortModel: GridSortModel): DrizzleSortedQuery => {
    if (sortModel.length === 0) {
      return query;
    }

    // Build array of order by expressions
    const orderByExpressions: (SQL | PgColumn)[] = [];

    for (const sortItem of sortModel) {
      const mappedColumnName = columnMapper(sortItem.field);
      const column = getColumn(mappedColumnName);

      if (column) {
        const orderExpression =
          sortItem.sort === 'desc' ? desc(column) : asc(column);
        orderByExpressions.push(orderExpression);
      } else {
        // Log warning about unknown column
        log((l) =>
          l.warn(
            `buildDrizzleOrderBy: Unknown column '${mappedColumnName}' (mapped from '${sortItem.field}')`
          )
        );
      }
    }

    if (orderByExpressions.length === 0) {
      return query;
    }

    // Apply all order by expressions
    return Array.isArray(query)
      ? query
      : (query.orderBy(...orderByExpressions) as DrizzleSortedQuery);
  };

  /**
   * Applies a default sort to the query builder.
   *
   * @param sort - The default sort specification
   * @returns The query builder with orderBy applied
   */
  const applyDefaultSort = (
    sort: GridSortModel | string | SQL | SQL.Aliased | PgColumn
  ): DrizzleSortedQuery => {
    if (typeof sort === 'string') {
      // String column name - map it and get the column
      const mappedColumnName = columnMapper(sort);
      const column = getColumn(mappedColumnName);

      if (column) {
        return Array.isArray(query)
          ? query
          : (query.orderBy(asc(column)) as DrizzleSortedQuery);
      } else {
        log((l) =>
          l.warn(
            `buildDrizzleOrderBy: Unknown default sort column '${mappedColumnName}' (mapped from '${sort}')`
          )
        );
        return query;
      }
    } else if (Array.isArray(sort)) {
      // GridSortModel
      return applySortModel(sort);
    } else {
      // SQL expression or PgColumn - use directly
      // We know sort is either SQL or PgColumn here due to type narrowing
      return Array.isArray(query)
        ? query
        : (query.orderBy(asc(sort as SQL | PgColumn)) as DrizzleSortedQuery);
    }
  };

  // Parse the sort model from the source
  const sortBy = isGridSortModel(source)
    ? source
    : parseSortOptions(
        typeof source === 'string'
          ? (() => {
              try {
                return new URL(source);
              } catch {
                // If string is not a valid URL, return undefined to use default sort
                return undefined;
              }
            })()
          : isLikeNextRequest(source)
          ? new URL(source.url!)
          : source
      );

  // Apply sorting logic
  if (!sortBy) {
    // No sort specified, use default if provided
    return defaultSort ? applyDefaultSort(defaultSort) : query;
  }

  // Apply the parsed sort model
  return applySortModel(sortBy);
};

/**
 * Helper function to create a column getter from a schema object.
 *
 * This utility simplifies the creation of the getColumn function when you have
 * a schema object or table reference.
 *
 * @param columns - Object mapping column names to Drizzle column objects
 * @returns A getColumn function for use with buildDrizzleOrderBy
 *
 * @example
 * ```typescript
 * import { users } from '@compliance-theater/database/schema';
 *
 * const getColumn = createColumnGetter({
 *   name: users.name,
 *   email: users.email,
 *   created_at: users.createdAt,
 *   // Custom SQL expression
 *   full_name: sql`${users.firstName} || ' ' || ${users.lastName}`,
 * });
 *
 * const orderedQuery = buildDrizzleOrderBy({
 *   query: db.select().from(users),
 *   source: req.url,
 *   getColumn,
 * });
 * ```
 */
export const createColumnGetter = (
  columns: Record<string, PgColumn | SQL>
): ((columnName: string) => PgColumn | SQL | undefined) => {
  return (columnName: string) => columns[columnName];
};

/**
 * Helper function to create a simple column getter for a single table.
 *
 * This utility uses reflection to automatically map common column naming patterns.
 * It's useful when you want basic column mapping without defining every column manually.
 *
 * @param table - The Drizzle table object
 * @param customMappings - Optional custom column mappings
 * @returns A getColumn function for use with buildDrizzleOrderBy
 *
 * @example
 * ```typescript
 * import { users } from '@compliance-theater/database/schema';
 *
 * const getColumn = createTableColumnGetter(users, {
 *   // Map custom field names to table columns
 *   display_name: users.name,
 *   user_email: users.email,
 * });
 *
 * const orderedQuery = buildDrizzleOrderBy({
 *   query: db.select().from(users),
 *   source: gridSortModel,
 *   getColumn,
 * });
 * ```
 */
export const createTableColumnGetter = (
  table: Record<string, unknown>,
  customMappings: Record<string, PgColumn | SQL> = {}
): ((columnName: string) => PgColumn | SQL | undefined) => {
  return (columnName: string) => {
    // Check custom mappings first
    if (customMappings[columnName]) {
      return customMappings[columnName];
    }

    // Try direct table property access (only for valid identifier names)
    if (
      !columnName.includes('-') &&
      table[columnName] &&
      typeof table[columnName] === 'object'
    ) {
      return table[columnName] as PgColumn;
    }

    // Try common naming pattern conversions (only for valid identifier names)
    if (!columnName.includes('-')) {
      const camelCase = columnName.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase()
      );
      if (table[camelCase] && typeof table[camelCase] === 'object') {
        return table[camelCase] as PgColumn;
      }

      const snakeCase = columnName.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (table[snakeCase] && typeof table[snakeCase] === 'object') {
        return table[snakeCase] as PgColumn;
      }
    }

    return undefined;
  };
};
