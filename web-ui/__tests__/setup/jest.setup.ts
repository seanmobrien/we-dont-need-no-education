process.env.MEM0_API_BASE_PATH = process.env.MEM0_API_BASE_PATH ?? 'api/v1';

const fetchMock = jest.fn(() =>
  Promise.resolve({ json: jest.fn(() => Promise.resolve({})) }),
);

jest.mock('@/lib/nextjs-util/fetch', () => {
  return {
    get fetch() {
      return fetchMock;
    },
  };
});

jest.mock('@/lib/nextjs-util/server/fetch', () => {
  return {
    get fetch() {
      return fetchMock;
    },
  };
});

jest.mock('@/lib/nextjs-util/client-navigate', () => ({
  clientReload: jest.fn().mockImplementation(() => { }),
  clientNavigate: jest.fn().mockImplementation(() => { }),
  clientNavigateSignIn: jest.fn().mockImplementation(() => { }),
}));

jest.mock('@/lib/hooks/use-todo', () => ({
  useTodoLists: jest.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
  useTodoList: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
  useToggleTodo: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
  })),
  useCreateTodoList: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
  })),
  useUpdateTodoList: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
  })),
  useDeleteTodoList: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
  })),
  useCreateTodoItem: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
  })),
  useUpdateTodoItem: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
  })),
  useDeleteTodoItem: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
  })),
}));

jest.mock('@/instrument/browser', () => ({
  getReactPlugin: jest.fn(() => ({
    trackEvent: jest.fn(),
    trackPageView: jest.fn(),
  })),
  getClickPlugin: jest.fn(() => ({
    trackEvent: jest.fn(),
    trackPageView: jest.fn(),
  })),
  getAppInsights: jest.fn(() => ({
    trackEvent: jest.fn(),
    trackPageView: jest.fn(),
  })),
  instrument: jest.fn(),
}));

// Mock window.matchMedia for @textea/json-viewer compatibility (only in jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // Deprecated
      removeListener: jest.fn(), // Deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

