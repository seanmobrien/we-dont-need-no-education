import { parsePaginationStats } from '@/data-models';
import { PaginatedGridListRequest } from './types';
import { LikeNextRequest } from '@/lib/nextjs-util';
import { MaybeRow, ParameterOrFragment } from 'postgres';
import {
  ISqlNeonAdapter,
  SqlDb,
  isSqlNeonAdapter,
  unwrapAdapter,
} from '@/lib/neondb';

export const buildPagination = <
  RecordType extends Exclude<MaybeRow, undefined> = Exclude<
    MaybeRow,
    undefined
  >,
>({
  req,
  sql,
}: {
  req:
    | URL
    | URLSearchParams
    | (PaginatedGridListRequest | undefined)
    | LikeNextRequest;
  sql: ISqlNeonAdapter | SqlDb<RecordType>;
}): ParameterOrFragment<string> => {
  const db = isSqlNeonAdapter(sql) ? unwrapAdapter<RecordType>(sql) : sql;
  const { num, offset } = parsePaginationStats(req);
  return db`LIMIT ${num} OFFSET ${offset}`;
};
