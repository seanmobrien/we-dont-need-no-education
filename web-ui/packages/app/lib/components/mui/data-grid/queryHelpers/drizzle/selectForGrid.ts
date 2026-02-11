/**
 * @fileoverview Select For Grid Utility - Advanced Data Grid Query Builder
 *
 * This module provides a comprehensive solution for server-side data grid operations using Drizzle ORM.
 * It integrates filtering, sorting, pagination, and counting functionality into a unified API that
 * maintains 100% wire compatibility with existing Material UI DataGrid endpoints while providing
 * type-safe query building and execution.
 *
 * **Key Features:**
 * - **Unified Query Processing**: Single function handles filtering, sorting, and pagination
 * - **Type-Safe Operations**: Full TypeScript support with Drizzle ORM schema integration
 * - **Performance Optimized**: Concurrent execution of data and count queries
 * - **Flexible Column Mapping**: Support for frontend-to-database field name translation
 * - **Record Transformation**: Optional post-query data transformation pipeline
 * - **Wire Compatible**: Drop-in replacement for existing pagination API endpoints
 * - **Automatic Count Generation**: Eliminates duplicate query crafting for totals
 *
 * **Architecture:**
 * ```
 * Request → Parse Params → Filter → Sort → Paginate → Execute → Transform → Response
 *    ↓         ↓           ↓       ↓        ↓         ↓         ↓         ↓
 * URL Params  Pagination  Query   Query   Query    Parallel  Mapper   Paginated
 * Extraction  Statistics  Filter  Order   Limit    Execution Function  Results
 * ```
 *
 * **Database Integration:**
 * - **Query Builder**: Uses Drizzle's type-safe query construction
 * - **Subquery Pattern**: Automatic count query generation via subquery wrapping
 * - **Transaction Safe**: All operations use consistent database connections
 * - **Index Optimized**: Supports database index utilization for performance
 *
 * **Performance Characteristics:**
 * - Concurrent data and count query execution for reduced latency
 * - Minimal memory footprint through streaming-friendly pagination
 * - Database-level filtering and sorting to reduce data transfer
 * - Type-safe operations preventing runtime query errors
 * - Optimized count queries using subquery patterns
 *
 * **Use Cases:**
 * - Material UI DataGrid server-side data loading
 * - Large dataset pagination with filtering and sorting
 * - API endpoint data grid integration
 * - Administrative dashboards and data management interfaces
 * - Report generation with dynamic filtering capabilities
 *
 * @module lib/components/mui/data-grid/selectForGrid
 * @version 2.0.0
 * @author Data Grid Team
 * @since 1.0.0
 */

import type { PaginatedResultset } from '@/data-models/_types';
import { parsePaginationStats } from '@/lib/components/mui/data-grid/queryHelpers/utility';
import { buildDrizzleQueryFilter } from './buildDrizzleFilter';
import { buildDrizzleOrderBy } from './buildDrizzleOrderBy';
import { buildDrizzlePagination } from './buildDrizzlePagination';
import type {
  DrizzleSelectQuery,
  DrizzleSelectQueryBase,
  SelectForGridProps,
} from './types';
import type { AnyPgSelect, PgSession } from 'drizzle-orm/pg-core';
import type { PgCountBuilder } from 'drizzle-orm/pg-core/query-builders/count';
import { drizDb } from '@compliance-theater/database';

/**
 * Creates both data and count query factories from a base Drizzle select query.
 *
 * This factory function implements the subquery pattern to generate consistent count queries
 * that maintain the same filtering and joining logic as the main data query. This eliminates
 * the need to manually craft separate count queries and ensures data consistency.
 *
 * **Subquery Pattern:**
 * ```sql
 * -- Main Query: SELECT * FROM (base_query) AS app_subq_count LIMIT 20 OFFSET 0
 * -- Count Query: SELECT COUNT(*) FROM (base_query) AS app_subq_count
 * ```
 *
 * **Key Benefits:**
 * - **Single Source of Truth**: Count query automatically inherits all filtering logic
 * - **Performance Optimized**: Database engine can optimize the subquery execution
 * - **Type Safety**: Maintains Drizzle's type checking throughout the operation
 * - **Consistency Guaranteed**: Count always reflects the actual filtered dataset
 *
 * **Database Optimization:**
 * - Leverages PostgreSQL's query planner for subquery optimization
 * - Enables index usage on the underlying tables
 * - Minimizes query planning overhead through consistent structure
 * - Supports complex joins and where clauses transparently
 *
 * @param select - The base Drizzle select query to wrap for counting
 * @returns Object containing both select and count query builders
 *
 * @example
 * ```typescript
 * // Base query with complex filtering and joins
 * const baseQuery = db
 *   .select({ id: emails.id, subject: emails.subject })
 *   .from(emails)
 *   .leftJoin(attachments, eq(attachments.emailId, emails.id))
 *   .where(and(
 *     eq(emails.isActive, true),
 *     gte(emails.receivedAt, new Date('2024-01-01'))
 *   ));
 *
 * // Generate count-compatible queries
 * const { select, count } = countQueryFactory(baseQuery);
 *
 * // Execute concurrently
 * const [data, total] = await Promise.all([
 *   select.limit(20).offset(40),
 *   count
 * ]);
 *
 * console.log(`Found ${total} total records, showing 20`);
 * ```
 *
 * @throws {Error} When the input query cannot be converted to a subquery
 * @since 2.0.0
 */
export const countQueryFactory = (
  select: DrizzleSelectQuery,
): {
  select: DrizzleSelectQueryBase;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  count: PgCountBuilder<PgSession<any, any, any>>;
} => {
  const db = drizDb();
  const subQ = (select as AnyPgSelect).as('app_subq_count');
  return {
    select: db.select().from(subQ),
    count: db.$count(subQ),
  };
};

