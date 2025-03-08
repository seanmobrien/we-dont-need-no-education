/**
 * @module neondb
 * This module provides a connection to the Neon database using the serverless adapter.
 */

import {
  FieldDef,
  FullQueryResults,
  neon,
  NeonQueryFunction,
  NeonQueryPromise,
  QueryRows,
} from '@neondatabase/serverless';

import { isNeonDbError } from './_guards';
export { isNeonDbError };

export type QueryProps<ResultType extends object = Record<string, unknown>> = {
  transform?: (result: Record<string, unknown>) => ResultType;
};

export type TransformedFullQueryResults<
  ResultType extends object = Record<string, unknown>
> = {
  fields: FieldDef[];
  command: string;
  rowCount: number;
  rowAsArray: boolean;
  rows: Array<ResultType>;
};

const connection = () => {
  const ret =
    typeof process.env.DATABASE_URL === 'string'
      ? process.env.DATABASE_URL
      : '';
  if (ret === '') {
    throw new Error('DATABASE_URL is not set');
  }
  return ret;
};

const asRecord = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: Record<string, unknown> | any[]
): Record<string, unknown> =>
  Array.isArray(result)
    ? result.reduce((acc, cur, idx) => {
        acc[`column${idx}`] = cur;
        return acc;
      }, {} as Record<string, unknown>)
    : result;

const applyTransform = <ResultType extends object>(
  promise: NeonQueryPromise<boolean, boolean, QueryRows<boolean>>,
  props: QueryProps<ResultType> = {}
): Promise<Array<ResultType>> => {
  if (typeof props.transform != 'function') {
    return promise as Promise<Array<ResultType>>;
  }
  const { transform } = props;
  return promise.then((result) => {
    if (isNeonDbError(result)) {
      throw result;
    }
    return result.map((r) => transform(asRecord(r)));
  });
};

const applyResultsetTransform = <ResultType extends object>(
  promise: Promise<FullQueryResults<boolean>>,
  props: QueryProps<ResultType> = {}
): Promise<TransformedFullQueryResults<ResultType>> =>
  promise.then((result) => ({
    ...result,
    rows: result.rows.map((r) =>
      typeof props.transform === 'function'
        ? props.transform(asRecord(r))
        : (asRecord(r) as ResultType)
    ),
  }));

/**
 * Executes a query against the Neon database.
 *
 * @param cb - A callback function that receives a NeonQueryFunction and returns a NeonQueryPromise.
 * @returns A NeonQueryPromise that resolves to the query results.
 * @type {(cb: (sql: NeonQueryFunction<false, false>) => NeonQueryPromise<false, false, QueryRows<false>>) => NeonQueryPromise<false, false, QueryRows<false>>}
 */
export const query = <ResultType extends object = Record<string, unknown>>(
  cb: (
    sql: NeonQueryFunction<false, false>
  ) => NeonQueryPromise<boolean, boolean, QueryRows<boolean>>,
  props: QueryProps<ResultType> = {}
): Promise<Array<ResultType>> =>
  applyTransform<ResultType>(
    cb(neon(connection(), { fullResults: false })),
    props
  );

/**
 * Executes a query against the Neon database with extended results.
 *
 * @param cb - A callback function that receives a NeonQueryFunction and returns a NeonQueryPromise with full query results.
 * @returns A NeonQueryPromise that resolves to the full query results.
 * @type {(cb: (sql: NeonQueryFunction<false, true>) => NeonQueryPromise<false, true, FullQueryResults<boolean>>) => NeonQueryPromise<false, true, FullQueryResults<true>>}
 */
export const queryExt = <ResultType extends object = Record<string, unknown>>(
  cb: (
    sql: NeonQueryFunction<false, true>
  ) => NeonQueryPromise<boolean, boolean, FullQueryResults<boolean>>,
  props: QueryProps<ResultType> = {}
): Promise<TransformedFullQueryResults<ResultType>> =>
  applyResultsetTransform(
    cb(neon(connection(), { fullResults: true })) as NeonQueryPromise<
      false,
      true,
      FullQueryResults<true>
    >,
    props
  );
