import { isSqlNeonAdapter, unwrapAdapter } from '@/lib/neondb';
import { isLikeNextRequest } from '@/lib/nextjs-util';
import { GridSortModel } from '@mui/x-data-grid';
import { MaybeRow } from 'postgres';
import { isGridSortModel } from './guards';
import { BuildOrderByProps } from './types';
import { columnMapFactory, parseSortOptions } from './utility';

export const buildOrderBy = <
  RecordType extends MaybeRow = Exclude<MaybeRow, undefined>,
>({
  sql,
  source,
  defaultSort,
  columnMap = {},
}: BuildOrderByProps<RecordType>) => {
  const db = isSqlNeonAdapter(sql)
    ? unwrapAdapter<Exclude<RecordType, undefined>>(sql)
    : sql;
  columnMap = columnMapFactory(columnMap);
  const makeFragment = (input: GridSortModel) => {
    return db`${db`ORDER BY ${input.map((x) => {
      const fieldName = columnMap(x.field);
      return db`${db(fieldName)} ${x.sort === 'desc' ? db`desc` : db`asc`}`;
    })}`}`;
  };

  const sortBy = isGridSortModel(source)
    ? source
    : parseSortOptions(
        typeof source === 'string'
          ? new URL(source)
          : isLikeNextRequest(source)
            ? new URL(source.url!)
            : source,
      );
  if (!sortBy) {
    return defaultSort
      ? typeof defaultSort === 'string'
        ? db(defaultSort)
        : makeFragment(defaultSort)
      : db``;
  }
  return makeFragment(sortBy);
};
