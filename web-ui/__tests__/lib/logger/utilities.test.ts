import { errorLogFactory, getDbError } from '@/lib/logger/utilities';

interface TestDbError extends Error {
  name: 'PostgresError';
  code: number;
  detail: string;
  severity: string | number;
  query?: string;
  internal_query?: string;
  where?: string;
  schema_name?: string;
  table_name?: string;
  column_name?: string;
}

describe('logger/utilities', () => {
  describe('getDbError', () => {
    const makePgError = (overrides: Partial<TestDbError> = {}): TestDbError => ({
      name: 'PostgresError',
      message: 'db failed',
      code: 23505,
      detail: 'duplicate key',
      severity: 'ERROR',
      query: 'select 1',
      internal_query: 'select 1',
      where: 'near foo',
      schema_name: 'public',
      table_name: 'users',
      column_name: 'email',
      ...overrides,
    } as unknown as TestDbError);

    test('returns undefined for primitives or plain objects', () => {
      expect(getDbError(null)).toBeUndefined();
      expect(getDbError(42)).toBeUndefined();
      expect(getDbError({ name: 'Error' })).toBeUndefined();
    });

    test('detects top-level PostgresError', () => {
  const err = makePgError();
  const found = getDbError(err);
  // Identity check without using `any`
  expect(found).toBe(err as unknown as object);
    });

    test('detects PostgresError via error.cause', () => {
  const pg = makePgError();
  const wrapped = new Error('outer', { cause: pg });
      const found = getDbError(wrapped);
  expect(found).toBe(pg as unknown as object);
    });

    test('detects PostgresError via error.cause.error', () => {
      const pg = makePgError();
      const wrapped = { cause: { error: pg } } as unknown as Error;
      const found = getDbError(wrapped);
  expect(found).toBe(pg as unknown as object);
    });

    test('detects PostgresError via error.error', () => {
      const pg = makePgError();
      const wrapped = { error: pg } as unknown as Error;
      const found = getDbError(wrapped);
  expect(found).toBe(pg as unknown as object);
    });
  });

  describe('errorLogFactory', () => {
    test('formats non-error values and derives default message', () => {
      const payload = errorLogFactory({ error: { foo: 'bar' }, source: 'test' });
      expect(payload.source).toBe('test');
      expect(payload.message).toBe('Error occurred');
      expect(payload.error).toEqual({ foo: 'bar' });
    });

    test('includes message/stack for Error-like input', () => {
      const input = new Error('boom');
      input.stack = 'stacktrace';
      const payload = errorLogFactory({ error: input, source: 'svc' });
      if (payload && typeof payload.error === 'object' && payload.error) {
        const e = payload.error as { message?: string; stack?: string };
        expect(e.message).toBe('boom');
        expect(e.stack).toBe('stacktrace');
      } else {
        throw new Error('unexpected payload.error shape');
      }
      expect(payload.message).toBe('boom');
    });

    test('synthesizes stack when missing and merges include/params', () => {
      const input = { message: 'oops' } as unknown as Error;
      const payload = errorLogFactory({ error: input, source: 'svc', include: { a: 1 }, extra: true });
      expect(payload.source).toBe('svc');
      expect(payload.a).toBe(1);
      expect(payload.extra).toBe(true);
      if (payload && typeof payload.error === 'object' && payload.error) {
        const e = payload.error as { message?: string; stack?: string };
        expect(e.message).toBe('oops');
        expect(typeof e.stack).toBe('string');
      } else {
        throw new Error('unexpected payload.error shape');
      }
    });

    test('augments with DB fields when PostgresError is present', () => {
      const dbErr: TestDbError = {
        name: 'PostgresError',
        message: 'db fail',
        code: 23505,
        detail: 'dup',
        severity: 'ERROR',
        query: 'select 1',
        internal_query: 'select 1',
        where: 'near foo',
        schema_name: 'public',
        table_name: 'users',
        column_name: 'email',
      } as unknown as TestDbError;
      const payload = errorLogFactory({ error: dbErr, source: 'repo' });
      if (payload && typeof payload.error === 'object' && payload.error) {
        const e = payload.error as {
          name?: string;
          code?: number;
          detail?: string;
          severity?: string | number;
          internalQuery?: string;
          where?: string;
          schema?: string;
          table?: string;
          column?: string;
        };
        expect(e.name).toBe('PostgresError');
        expect(e.code).toBe(23505);
        expect(e.detail).toBe('dup');
        expect(e.severity).toBe('ERROR');
        expect(e.internalQuery).toBe('select 1');
        expect(e.where).toBe('near foo');
        expect(e.schema).toBe('public');
        expect(e.table).toBe('users');
        expect(e.column).toBe('email');
      } else {
        throw new Error('unexpected payload.error shape');
      }
    });
  });
});
