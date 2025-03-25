/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @module db
 * This module provides a connection to the Neon database using the postgres.js driver.
 */

import postgres, {
  Sql,
  RowList,
  ParameterOrFragment,
  PendingQuery,
  ColumnList,
  ResultMeta,
  Statement,
} from 'postgres';
import sql from './connection';
import { isDbError } from './_guards';
import { CommandMeta, IResultset } from './types';
import { isTypeBranded, TypeBrandSymbol } from '../react-util';
import { ExcludeExactMatch } from '../typescript';
import { log } from '../logger';

export type QueryProps<ResultType extends object = Record<string, unknown>> = {
  transform?: <RecordType extends Record<string, unknown>>(
    result: RecordType,
  ) => ResultType;
  enhanced?: boolean;
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

const asRecord = <
  TRecord extends Record<string, unknown>,
  TResult extends object = TRecord,
>(
  result: TRecord | any[],
): TResult =>
  Array.isArray(result)
    ? result.reduce((acc, cur, idx) => {
        acc[`column${idx}`] = cur;
        return acc;
      }, {} as TResult)
    : (result as unknown as TResult);

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
          : asRecord<Record<string, unknown>, ResultType>(r),
      ),
    };
  });

const recordsetInitBrand: unique symbol = Symbol(
  'TypeBrand::RecordsetInitProps',
);

type RecordsetBaseInitProps<T extends Record<string, unknown>> = {
  statement: string;
  command: CommandMeta;
  fields: ColumnList<keyof T>;
  [TypeBrandSymbol]: typeof recordsetInitBrand;
};

type RecordsetInitOptionalProps<T extends Record<string, unknown>> =
  | { count: number }
  | { records: ArrayLike<T | Array<any>> };

type RecordsetInitProps<T extends Record<string, unknown>> =
  RecordsetBaseInitProps<T> & RecordsetInitOptionalProps<T>;

type RecordsetInitWithTransformProps<
  T extends Record<string, unknown>,
  TOtherRecord extends ExcludeExactMatch<Record<string, unknown>, T>,
> = RecordsetBaseInitProps<T> & {
  records: ArrayLike<TOtherRecord | Array<any>>;
  transform: (source: TOtherRecord) => T;
};

class RecordsetInitPropsBaseImpl<T extends Record<string, unknown>>
  implements RecordsetBaseInitProps<T>
{
  readonly statement: string;
  readonly command: CommandMeta;
  readonly fields: ColumnList<keyof T>;
  readonly [TypeBrandSymbol]: typeof recordsetInitBrand;

  protected constructor(
    statement: string | Statement,
    command: CommandMeta,
    fields: ColumnList<keyof T>,
  ) {
    this.statement = String(statement);
    this.command = command;
    this.fields = fields;
    this[TypeBrandSymbol] = recordsetInitBrand;
  }
}
class RecordsetInitPropsImpl<T extends Record<string, unknown>>
  extends RecordsetInitPropsBaseImpl<T>
  implements RecordsetBaseInitProps<T>
{
  readonly count: number | undefined;
  readonly records: ArrayLike<T | Array<any>> | undefined;

  constructor(
    statement: string | Statement,
    command: CommandMeta,
    fields: ColumnList<keyof T>,
    count: number,
  );
  constructor(
    statement: string | Statement,
    command: CommandMeta,
    fields: ColumnList<keyof T>,
    records: ArrayLike<T | Array<any>>,
  );

  constructor(
    statement: string | Statement,
    command: CommandMeta,
    fields: ColumnList<keyof T>,
    countOrRecords?: number | ArrayLike<T | Array<any>>,
  ) {
    super(statement, command, fields);
    this.count =
      typeof countOrRecords === 'number' ? countOrRecords : undefined;
    this.records =
      typeof countOrRecords === 'object' && countOrRecords !== null
        ? countOrRecords
        : undefined;
  }
}
class RecordsetInitWithTransformPropsImpl<
    T extends Record<string, unknown>,
    TOtherRecord extends ExcludeExactMatch<
      Record<string, unknown>,
      T
    > = ExcludeExactMatch<Record<string, unknown>, T>,
  >
  extends RecordsetInitPropsBaseImpl<T>
  implements RecordsetInitWithTransformProps<T, TOtherRecord>
{
  readonly records: ArrayLike<TOtherRecord | any[]>;
  readonly transform: (x: TOtherRecord) => T;

  constructor(
    statement: string | Statement,
    command: CommandMeta,
    fields: ColumnList<keyof T>,
    records: ArrayLike<TOtherRecord | any[]>,
    transform: (x: TOtherRecord) => T,
  ) {
    super(statement, command, fields);

    this.records = records;
    this.transform = transform;
  }
}

