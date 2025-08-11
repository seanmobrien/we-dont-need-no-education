import { GridSortModel } from '@mui/x-data-grid';
import { isSqlNeonAdapter, unwrapAdapter, SqlDb } from '@/lib/neondb';
import { isGridSortModel } from './guards';
import { BuildOrderByProps } from './types';
import { columnMapFactory, parseSortOptions } from '../utility';

/**
 * Build ORDER BY clause for PostgreSQL queries
 */
export const buildOrderBy = <RecordType extends Record<string, unknown> = Record<string, unknown>>({
  sql: sqlFromProps,
  source,
  defaultSort,
  columnMap = {},
}: BuildOrderByProps<RecordType>) => {
  const sql = isSqlNeonAdapter(sqlFromProps) 
    ? unwrapAdapter<RecordType>(sqlFromProps) 
    : sqlFromProps as SqlDb<RecordType>;

  const mapColumn = columnMapFactory(columnMap);
  
  // Parse sort options from source
  let sortModel: GridSortModel = [];
  
  if (source) {
    sortModel = parseSortOptions(source)!;
  }
  
  // Use default sort if no sort model found
  if (!sortModel?.length && defaultSort) {
    if (typeof defaultSort === 'string') {
      sortModel = [{ field: defaultSort, sort: 'asc' }];
    } else if (isGridSortModel(defaultSort)) {
      sortModel = defaultSort;
    }
  }
  
  if (!sortModel?.length) {
    return sql``;
  }
  
  // Build ORDER BY clause
  const orderClauses = sortModel.map(item => {
    const column = mapColumn(item.field);
    const direction = item.sort === 'desc' ? 'DESC' : 'ASC';
    return sql`${column} ${direction}`;
  });
  
  return sql`ORDER BY ${orderClauses.join(', ')}`;
};