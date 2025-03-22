/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @module db
 * This module provides a connection to the Neon database using the postgres.js driver.
 */

import { Sql, RowList, ParameterOrFragment, PendingQuery } from 'postgres';
import sql from './connection';
import { isDbError } from './_guards';

export type QueryProps<ResultType extends object = Record<string, unknown>> = {
  transform?: (result: Record<string, unknown>) => ResultType;
};

export type TransformedFullQueryResults<
  ResultType extends object = Record<string, unknown>,
> = {
  statement: string;
  fields: string[];
  command: string;
  rowCount: number;
  rows: Array<ResultType>;
};

const asRecord = (
  result: Record<string, unknown> | any[],
): Record<string, unknown> =>
  Array.isArray(result)
    ? result.reduce(
        (acc, cur, idx) => {
          acc[`column${idx}`] = cur;
          return acc;
        },
        {} as Record<string, unknown>,
      )
    : result;

const applyTransform = <ResultType extends object>(
  promise: Promise<RowList<any>>,
  props: QueryProps<ResultType> = {},
): Promise<Array<ResultType>> => {
  if (typeof props.transform != 'function') {
    return promise.then((result) => result as Array<ResultType>);
  }
  const { transform } = props;
  return promise.then((result) => {
    if (isDbError(result)) {
      throw result;
    }
    return result.map((r: any[] | Record<string, unknown>) =>
      transform(asRecord(r)),
    );
  });
};

const applyResultsetTransform = <ResultType extends object>(
  promise: Promise<RowList<any>>,
  props: QueryProps<ResultType> = {},
): Promise<TransformedFullQueryResults<ResultType>> =>
  promise.then((result) => {
    return {
      fields: result.columns?.map((col: { name: any }) => col.name) ?? [],
      command: result.command,
      rowCount: result.count,
      statement: result.statement,
      rows: result.map((r: any[] | Record<string, unknown>) =>
        typeof props.transform === 'function'
          ? props.transform(asRecord(r))
          : (asRecord(r) as ResultType),
      ),
    };
  });

interface ISqlNeonAdapter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  <T1 extends boolean = false, T2 extends boolean = T1>(
    template: TemplateStringsArray,
    ...parameters: readonly ParameterOrFragment<any[keyof any]>[]
  ): PendingQuery<any>;
  <
    ArrayModeOverride extends boolean = true,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    FullResultsOverride extends boolean = ArrayModeOverride,
  >(
    string: string,
    params?: any[],
  ): PendingQuery<any>;
}

const sqlNeonAdapter = (sql: Sql<any>): ISqlNeonAdapter => {
  return (
    template: string | TemplateStringsArray,
    ...parameters: readonly ParameterOrFragment<any[keyof any]>[]
  ) => {
    if (typeof template === 'string') {
      return sql.unsafe(template, ...(parameters as any[]));
    }
    return sql(template, ...parameters);
  };
};

/**
 * Executes a query against the Neon database.
 *
 * @param cb - A callback function that receives a postgres Sql instance and returns a Promise of RowList.
 * @returns A Promise that resolves to the query results.
 */
export const query = <ResultType extends object = Record<string, unknown>>(
  cb: (sql: ISqlNeonAdapter) => Promise<RowList<any>>,
  props: QueryProps<ResultType> = {},
): Promise<Array<ResultType>> => {
  return applyTransform<ResultType>(cb(sqlNeonAdapter(sql)), props);
};

/**
 * Executes a query against the Neon database with extended results.
 *
 * @param cb - A callback function that receives a postgres Sql instance and returns a Promise of RowList with full query results.
 * @returns A Promise that resolves to the full query results.
 */
export const queryExt = <ResultType extends object = Record<string, unknown>>(
  cb: (sql: ISqlNeonAdapter) => Promise<RowList<any>>,
  props: QueryProps<ResultType> = {},
): Promise<TransformedFullQueryResults<ResultType>> => {
  return applyResultsetTransform(cb(sqlNeonAdapter(sql)), props);
};

export type DbQueryFunction<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  X extends boolean,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Y extends boolean,
> = ISqlNeonAdapter;
