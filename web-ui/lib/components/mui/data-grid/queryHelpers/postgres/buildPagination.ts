import { isSqlNeonAdapter, unwrapAdapter, SqlDb } from '@/lib/neondb';
import { BuildPaginationProps } from './types';
import { parsePaginationOptions } from '../utility';

/**
 * Build LIMIT and OFFSET clauses for PostgreSQL queries
 */
export const buildPagination = <RecordType extends Record<string, unknown> = Record<string, unknown>>({
  sql: sqlFromProps,
  source,
  defaultPageSize = 25,
  maxPageSize = 100,
}: BuildPaginationProps<RecordType>) => {
  const sql = isSqlNeonAdapter(sqlFromProps) 
    ? unwrapAdapter<RecordType>(sqlFromProps) 
    : sqlFromProps as SqlDb<RecordType>;

  const { offset, limit } = parsePaginationOptions(source, defaultPageSize, maxPageSize);
  
  return sql`LIMIT ${limit} OFFSET ${offset}`;
};