import dotenv from 'dotenv';
import { mockDeep } from 'jest-mock-extended';

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
            let p = new Promise(async (resolve, reject) => {
              try {
                const result = await qb.execute();
                (target as ProxiedDb)[INITIALIZED] = false;
                resolve(result);
              } catch (error) {
                reject(error);
              }
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

jest.mock('@/lib/site-util/env', () => {
  return {
    env: jest.fn((key: string) => {
      return process.env[key] || '';
    }),
    isRunningOnServer: jest.fn(() => typeof window === 'undefined'),
    isRunningOnEdge: jest.fn(() => false),
  };
});

import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { sendApiRequest } from '@/lib/send-api-request';
import postgres from 'postgres';
import type { DbDatabaseType } from '@/lib/drizzle-db/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import { drizDb } from '@/lib/drizzle-db';

// jest.setup.ts
// If using React Testing Library
import 'jest';
import '@testing-library/jest-dom';

// Polyfill TextEncoder and TextDecoder for Node.js environment
import { TextEncoder, TextDecoder } from 'util';
import { mock } from 'jest-mock-extended';
import { zerialize } from 'zodex';
import { sql } from 'drizzle-orm';
import { FormatAlignCenterSharp } from '@mui/icons-material';
import { createElement } from 'react';
import { TrackWithAppInsight } from '@/components/general/telemetry/track-with-app-insight';
import instrument, { getAppInsights } from '@/instrument/browser';
import { log } from '@/lib/logger';
import {
  FirstParameter,
  isKeyOf,
  isPromise,
  SingletonProvider,
} from '@/lib/typescript';
import { result, xorBy } from 'lodash';
import {
  IMockInsertBuilder,
  IMockQueryBuilder,
  MockDbQueryCallback,
  MockDbQueryCallbackResult,
  MockDbQueryRecord,
  QueryBuilderMethodValues,
} from './jest.mock-drizzle';
import { count } from 'console';
import { ITraits } from 'flagsmith/react';
import { P } from 'ts-pattern';
import { LoggedError } from '@/lib/react-util/errors/logged-error/logged-error-class';
import { ErrorReportArgs } from '@/lib/react-util/errors/logged-error/types';
import { ErrorReporterInterface } from '@/lib/error-monitoring/types';
globalThis.TextEncoder = TextEncoder as any;
globalThis.TextDecoder = TextDecoder as any;

// Ensure WHATWG Streams exist in Jest (jsdom)
(() => {
  try {
    if (typeof (globalThis as any).TransformStream === 'undefined') {
      // Prefer Node's built-in streams if available

      const web = require('stream/web');
      if (web?.TransformStream) {
        (globalThis as any).TransformStream = web.TransformStream;
        (globalThis as any).ReadableStream ||= web.ReadableStream;
        (globalThis as any).WritableStream ||= web.WritableStream;
        return;
      }
    }
  } catch {
    // fall through to ponyfill
  }
  // Fallback ponyfill

  const ponyfill = require('web-streams-polyfill');
  (globalThis as any).TransformStream ||= ponyfill.TransformStream;
  (globalThis as any).ReadableStream ||= ponyfill.ReadableStream;
  (globalThis as any).WritableStream ||= ponyfill.WritableStream;
})();

// Automocks

const Zodex = require('zodex').Zodex;

let originalProcessEnv = (() => {
  try {
    const origConfig = dotenv.parse(
      require('fs').readFileSync('.env.local', { encoding: 'utf-8' }),
    );
    return {
      REDIS_URL: origConfig.REDIS_URL,
      REDIS_PASSWORD: origConfig.REDIS_PASSWORD,
    };
  } catch (error) {
    return {};
  }
})();
// Redis settings require  original env vars for integrtation tests
export const withRedisConnection = () => {
  process.env.REDIS_URL =
    originalProcessEnv.REDIS_URL || 'redis://test-redis.local:6379';
  if (process.env.REDIS_URL.includes('test-redis.local')) {
    console.warn(
      'Using test Redis URL. Ensure this is set up correctly for integration tests.',
    );
  }
  process.env.REDIS_PASSWORD =
    originalProcessEnv.REDIS_PASSWORD || 'test-redis-password';
  if (process.env.REDIS_PASSWORD.includes('test-redis-password')) {
    console.warn(
      'Using test Redis password. Ensure this is set up correctly for integration tests.',
    );
  }
};

global.fetch = jest.fn().mockImplementation(() => {
  return Promise.resolve({
    ok: false,
    status: 500,
    json: () => Promise.resolve({ response: 'error' }),
  });
});

export const mockFlagsmithInstanceFactory = ({
  initialized = false,
  identifier = null,
  traits = null,
  flags = {},
  cacheOptions = { ttl: 1000, skipAPI: false, loadStale: false },
  apiUrl = process.env.NEXT_PUBLIC_FLAGSMITH_API_URL,
  environmentId = process.env.NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID,
  loadingState = 'loading',
}: {
  initialized?: boolean;
  identifier?: string | null;
  traits?: Record<string, string> | null;
  flags?: Record<string, string | number | boolean>;
  cacheOptions?: { ttl: number; skipAPI: boolean; loadStale: boolean };
  apiUrl?: string;
  environmentId?: string;
  loadingState?: string;
} = {}) => {
  // Local state management with configurable defaults
  let thisInitialized = initialized;
  let thisIdentifier: string | null = identifier;
  let thisTraits: null | Record<string, string> = traits;
  let thisFlags: Record<string, string | number | boolean> = flags;
  let thisCacheOptions = cacheOptions;
  let thisApiUrl = apiUrl;
  let thisEnvironmentId = environmentId;
  let thisLoadingState = loadingState;

  // Create jest.fn property getters for all IFlagsmith fields
  const mockThis = {
    // Core initialization and state
    get init() {
      return jest.fn((options?: { environmentID?: string; api?: string }) => {
        thisInitialized = true;
        thisEnvironmentId = options?.environmentID || thisEnvironmentId;
        thisApiUrl = options?.api || thisApiUrl;
        thisLoadingState = 'loaded';
        return Promise.resolve();
      });
    },

    get initialised() {
      return jest.fn(() => thisInitialized);
    },
    get loadingState() {
      return jest.fn(() => thisLoadingState);
    },

    // Flag operations
    get getFlags() {
      return jest.fn(() => Object.keys(thisFlags));
    },
    get getAllFlags() {
      return jest.fn(() => thisFlags);
    },
    get hasFeature() {
      return jest.fn((key: string) => Boolean(thisFlags[key]));
    },
    get getValue() {
      return jest.fn((key: string) => thisFlags[key]);
    },

    // Identity and traits
    get identify() {
      return jest.fn((userId: string, traits?: Record<string, string>) => {
        thisIdentifier = userId;
        thisTraits = traits ?? null;
        return Promise.resolve();
      });
    },

    get identity() {
      return jest.fn(() => thisIdentifier);
    },

    get getTrait() {
      return jest.fn((key: string) => thisTraits?.[key]);
    },
    get getAllTraits() {
      return jest.fn(() => thisTraits);
    },
    get setTrait() {
      return jest.fn((key: string, value: string) => {
        thisTraits = { ...(thisTraits ?? {}), [key]: value };
        return Promise.resolve();
      });
    },
    get setTraits() {
      return jest.fn((traits: ITraits) => {
        thisTraits = {
          ...(thisTraits ?? {}),
          ...(traits as Record<string, string>),
        };
        return Promise.resolve();
      });
    },

    // Context management
    get setContext() {
      return jest.fn(
        (context: { identity?: string; traits?: Record<string, string> }) => {
          if (context?.identity) thisIdentifier = context.identity;
          if (context?.traits) thisTraits = context.traits;
          return Promise.resolve();
        },
      );
    },
    get updateContext() {
      return jest.fn((context: { traits?: Record<string, string> }) => {
        if (context?.traits) {
          thisTraits = { ...(thisTraits ?? {}), ...context.traits };
        }
        return Promise.resolve();
      });
    },
    get getContext() {
      return jest.fn(() => ({
        identity: thisIdentifier,
        traits: thisTraits,
      }));
    },

    // State management
    get getState() {
      return jest.fn(() => ({
        flags: thisFlags,
        identity: thisIdentifier,
        traits: thisTraits,
        initialized: thisInitialized,
        loadingState: thisLoadingState,
      }));
    },
    get setState() {
      return jest.fn(
        (state: {
          flags?: Record<string, string | number | boolean>;
          identity?: string;
          traits?: Record<string, string>;
          initialized?: boolean;
          loadingState?: string;
        }) => {
          if (state?.flags) thisFlags = state.flags;
          if (state?.identity) thisIdentifier = state.identity;
          if (state?.traits) thisTraits = state.traits;
          if (state?.initialized !== undefined)
            thisInitialized = state.initialized;
          if (state?.loadingState) thisLoadingState = state.loadingState;
        },
      );
    },

    // Session management
    get logout() {
      return jest.fn(() => {
        thisIdentifier = null;
        thisTraits = null;
        thisFlags = {};
        return Promise.resolve();
      });
    },

    // Event listening
    get startListening() {
      return jest.fn((ttl?: number) => {
        thisCacheOptions = {
          ...thisCacheOptions,
          ttl: ttl ?? thisCacheOptions.ttl,
        };
      });
    },
    get stopListening() {
      return jest.fn(() => {
        // No-op for mock
      });
    },

    // Internal methods
    get _trigger() {
      return jest.fn();
    },
    get _triggerLoadingState() {
      return jest.fn((state: string) => {
        thisLoadingState = state;
      });
    },

    // Configuration
    get cacheOptions() {
      return {
        get: jest.fn(() => thisCacheOptions),
      };
    },
    get api() {
      return {
        get: jest.fn(() => thisApiUrl),
      };
    },
  };

  return mockThis;
};

// lets make this a little simpler and just register a direct listener instead
// of trying to route it through a mocked reporter
const reportErrorToConsole = (report: ErrorReportArgs) => {
  try {
    if (typeof console.group === 'function') {
      console.group(`🐛 Mock Error Report`);
    }
    if (typeof console.error === 'function') {
      console.error('Error:', report?.error ?? report);
    }
    if (typeof console.table === 'function') {
      console.table(report?.context ?? {});
    }
  } finally {
    if (typeof console.groupEnd === 'function') {
      console.groupEnd();
    }
  }
};
const onLoggedErrorEmitted = ({ error, context }: ErrorReportArgs) =>
  reportErrorToConsole({ error, context });

beforeAll(() => {
  try {
    const origConfig = dotenv.parse(
      require('fs').readFileSync('.env.local', { encoding: 'utf-8' }),
    );
    originalProcessEnv = {
      REDIS_URL: origConfig.REDIS_URL,
      REDIS_PASSWORD: origConfig.REDIS_PASSWORD,
    };
  } catch (error) {
    return {};
  }
});

jest.mock('@/lib/react-util/errors/logged-error-reporter', () => {
  return {
    reporter: jest.fn(() =>
      Promise.resolve({
        subscribeToErrorReports: jest.fn(),
        unsubscribeFromErrorReports: jest.fn(),
        reportError: jest.fn().mockImplementation(async (_report: any) => {
          // emulate console logging behavior of the real reporter so tests
          // that spy on console.group / console.error can observe it
          reportErrorToConsole(_report);
          return Promise.resolve(undefined);
        }),
        reportBoundaryError: jest.fn().mockResolvedValue(undefined),
        reportUnhandledRejection: jest.fn().mockResolvedValue(undefined),
        setupGlobalHandlers: jest.fn(),
        getStoredErrors: jest.fn(() => []),
        clearStoredErrors: jest.fn(),
      }),
    ),
  };
});


beforeEach(() => {
  // Wire up a super-simple rudimentary error logger
  LoggedError.subscribeToErrorReports(onLoggedErrorEmitted);
});

afterEach(() => {
  // Unsubscribe from error reports
  LoggedError.unsubscribeFromErrorReports(onLoggedErrorEmitted);
  // And use clearErrorReportSubscriptions() to pull out anything
  // that may have been added during test execution
  // LoggedError.clearErrorReportSubscriptions();
  // Magic token to reset zerialize cache
  Zodex.zerialize('__$$__reset__$$__');
  // Restore natural timers and clear mocks
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.clearAllMocks();
  // Reset all the singletons attached to global state
  SingletonProvider.Instance.clear();
  // Reset the mock database
  mockDb = mockDbFactory();
  fetchMock.mockClear();

});
