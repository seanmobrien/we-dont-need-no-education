/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test utilities: Drizzle ORM query builder mock types and helpers.
 *
 * This module defines strongly-typed utilities used by Jest tests to simulate
 * Drizzle ORM-style query builders. It exposes:
 * - A curated list of supported query builder method names (`QueryBuilderMethodValues`)
 * - Narrowed method name union (`QueryBuilderMethodType`)
 * - Shapes for mock query records, contexts, and results
 * - A minimal query builder interface (`IMockQueryBuilder`) that provides jest.Mock
 *   stubs for common chaining methods and a small API to set/inspect mock rows.
 *
 * The goal is to enable expressive, type-safe test doubles without leaking
 * implementation details of the real database layer.
 */
/**
 * List of query builder method names that tests commonly stub.
 *
 * These map to jest.Mock functions on `IMockQueryBuilder` so tests can
 * arrange fluent chains like: `db.from('table').select(...).where(...).execute()`.
 */
export const QueryBuilderMethodValues = [
  'from',
  'select',
  'where',
  'orderBy',
  'limit',
  'offset',
  'execute',
  'innerJoin',
  'fullJoin',
  'groupBy',
  'as',
  'leftJoin',
] as const;

export const InsertBuilderMethodValues = [
  'values',
  'onConflictDoUpdate',
] as const;
export type InsertBuilderMethodType =
  (typeof InsertBuilderMethodValues)[number];

/**
 * Union of allowed query builder method names.
 *
 * Example: `let method: QueryBuilderMethodType = 'select'`.
 */
export type QueryBuilderMethodType = (typeof QueryBuilderMethodValues)[number];

/**
 * Minimal representation of a mock query record used by some tests.
 */
export type MockDbQueryRecord = {
  /** Rows to be returned by the mock. */
  rows: Record<string, unknown>[];
  /** Optional state blob carried alongside results. */
  state: unknown;
};

/**
 * Runtime context provided to a mock callback for rich assertions and control.
 */
export type MockDbQueryContext = {
  /** The mock builder instance under test. */
  db: IMockQueryBuilder;
  context: {
    /** Jest mock invocation context for the current call. */
    current: jest.MockContext<any, any, any>;
    /** Jest mock invocation context for the previous call in this chain. */
    last: jest.MockContext<any, any, any> | undefined;
  };
  call: {
    /** Alias of context.current for convenience. */
    current: jest.MockContext<any, any, any>;
    /** Alias of context.last for convenience. */
    last: jest.MockContext<any, any, any> | undefined;
  };
  /** Number of calls observed so far for the active mock method. */
  count: number;
  /**
   * Predicate that indicates whether the current `from(...)` table matches the provided value.
   * Useful when building switch-like logic inside the callback.
   */
  isFrom: (table: unknown) => boolean;
  /** The `from(...)` value captured in the current chain, if any. */
  from: unknown;
  /** A query-shaped object captured by the mock chain (user-defined). */
  query: object | undefined;
  /** The resolved rows produced by the callback for the current invocation. */
  result: Record<string, unknown>[];
  /** Optional state payload to transport alongside results. */
  state: unknown;
};

/**
 * Normalized result shape returned by test helpers to the calling code.
 */
export type MockDbQueryResult = {
  /** Rows returned by the fake database call. */
  rows: Record<string, unknown>[];
  /** Number of rows (or operations) affected. */
  count: number;
  /** Optional state payload. */
  state?: unknown;
};

/**
 * Allowed return values from a mock callback. Callbacks can:
 * - Return a normalized `MockDbQueryResult`
 * - Return raw rows (array of objects) for convenience
 * - Return `undefined`/`null`/`boolean` for early-exit or control signaling
 */
export type MockDbQueryCallbackResult =
  | MockDbQueryResult
  | Record<string, unknown>[]
  | undefined
  | null
  | boolean;

/**
 * Signature for an async mock callback used to compute results given a context.
 */
export type MockDbQueryCallback = (
  context: MockDbQueryContext,
) => Promise<MockDbQueryCallbackResult>;

/**
 * Minimal, chainable query builder interface used in tests.
 *
 * All common builder methods are exposed as `jest.Mock`s to support
 * fluent chaining and invocation inspection via `mock.calls`, `mock.results`, etc.
 * In addition, a small control surface is provided to seed rows, inspect
 * current records, and reset mocks between tests.
 */
export type IMockQueryBuilder = {
  /** Mapping of supported builder methods to Jest mocks. */
  [K in QueryBuilderMethodType]: jest.Mock;
} & {
  insert(...args: any[]): IMockInsertBuilder;
  /**
   * Seed the mock with rows or provide a callback to compute them dynamically.
   *
   * - When `v` is an array, it becomes the returned `rows`.
   * - When `v` is a callback, it will receive a `MockDbQueryContext` and may
   *   return rows or a `MockDbQueryResult` for fine-grained control.
   *
   * @typeParam T - Row shape stored in the mock
   * @param v Rows array or async callback
   * @param rows Optional override rows when `v` is a callback (rarely used)
   * @param state Optional opaque state to carry through the mock
   */
  __setRecords: <T extends Record<string, unknown> = Record<string, unknown>>(
    v: T[] | MockDbQueryCallback,
    rows?: T[] | null,
    state?: unknown,
  ) => void;
  /**
   * Retrieve the currently seeded rows in a typed fashion.
   * @typeParam T - Expected row shape
   */
  __getRecords: <T>() => T[];
  /** Reset all jest mocks and internal state to their initial condition. */
  __resetMocks: () => void;
};

/**
 * Minimal, chainable query builder interface used in tests.
 *
 * All common builder methods are exposed as `jest.Mock`s to support
 * fluent chaining and invocation inspection via `mock.calls`, `mock.results`, etc.
 * In addition, a small control surface is provided to seed rows, inspect
 * current records, and reset mocks between tests.
 */
export type IMockInsertBuilder = {
  /** Mapping of supported builder methods to Jest mocks. */
  [K in InsertBuilderMethodType]: jest.Mock<IMockInsertBuilder>;
} & {
  /**
   * Seed the mock with rows or provide a callback to compute them dynamically.
   *
   * - When `v` is an array, it becomes the returned `rows`.
   * - When `v` is a callback, it will receive a `MockDbQueryContext` and may
   *   return rows or a `MockDbQueryResult` for fine-grained control.
   *
   * @typeParam T - Row shape stored in the mock
   * @param v Rows array or async callback
   * @param rows Optional override rows when `v` is a callback (rarely used)
   * @param state Optional opaque state to carry through the mock
   */
  __setRecords: <T extends Record<string, unknown> = Record<string, unknown>>(
    v: T[] | MockDbQueryCallback,
    rows?: T[] | null,
    state?: unknown,
  ) => void;
  /**
   * Retrieve the currently seeded rows in a typed fashion.
   * @typeParam T - Expected row shape
   */
  __getRecords: <T>() => T[];
  /** Reset all jest mocks and internal state to their initial condition. */
  __resetMocks: () => void;
};
