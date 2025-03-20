import type { PostgresError } from 'postgres';

export const isDbError = (error: unknown): error is PostgresError =>
  !!error &&
  typeof error === 'object' &&
  'name' in error &&
  error.name === 'PostgresError';