const isRecordsetInitProps = <T extends Record<string, unknown>>(
  check: unknown,
): check is RecordsetInitProps<T> =>
  isTypeBranded<RecordsetInitProps<T>>(check, recordsetInitBrand);

const isRecordsetInitWithTransformProps = <
  T extends Record<string, unknown>,
  TOtherRecord extends ExcludeExactMatch<
    Record<string, unknown>,
    T
  > = ExcludeExactMatch<Record<string, unknown>, T>,
>(
  check: unknown,
): check is RecordsetInitWithTransformProps<T, TOtherRecord> =>
  isRecordsetInitProps<T>(check) &&
  'records' in check &&
  'transform' in check &&
  typeof check.transform === 'function';

export class Resultset<
    T extends Record<string, unknown> = Record<string, unknown>,
  >
  extends Array<T>
  implements IResultset<T>
{
  static isResultset<
    TRow extends Record<string, unknown> = Record<string, unknown>,
  >(check: unknown): check is IResultset<TRow> {
    if (!Array.isArray(check)) {
      return false;
    }
    if (check instanceof Resultset) {
      return true;
    }
    // We may be close enough...
    if (
      'fields' in check &&
      Array.isArray(check.fields) &&
      'command' in check &&
      'statement' in check &&
      typeof check.statement === 'string' &&
      'count' in check
    ) {
      // Walks like a duck, talks like a duck, must be a flippin duck
      return true;
    }
    // No go
    return false;
  }
  static isRowList<TRow>(check: unknown): check is RowList<Array<TRow>> {
    if (!Array.isArray(check)) {
      return false;
    }
    if (
      'columns' in check &&
      Array.isArray(check.columns) &&
      'command' in check &&
      'statement' in check
    ) {
      // Walks like a duck, talks like a duck, must be a flippin duck
      return true;
    }
    // No go
    return false;

    return true;
  }
  static #makeRecordFromArray<TRecord extends Record<string, unknown>>(
    result: TRecord | any[],
    fields?: ColumnList<keyof TRecord>,
  ): TRecord {
    if (!Array.isArray(result)) {
      return result;
    }
    return result.reduce((acc, cur, idx) => {
      const field = fields?.find((x) => x.number === idx);
      if (field) {
        acc[field.name] = field.parser ? field.parser(String(cur)) : cur;
      } else {
        acc[`column${idx}`] = cur;
      }
      return acc;
    }, {} as TRecord);
  }
  static #mapRecord = <
    TRecord extends Record<string, unknown>,
    TSource extends Record<string, unknown>,
  >(
    result: TSource | any[],
    fields?: ColumnList<keyof TRecord>,
    transform?: (source: TSource) => TRecord,
  ): TRecord => {
    if (Array.isArray(result)) {
      log((l) => l.warn('Make sure transformed arrays actually work'));
      return Resultset.#makeRecordFromArray(result, fields);
    }
    if (transform) {
      return transform(result);
    }
    log((l) => l.warn('This almost definitly absolutely wont work'));
    return result as unknown as TRecord;
  };

  readonly #fields: ColumnList<keyof T>;
  readonly #command: ResultMeta<number>['command'];
  readonly #statement: string;
  constructor(props: RecordsetBaseInitProps<T>);
  constructor(resultset: RowList<Array<T>>);
  constructor(resultset: IResultset<T>);
  constructor(
    resultset: RowList<Array<T>> | IResultset<T> | RecordsetBaseInitProps<T>,
  ) {
    if (isRecordsetInitWithTransformProps<T>(resultset)) {
      const mappedRecords = Array.from(resultset.records).map((x) =>
        Resultset.#mapRecord(x, resultset.fields, resultset.transform),
      );
      super(...mappedRecords);
      this.#fields = resultset.fields;
      this.#command = resultset.command;
      this.#statement = String(resultset.statement);
      return;
    }
    if (isRecordsetInitProps<T>(resultset)) {
      if ('count' in resultset && resultset.count) {
        super(resultset.count);
      } else if (
        'records' in resultset &&
        resultset.records &&
        !('transform' in resultset)
      ) {
        super(
          ...Array.from(resultset.records).map((x) =>
            Resultset.#makeRecordFromArray<T>(x, resultset.fields),
          ),
        );
      } else {
        throw new TypeError(
          'How can we be an init props without count or records?',
        );
      }
      this.#fields = resultset.fields;
      this.#command = resultset.command;
      this.#statement = String(resultset.statement);
      return;
    }

    // Are we a resultset or a rowlist?
    if (Resultset.isResultset<T>(resultset)) {
      super(...resultset);
      this.#fields = resultset.fields;
      this.#command = resultset.command;
      this.#statement = resultset.statement;
      return;
    }
    if (Resultset.isRowList<T>(resultset)) {
      super(
        ...resultset.map((x) =>
          Resultset.#makeRecordFromArray<T>(x, resultset.columns),
        ),
      );
      this.#fields = resultset.columns;
      this.#command = resultset.command;
      this.#statement = String(resultset.statement);
      return;
    }

    throw new TypeError(`Unsupported Resultset initializer`, {
      cause: resultset,
    });
  }

  get fields(): ColumnList<keyof T> {
    return this.#fields;
  }
  get command(): ResultMeta<number>['command'] {
    return this.#command;
  }
  get statement(): string {
    return this.#statement;
  }
  get count(): number {
    return this.length;
  }
  get rows(): Array<T> {
    return this;
  }
}

