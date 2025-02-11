import type { NeonDbError } from '@neondatabase/serverless';

export const isNeonDbError = (error: unknown): error is NeonDbError =>
  !!error &&
  typeof error === 'object' &&
  'name' in error &&
  error.name === 'NeonDbError';
