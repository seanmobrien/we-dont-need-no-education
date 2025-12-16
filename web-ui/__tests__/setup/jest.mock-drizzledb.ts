import dotenv from 'dotenv';
import { mockDeep } from 'jest-mock-extended';
import type { DbDatabaseType } from '@/lib/drizzle-db/schema';
import {
  IMockInsertBuilder,
  IMockQueryBuilder,
  MockDbQueryCallback,
  MockDbQueryCallbackResult,
  MockDbQueryRecord,
  QueryBuilderMethodValues,
} from './jest.mock-drizzle';
import {
  FirstParameter,
  isKeyOf,
  isPromise,
  SingletonProvider,
} from '@/lib/typescript';

const actualDrizzle = jest.requireActual('drizzle-orm/postgres-js');
const actualSchema = jest.requireActual('/lib/drizzle-db/schema');

export class MockQueryBuilder implements IMockQueryBuilder {
  readonly from: jest.Mock;
  readonly select: jest.Mock;
  readonly where: jest.Mock;
  readonly orderBy: jest.Mock;
  readonly limit: jest.Mock;
  readonly offset: jest.Mock;
  readonly execute: jest.Mock;
  readonly innerJoin: jest.Mock;
  readonly fullJoin: jest.Mock;
  readonly leftJoin: jest.Mock;
  readonly as: jest.Mock;
  readonly groupBy: jest.Mock;
  readonly insert: jest.Mock;

  __queryMock: Map<string, { findMany: jest.Mock; findFirst: jest.Mock }> =
    new Map();
  #records: unknown[] = [];
  #matchers: Map<MockDbQueryCallback, MockDbQueryRecord> = new Map();