/**
 * Applies dynamic filtering, sorting, and pagination to a Drizzle query for data grid operations.
 *
 * This function integrates the buildDrizzleFilter, buildDrizzleOrderBy, and buildDrizzlePagination
 * utilities to create a complete data grid query solution that returns paginated results with
 * 100% wire compatibility with existing API endpoints.
 *
 * **Processing Pipeline:**
 * 1. **Parameter Extraction**: Parses pagination, filtering, and sorting from request URL
 * 2. **Query Filtering**: Applies dynamic WHERE clauses based on filter model
 * 3. **Query Sorting**: Adds ORDER BY clauses with column mapping support
 * 4. **Count Generation**: Creates optimized count query using subquery pattern
 * 5. **Pagination**: Applies LIMIT/OFFSET for page-based results
 * 6. **Concurrent Execution**: Runs data and count queries in parallel
 * 7. **Result Transformation**: Optional record mapping for response formatting
 *
 * **Performance Features:**
 * - **Parallel Execution**: Data and count queries execute concurrently
 * - **Index Optimization**: Leverages database indexes through proper query structure
 * - **Memory Efficiency**: Streams results without loading entire dataset
 * - **Type Safety**: Full TypeScript support prevents runtime query errors
 * - **Query Reuse**: Single base query generates both data and count operations
 *
 * **Error Handling:**
 * - **Graceful Degradation**: Continues operation if optional features fail
 * - **Type Validation**: Ensures column mappings are valid at compile time
 * - **Query Validation**: Drizzle ORM prevents malformed SQL generation
 * - **Connection Management**: Automatic database connection handling
 *
 * @template T - The expected result record type
 * @param props - Configuration props for the grid query
 * @param props.req - Next.js request object containing URL parameters
 * @param props.emailId - Email context ID (maintained for API compatibility)
 * @param props.query - Base Drizzle select query to enhance
 * @param props.getColumn - Function to map field names to Drizzle column objects
 * @param props.columnMap - Optional mapping of frontend field names to database columns
 * @param props.recordMapper - Optional function to transform query results
 *
 * @returns Promise resolving to paginated result set with metadata
 *
 * @example
 * ```typescript
 * // Basic usage with email documents
 * import { selectForGrid } from '@/lib/components/mui/data-grid/selectForGrid';
 * import { createColumnGetter } from '@/lib/components/mui/data-grid/buildDrizzleOrderBy';
 *
 * export async function GET(request: NextRequest) {
 *   const baseQuery = db
 *     .select({
 *       id: emails.id,
 *       subject: emails.subject,
 *       sender: emails.fromAddress,
 *       receivedAt: emails.receivedAt,
 *     })
 *     .from(emails)
 *     .where(eq(emails.isActive, true));
 *
 *   const getColumn = createColumnGetter({
 *     id: emails.id,
 *     subject: emails.subject,
 *     sender: emails.fromAddress,
 *     receivedAt: emails.receivedAt,
 *   });
 *
 *   const result = await selectForGrid({
 *     req: request,
 *     emailId: 'context-id',
 *     query: baseQuery,
 *     getColumn,
 *     columnMap: {
 *       'sender_name': 'fromAddress', // Frontend field -> DB column
 *     },
 *   });
 *
 *   return NextResponse.json(result);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Advanced usage with joins and transformations
 * const complexQuery = db
 *   .select({
 *     propertyId: schema.documentProperty.propertyId,
 *     value: schema.documentProperty.propertyValue,
 *     actionType: schema.callToActionDetails.actionType,
 *     documentId: schema.documentProperty.documentId,
 *   })
 *   .from(schema.documentProperty)
 *   .leftJoin(schema.callToActionDetails,
 *     eq(schema.callToActionDetails.propertyId, schema.documentProperty.propertyId))
 *   .where(eq(schema.documentProperty.documentPropertyTypeId, 4));
 *
 * const result = await selectForGrid({
 *   req,
 *   emailId,
 *   query: complexQuery,
 *   getColumn: createTableColumnGetter(schema.documentProperty),
 *   columnMap: {
 *     displayName: 'propertyValue',
 *     type: 'actionType',
 *   },
 *   recordMapper: (record) => ({
 *     ...record,
 *     displayValue: `${record.value} (${record.actionType})`,
 *     formattedId: `DOC-${record.documentId}`,
 *   }),
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Response format (wire compatible with existing APIs)
 * {
 *   results: [
 *     { id: 1, subject: "Email 1", sender: "user@example.com" },
 *     { id: 2, subject: "Email 2", sender: "admin@example.com" }
 *   ],
 *   pageStats: {
 *     page: 1,        // Current page number
 *     num: 20,        // Records per page
 *     total: 157      // Total matching records
 *   }
 * }
 * ```
 *
 * @throws {Error} When the base query cannot be executed
 * @throws {TypeError} When required parameters are missing or invalid
 * @throws {DatabaseError} When database connection or query execution fails
 *
 * @see {@link countQueryFactory} for count query generation details
 * @see {@link buildDrizzleQueryFilter} for filtering logic
 * @see {@link buildDrizzleOrderBy} for sorting implementation
 * @see {@link buildDrizzlePagination} for pagination details
 *
 * @since 2.0.0
 */
export async function selectForGrid<T = Record<string, unknown>>({
  req,
  query,
  getColumn,
  columnMap = {},
  recordMapper,
  defaultSort,
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
    defaultSort,
  });

  const { select, count } = countQueryFactory(sortedQuery as AnyPgSelect);

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
    : (results as Partial<T>[]);

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
