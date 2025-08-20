/**
 * @fileoverview Drizzle Filter Builder for Data Grid
 * 
 * This module provides functionality to apply dynamic filtering logic to Drizzle PgSelectBuilder
 * queries, similar to the postgres.js buildQueryFilter function but adapted for Drizzle ORM.
 * 
 * @module lib/components/mui/data-grid/buildDrizzleFilter
 * @version 1.0.0
 * @since 2025-07-27
 */

import { isLikeNextRequest } from '@/lib/nextjs-util/guards';
import type { GridFilterModel } from '@mui/x-data-grid-pro';
import { and, or, eq, ne, ilike, isNull, isNotNull, inArray, notInArray, gt, lt, gte, lte, between, notBetween, SQL, sql } from 'drizzle-orm';
import type { AnyPgSelect } from 'drizzle-orm/pg-core';
import { isGridFilterModel } from '../../guards';
import { columnMapFactory, parseFilterOptions } from '../utility';
import { isTruthy } from '@/lib/react-util/_utility-methods';
import { schema } from '@/lib/drizzle-db';
import type { BuildDrizzleAttachmentOrEmailFilterProps, BuildDrizzleItemFilterProps, BuildDrizzleQueryFilterProps, DrizzleSelectQuery } from './types';

/**
 * Appends a filter condition to a DrizzleSelectQuery.
 *
 * If the `append` SQL filter is provided and contains query chunks, it is added to the query's `where` clause.
 * - If the query has no existing `where` clause, the filter is simply appended.
 * - If the query already has a `where` clause, the new filter is combined with the existing one using an `and` operation.
 * - If no filter is provided or there are no query chunks, the original query is returned unchanged.
 *
 * @param query - The original DrizzleSelectQuery to which the filter will be appended.
 * @param append - The SQL filter to append, or `undefined` if no filter should be added.
 * @returns The updated DrizzleSelectQuery with the appended filter, or the original query if no changes were made.
 */