  constructor() {
    this.groupBy = jest.fn().bind(this).mockReturnThis();
    this.from = jest.fn().bind(this).mockReturnThis();
    this.select = jest.fn().bind(this).mockReturnThis();
    this.where = jest.fn().bind(this).mockReturnThis();
    this.orderBy = jest.fn().bind(this).mockReturnThis();
    this.limit = jest.fn().bind(this).mockReturnThis();
    this.offset = jest.fn().bind(this).mockReturnThis();
    this.execute = jest.fn(() => Promise.resolve(this.#records)).bind(this);
    this.innerJoin = jest.fn().bind(this).mockReturnThis();
    this.fullJoin = jest.fn().bind(this).mockReturnThis();
    this.leftJoin = jest.fn().bind(this).mockReturnThis();
    this.as = jest.fn().bind(this).mockReturnThis();
    this.insert = jest.fn();
  }

  __setRecords<T extends Record<string, unknown> = Record<string, unknown>>(
    v: T[] | MockDbQueryCallback,
    rows?: T[] | null,
    state?: unknown,
  ) {
    // If we are "not" or an array then we are updating the default return value
    if (!v || Array.isArray(v)) {
      this.#records = v ?? [];
      return;
    }
    // Otherwise we have a callback
    if (typeof v === 'function') {
      // If rows is explicitly null then this is removing an existing callback
      if (rows === null) {
        this.#matchers.delete(v);
        return;
      }
      // Otherwise we're adding a new one
      this.#matchers.set(v, { rows: rows ?? [], state });
    }
  }
  __getRecords<T>() {
    return this.#records as T[];
  }
  __resetMocks() {
    this.#records = [];
    this.#matchers.clear();
  }
}

type DatabaseType = DbDatabaseType;
export type DatabaseMockType = DatabaseType & {
  __queryBuilder: MockQueryBuilder;
};
const mockDbFactory = (): DatabaseMockType => {
  const db = mockDeep<DatabaseType>() as unknown as DatabaseMockType;
  const qb = db as unknown as IMockQueryBuilder;
  let theRows: unknown[] = [];
  const theMatchers: Map<MockDbQueryCallback, MockDbQueryRecord> = new Map();
  const qbMethodValues = [
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
    'insert',
  ] as const;

  const CurrentTable = Symbol('CurrentTable');

  const rowMap = new Map<unknown, unknown[]>();

  const insertBuilder = {
    values: jest.fn(),
    execute: jest.fn(() => qb.execute()),
    onConflictDoUpdate: jest.fn(),
    __setCurrentTable: (table: unknown) => {
      (qb as unknown as { [CurrentTable]: unknown })[CurrentTable] = table;
      return insertBuilder;
    },
    __getCurrentTable: () =>
      (qb as unknown as { [CurrentTable]: unknown })[CurrentTable],
    __setRecords: <T extends Record<string, unknown> = Record<string, unknown>>(
      v: T[] | MockDbQueryCallback,
      rows?: T[] | null,
      state?: unknown,
    ) => {
      rowMap.set((qb as unknown as { [CurrentTable]: unknown })[CurrentTable], [
        ...(rowMap.get(
          (qb as unknown as { [CurrentTable]: unknown })[CurrentTable],
        ) ?? []),
        ...(rows ?? []),
      ]);
      qb.__setRecords<T>(v, rows, state);
      return insertBuilder;
    },
    __getRecords: <T>(arg?: unknown) => {
      if (arg) {
        return (rowMap.get(arg) ?? []) as T[];
      }
      return qb.__getRecords<T>();
    },
    __resetMocks: () => {
      qb.__resetMocks();
      return insertBuilder;
    },
  };
  insertBuilder.values.mockImplementation((v) => {
    qb.__getRecords().push(v);
    return insertBuilder;
  });
  insertBuilder.onConflictDoUpdate.mockReturnValue(insertBuilder);

  const INITIALIZED = Symbol.for('____initialized_query_builder____');
  type ProxiedDb = typeof db & { [INITIALIZED]?: boolean };
  const initMocks = () => {
    qbMethodValues.forEach((key: keyof IMockQueryBuilder) => {
      if (
        key === '__setRecords' ||
        key === '__getRecords' ||
        key === '__resetMocks'
      ) {
        return;
      }
      const current = qb[key];

      if (key === 'execute') {
        qb[key].mockImplementation(async () => {
          (db as ProxiedDb)[INITIALIZED] = false;
          const executeMock = qb[key].mock;
          const count = executeMock.calls.length;
          const thisIndex = count - 1;
          const from = qb['from']?.mock.lastCall?.[0];
          const isFrom = (table: unknown) => {
            if (typeof table === 'string') {
              const tables = from.getSQL().usedTables ?? [];
              if (tables.includes(table)) {
                return true;
              }
            }
            return Object.is(from, table);
          };
          const baseContext = {
            db: qb,
            context: {
              current: executeMock.contexts[thisIndex],
              last:
                thisIndex > 0 ? executeMock.contexts[thisIndex - 1] : undefined,
            },
            call: {
              current: executeMock.calls[thisIndex],
              last: executeMock.lastCall,
            },
            count,
            from,
            isFrom: isFrom,
            result: [],
            returned: {
              last: executeMock.results[thisIndex],
            },
            state: undefined,
            query: qb['select']?.mock.lastCall?.[0],
          };
          const entries = await Promise.all(
            Array.from(theMatchers.entries()).map(
              ([cb, record]) =>
                new Promise<{
                  hit: MockDbQueryCallback;
                  result: MockDbQueryCallbackResult;
                  record?: MockDbQueryRecord;
                }>(async (resolve) => {
                  try {
                    const thisContext = {
                      ...baseContext,
                      state: record.state,
                      result: record.rows,
                    };
                    const check = await cb(thisContext);
                    resolve({ hit: cb, result: check, record });
                  } catch {
                    resolve({ hit: cb, result: undefined });
                  }
                }),
            ),
          );
          const match = entries.find((check) => !!check.result);
          if (match) {
            if (!match.record) {
              throw new Error(
                'Matcher hit but no record found - something is fishy with our fancy db mock',
              );
            }
            // Can be either a boolean, a rowset, or a queryresult object
            if (typeof match.result === 'boolean') {
              if (!match.result) {
                throw new Error(
                  'Matcher hit but result is not true - something is fishy with our fancy db mock',
                );
              }
              // Boolean means we return the value provided when the record was set
              return match.record.rows;
            }
            if (typeof match.result === 'object') {
              // Array means we return the rows the callback gave back
              if (Array.isArray(match.result)) {
                return match.result;
              }
              // QueryResult object can do a few different things...
              if (match.result?.state !== undefined) {
                // For example, it can update model state...
                match.record.state = match.result.state;
              }
              // Override the result, or return the original rows.
              return match.result?.rows ?? match.record.rows;
            }
            throw new Error(
              'Matcher hit but result is not a boolean or an object - investigate fancy db mock.',
            );
          }
          // If we made it this far then we use the default result
          return theRows;
        });
      } else if (!current) {
        qb[key] = jest.fn(
          ['insert', 'values'].includes(String(key))
            ? () => insertBuilder as any
            : () => db as any,
        ) as jest.Mock;
      } else {
        (qb[key] as jest.Mock).mockImplementation(
          ['insert', 'values'].includes(String(key))
            ? () => insertBuilder as any
            : () => db as any,
        );
      }
    });
    Array.from(
      Object.keys(actualSchema.schema) as (keyof typeof actualSchema.schema)[],
    ).forEach((sc) => {
      if (!actualSchema.schema[sc]?.modelName) {
        return;
      }
      const tableKey = sc as keyof typeof db.query;
      let tbl = db.query[tableKey];
      if (!tbl) {
        tbl = {
          findMany: jest.fn(() => Promise.resolve([])),
          findFirst: jest.fn(() => Promise.resolve(null)),
        } as unknown as (typeof db.query)[typeof tableKey];
        db.query[tableKey] = tbl;
      }
      if (!jest.isMockFunction(tbl.findMany)) {
        tbl.findMany = jest.fn();
      }
      if (!jest.isMockFunction(tbl.findFirst)) {
        tbl.findFirst = jest.fn();
      }
      (tbl.findMany as jest.Mock).mockImplementation(() => Promise.resolve([]));
      (tbl.findFirst as jest.Mock).mockImplementation(() =>
        Promise.resolve(null),
      );
    });
  };
  initMocks();
  qb.__setRecords = <T extends Record<string, unknown>>(
    v: T[] | MockDbQueryCallback,
    rows?: T[] | null,
    state?: unknown,
  ) => {
    // If we are "not" or an array then we are updating the default return value
    if (!v || Array.isArray(v)) {
      theRows = v ?? [];
      return;
    }
    // Otherwise we have a callback
    if (typeof v === 'function') {
      // If rows is explicitly null then this is removing an existing callback
      if (rows === null) {
        theMatchers.delete(v);
        return;
      }
      // Otherwise we're adding a new one
      theMatchers.set(v, { rows: rows ?? [], state });
    }
  };
  qb.__getRecords = <T>() => theRows as T[];
  qb.__resetMocks = () => {
    theRows = [];
    theMatchers.clear();
    qbMethodValues.forEach((key: keyof IMockQueryBuilder) => {
      if (
        key === 'insert' ||
        key === '__getRecords' ||
        key === '__setRecords' ||
        key === '__resetMocks'
      ) {
        return;
      }
      const current = qb[key];
      if (current && current.mock) {
        current.mockReset();
      }
      initMocks();
    });
  };
  db.transaction = jest.fn(async (callback: TransactionFn) => {
    const txRawRet = callback(mockDb);
    const txRet = isPromise(txRawRet) ? await txRawRet : txRawRet;
    return txRet;
  });

  const proxy = new Proxy(db, {
    get(target, prop, receiver) {
      if (prop === 'from' || prop === 'select' || prop === 'where') {
        (target as ProxiedDb)[INITIALIZED] = true;
      } else if (prop === 'then') {
        if ((target as ProxiedDb)[INITIALIZED] === true) {
          return jest.fn((onOk, onError) => {
            let p = new Promise((resolve, reject) => {
              qb.execute()
                .then((result) => {
                  (target as ProxiedDb)[INITIALIZED] = false;
                  resolve(result);
                })
                .catch((error) => {
                  reject(error);
                });
            });
            if (onOk) {
              p = p.then(onOk);
            }
            if (onError) {
              p = p.catch(onError);
            }
            return p;
          });
        }
        return undefined;
      } else if (prop === 'innerMock') {
        return qb;
      }
      const asProxied = Reflect.get(target, prop, receiver);
      if (!asProxied || typeof asProxied !== 'function') {
        return asProxied;
      }
      return new Proxy(asProxied, {
        apply(target, thisArg, args) {
          const ret = asProxied.apply(target, args);
          if (isPromise<IMockQueryBuilder>(ret)) {
            return ret.then((r) => (r === qb ? proxy : r));
          } else if (ret === qb) {
            return proxy;
          }
          return ret;
        },
      });
    },
  });
  return proxy as unknown as DatabaseMockType;
};

let mockDb: DatabaseMockType = mockDbFactory();

export const makeMockDb = (): DatabaseType => {
  // Return the same mock instance to ensure test isolation but consistency within a test
  // The mock will be reset between test files by Jest's resetMocks option

  // Ensure the query structure is properly mocked with the expected methods
  if (mockDb.query && mockDb.query.documentUnits) {
    // Set default behaviors - tests can override these

    if (!(mockDb.$count as jest.Mock).getMockImplementation()) {
      (mockDb.$count as jest.Mock).mockResolvedValue(1);
    }
  }
  return mockDb;
};


type TransactionFn<TRet = any> = (tx: DatabaseType) => Promise<TRet> | TRet;


const makeRecursiveMock = jest
  .fn()
  .mockImplementation(() => jest.fn(() => jest.fn(makeRecursiveMock)));
jest.mock('drizzle-orm/postgres-js', () => {
  return {
    ...actualDrizzle,
    drizzle: jest.fn(() => mockDb),
    sql: jest.fn(() => jest.fn().mockImplementation(() => makeRecursiveMock())),
    transaction: jest.fn(async (callback: TransactionFn) => {
      const txRawRet = callback(mockDb);
      const txRet = isPromise(txRawRet) ? await txRawRet : txRawRet;
      return txRet;
    }),
  };
});
jest.mock('@/lib/neondb/connection', () => {
  const pgDb = jest.fn(() => makeRecursiveMock());
  return {
    pgDbWithInit: jest.fn(() => Promise.resolve(makeRecursiveMock())),
    pgDb,
    sql: jest.fn(() => pgDb()),
  };
});
jest.mock('@/lib/drizzle-db/connection', () => {
  return {
    drizDb: jest.fn((fn?: (driz: DatabaseType) => unknown) => {
      const mockDbInstance = makeMockDb();
      if (fn) {
        const result = fn(mockDbInstance);
        return Promise.resolve(result);
      }
      return mockDbInstance;
    }),
    drizDbWithInit: jest.fn(
      (cb?: (db: unknown) => unknown): Promise<unknown> => {
        const db = makeMockDb();
        const normalCallback = cb ?? ((x) => x);
        return Promise.resolve(normalCallback(db));
      },
    ),
    schema: actualSchema.schema ? actualSchema.schema : actualSchema,
  };
});
jest.mock('@/lib/drizzle-db', () => {
  return {
    drizDb: jest.fn((fn?: (driz: DatabaseType) => unknown) => {
      const mockDbInstance = makeMockDb();
      if (fn) {
        const result = fn(mockDbInstance);
        return Promise.resolve(result);
      }
      return mockDbInstance;
    }),
    drizDbWithInit: jest.fn(
      (cb?: (db: unknown) => unknown): Promise<unknown> => {
        const db = makeMockDb();
        const normalCallback = cb ?? ((x) => x);
        return Promise.resolve(normalCallback(db));
      },
    ),
    schema: actualSchema.schema ? actualSchema.schema : actualSchema,
    sql: jest.fn(() => makeRecursiveMock()),
  };
});

// Make mocks sticky
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { drizDb } from '@/lib/drizzle-db';
import { sql } from 'drizzle-orm';
import { withJestTestExtensions } from '../jest.test-extensions';


beforeAll(() => {
  withJestTestExtensions().makeMockDb = makeMockDb;
});
beforeEach(() => {
  withJestTestExtensions().makeMockDb = makeMockDb;
});

afterEach(() => {
  // Reset the mock database
  mockDb = mockDbFactory();
});