export interface ISqlNeonAdapter {
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

export const sqlNeonAdapter = (sql: Sql<any>): ISqlNeonAdapter => {
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

export type SqlDb<TRecord extends Record<string, unknown> = any> =
  postgres.Sql<TRecord>;

export const queryRaw = <RecordType extends Record<string, unknown> = any>(
  cb: (sql: SqlDb<RecordType>) => PendingQuery<Array<RecordType>>,
): PendingQuery<Array<RecordType>> => cb(sql as SqlDb<RecordType>);

export const db = <
  ResultType extends Record<string, unknown> = any,
  RecordType extends Record<string, unknown> = ResultType, // ExcludeExactMatch<Record<string, unknown>, ResultType> = any,
>(
  cb: (sql: SqlDb<RecordType>) => PendingQuery<Array<RecordType>>,
  { transform }: QueryProps<ResultType> = {},
): Promise<IResultset<ResultType>> => {
  const query = queryRaw(cb).then((result) => {
    if (isDbError(result)) {
      throw result;
    }
    return result;
  });
  if (transform) {
    return query.then((result) => {
      return new Resultset<ResultType>(
        new RecordsetInitWithTransformPropsImpl(
          result.statement,
          result.command,
          result.columns as ColumnList<keyof ResultType>,
          result as RowList<ExcludeExactMatch<RecordType, ResultType>[]>,
          transform,
        ),
      );
    });
  }
  return query.then(
    (result) =>
      new Resultset<ResultType>(
        new RecordsetInitPropsImpl<ResultType>(
          result.statement,
          result.command,
          result.columns as ColumnList<keyof ResultType>,
          result as ArrayLike<ResultType | Array<any>>,
        ),
      ),
  );
};
export type DbQueryFunction<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  X extends boolean,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Y extends boolean,
> = ISqlNeonAdapter;
