import type { IPostgresError } from '@compliance-theater/logger/errors';
import type { RowList } from 'postgres';
import type { IResultset } from './types';
import { Resultset } from './index-postgres';

export const isDbError = (error: unknown): error is IPostgresError =>
  !!error &&
  typeof error === 'object' &&
  'name' in error &&
  error.name === 'IPostgresError';

export const isResultset = <T extends readonly any[]>(
  check: unknown,
): check is IResultset<T> => Resultset.isResultset<T>(check);

export const isRowList = <T extends readonly any[]>(
  check: unknown,
): check is RowList<T> => Resultset.isRowList<T>(check);