export const appendFilter = ({
  query,
  append,
}: {
  query: DrizzleSelectQuery;
  append: SQL | undefined;
}): DrizzleSelectQuery => {
  // If there is nothing to append then there is nothing to do
  if (typeof append === 'undefined' || !append.queryChunks?.length) {
    return query;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyQuery = query as any;
  // If the query has no where clause then just pop it on
  if (!anyQuery._?.config?.where?.queryChunks?.length) {
    return anyQuery.where(append) as AnyPgSelect;
  }
  // Otherwise, and the two queries together and set that
  const left: SQL = anyQuery._.config.where!;
  const right: SQL = append!;
  if (left && right) {
    const combinedQuery = and(left, right);
    if (combinedQuery) {
      return anyQuery.where(combinedQuery) as AnyPgSelect;
    }
  }
  // If we made it all the way to here then there was nothing for us to do
  return query;
};





/**
 * Creates a Drizzle-compatible filter for attachment or email queries.
 * 
 * This function builds a SQL condition that can filter documents to include either
 * attachments (when attachments = true) or only emails (when attachments = false).
 * 
 * @param props - Configuration props for building the attachment/email filter
 * @returns A SQL condition that can be used with Drizzle's where() method
 * 
 * @example
 * ```typescript
 * import { emails } from '@/drizzle/schema';
 * 
 * const condition = buildDrizzleAttachmentOrEmailFilter({
 *   attachments: true,
 *   email_id: 'email-123',
 *   email_id_column: emails.emailId,
 *   document_id_column: emails.documentId,
 * });
 * 
 * const result = await db.select().from(emails).where(condition);
 * ```
 */
export const buildDrizzleAttachmentOrEmailFilter = ({
  attachments,
  email_id,
  email_id_column,
  document_id_column,
  emailToDocumentIdFn,
}: BuildDrizzleAttachmentOrEmailFilterProps): SQL | undefined => {
  if (!email_id) {
    return undefined;
  }

  let includeAttachments = true;
  if (typeof attachments === 'boolean') {
    includeAttachments = attachments;
  } else if (typeof attachments === 'object' && attachments !== null) {
    let searchParams: URLSearchParams;
    if (attachments instanceof URL) {
      searchParams = attachments.searchParams;
    } else if (attachments instanceof URLSearchParams) {
      searchParams = attachments;
    } else if (isLikeNextRequest(attachments)) {
      searchParams = new URL(attachments.url!).searchParams;
    } else {      
      // Handle generic objects with url property
      const asObj = attachments as Record<string, unknown>;
      if (asObj && asObj.url && typeof asObj.url === 'string') {
        try {
          searchParams = new URL(asObj.url).searchParams;
        } catch {
          throw new Error('Invalid attachments parameter', { cause: attachments });
        }
      } else {
        throw new Error('Invalid attachments parameter', {
          cause: attachments,
        });
      }
    }    
    // Default to include attachments if parameter is missing
    if (!searchParams.has('attachments')) {
      includeAttachments = true;
    } else {
      includeAttachments = isTruthy(searchParams.get('attachments'));
    }
  }

  if (!email_id_column) {
    email_id_column = schema.documentUnits.emailId;
  }

  if (includeAttachments) {
    if ('table' in email_id_column) {
      return eq(email_id_column, email_id);
    } else {
      return eq(email_id_column, sql`${email_id}`);
    }
  }
  if (emailToDocumentIdFn) {
    // If emailToDocumentIdFn is provided, use it to filter by document ID
    if ('table' in document_id_column) {
      return eq(document_id_column, emailToDocumentIdFn(email_id));
    } else {
      return eq(document_id_column, emailToDocumentIdFn(email_id));
    }
  } else {
    // Fallback: use a custom SQL function call
    if ('table' in document_id_column) {
      return eq(document_id_column, sql`email_to_document_id(${email_id})`);
    } else {
      return eq(document_id_column, sql`email_to_document_id(${email_id})`);
    }
  }  
};

/**
 * Creates a Drizzle-compatible filter condition for a single filter item.
 * 
 * This function converts MUI Data Grid filter operators into corresponding Drizzle ORM
 * filter conditions.
 * 
 * @param props - Configuration props for building the item filter
 * @returns A SQL condition that can be used with Drizzle's where() method
 * 
 * @example
 * ```typescript
 * import { users } from '@/drizzle/schema';
 * 
 * const getColumn = (name: string) => {
 *   switch (name) {
 *     case 'name': return users.name;
 *     case 'email': return users.email;
 *     default: return undefined;
 *   }
 * };
 * 
 * const condition = buildDrizzleItemFilter({
 *   item: { field: 'name', operator: 'contains', value: 'John' },
 *   getColumn,
 * });
 * 
 * const result = await db.select().from(users).where(condition);
 * ```
 */
export const buildDrizzleItemFilter = ({
  item,
  getColumn,
  columnMap = {},
}: BuildDrizzleItemFilterProps): SQL | undefined => {
  const columnMapper = columnMapFactory(columnMap);
  const mappedField = columnMapper(item.field);
  const column = getColumn(mappedField);
  
  if (!column) {
    console.warn(`buildDrizzleItemFilter: Unknown column '${mappedField}' (mapped from '${item.field}')`);
    return undefined;
  }

  switch (item.operator) {
    case 'equals':
      return 'table' in column ? eq(column, item.value) : eq(sql`${column}`, item.value);
    case 'notEquals':
      return 'table' in column ? ne(column, item.value) : ne(sql`${column}`, item.value);
    case 'contains':
      return ilike(column, `%${item.value}%`);
    case 'notContains':
      return sql`${column} NOT ILIKE ${`%${item.value}%`}`;
    case 'startsWith':
      return ilike(column, `${item.value}%`);
    case 'endsWith':
      return ilike(column, `%${item.value}`);
    case 'isEmpty':
      return or(isNull(column), 'table' in column ? eq(column, '') : eq(sql`${column}`, ''));
    case 'isNotEmpty':
      return and(isNotNull(column), 'table' in column ? ne(column, '') : ne(sql`${column}`, ''));
    case 'isAnyOf':
      return 'table' in column ? inArray(column, item.value) : inArray(sql`${column}`, item.value);
    case 'isNoneOf':
      return 'table' in column ? notInArray(column, item.value) : notInArray(sql`${column}`, item.value);
    case 'isGreaterThan':
      return 'table' in column ? gt(column, item.value) : gt(sql`${column}`, item.value);
    case 'isLessThan':
      return 'table' in column ? lt(column, item.value) : lt(sql`${column}`, item.value);
    case 'isGreaterThanOrEqual':
      return 'table' in column ? gte(column, item.value) : gte(sql`${column}`, item.value);
    case 'isLessThanOrEqual':
      return 'table' in column ? lte(column, item.value) : lte(sql`${column}`, item.value);
    case 'isBetween':
      return 'table' in column ? between(column, item.value[0], item.value[1]) : between(sql`${column}`, item.value[0], item.value[1]);
    case 'isNotBetween':
      return 'table' in column ? notBetween(column, item.value[0], item.value[1]) : notBetween(sql`${column}`, item.value[0], item.value[1]);
    case 'isNull':
      return isNull(column);
    case 'isNotNull':
      return isNotNull(column);
    case 'in':
      // Handle array containment - this is PostgreSQL specific
      return sql`${item.value} = ANY(${column})`;
    default:
      throw new Error(`Unsupported operator: ${item.operator}`, {
        cause: item,
      });
  }
};

/**
 * Applies dynamic filter logic to a Drizzle select query.
 * 
 * This function parses filter options from various sources (URL parameters, GridFilterModel, etc.)
 * and applies the appropriate where clauses to a Drizzle query builder.
 * 
 * @param props - Configuration props for building the query filter
 * @returns The query builder with where clauses applied
 * 
 * @example
 * ```typescript
 * // Basic usage with a simple column map
 * const query = db.select().from(users);
 * const filteredQuery = buildDrizzleQueryFilter({
 *   query,
 *   source: searchParams, // or URL, GridFilterModel, etc.
 *   getColumn: (name) => {
 *     switch (name) {
 *       case 'name': return users.name;
 *       case 'email': return users.email;
 *       case 'created_at': return users.createdAt;
 *       default: return undefined;
 *     }
 *   },
 *   columnMap: { displayName: 'name', userEmail: 'email' },
 * });
 * 
 * // Usage with table schema object
 * const tableColumns = {
 *   name: users.name,
 *   email: users.email,
 *   created_at: users.createdAt,
 * };
 * 
 * const filteredQuery = buildDrizzleQueryFilter({
 *   query: db.select().from(users),
 *   source: req.url,
 *   getColumn: (name) => tableColumns[name as keyof typeof tableColumns],
 *   defaultFilter: [{ field: 'name', operator: 'isNotEmpty', value: '' }],
 * });
 * ```
 */
export const buildDrizzleQueryFilter = ({
  query,
  source,
  getColumn,
  defaultFilter,
  columnMap = {},
  additional,
}: BuildDrizzleQueryFilterProps): DrizzleSelectQuery => {
  
  /**
   * Parses the filter model from the source.
   */
  const parseFilterFromSource = (src: typeof source): GridFilterModel | undefined => {
    if (isGridFilterModel(src)) {
      return src;
    }
    
    if (typeof src === 'string') {
      try {
        const url = new URL(src);
        return parseFilterOptions(url.searchParams, additional);
      } catch {
        // If string is not a valid URL, return undefined
        return undefined;
      }
    }
    
    if (src instanceof URL) {
      return parseFilterOptions(src.searchParams, additional);
    }
    
    if (isLikeNextRequest(src)) {
      try {
        const url = new URL(src.url!);
        return parseFilterOptions(url.searchParams, additional);
      } catch {
        return undefined;
      }
    }
    
    return undefined;
  };

  // Parse the filter model from the source
  let filterModel = parseFilterFromSource(source);
  
  // If no filter from source, try default filter
  if (!filterModel && defaultFilter) {
    filterModel = parseFilterFromSource(defaultFilter);
  }
  
  // If still no filter model or no items, return original query
  if (!filterModel || !filterModel.items || filterModel.items.length === 0) {
    return query;
  }

  // Build filter conditions
  const conditions: SQL[] = [];
  
  for (const item of filterModel.items) {
    const condition = buildDrizzleItemFilter({ item, getColumn, columnMap });
    if (condition) {
      conditions.push(condition);
    }
  }

  // If no valid conditions, return original query
  if (conditions.length === 0) {
    return query;
  }
  
  // Combine conditions based on logic operator
  const logicOperator = filterModel.logicOperator || 'and';
  const combinedCondition = logicOperator === 'or' 
    ? or(...conditions)
    : and(...conditions);

  return appendFilter({
    query,
    append: combinedCondition,
  });  
};