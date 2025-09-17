/* eslint-disable @typescript-eslint/no-explicit-any */
const shouldWriteToConsole = jest
  .requireActual('@/lib/react-util')
  .isTruthy(process.env.TESTS_WRITE_TO_CONSOLE);

jest.mock('@/components/general/telemetry/track-with-app-insight', () => ({
  TrackWithAppInsight: jest.fn((props: any) => {
    const { children, ...rest } = props;
    return createElement('div', rest, children);
  }),
}));
jest.mock('@microsoft/applicationinsights-react-js', () => ({
  withAITracking: (plugin: any, Component: any) => Component,
}));
jest.mock('@mui/material/ButtonBase/TouchRipple', () => {
  return function MockTouchRipple() {
    return null;
  };
});
jest.mock('@/lib/nextjs-util/fetch', () => ({
  fetch: jest.fn(() =>
    Promise.resolve({ json: jest.fn(() => Promise.resolve({})) }),
  ),
}));

jest.mock('@/lib/nextjs-util/client-navigate', () => ({
  clientReload: jest.fn().mockImplementation(() => {}),
  clientNavigate: jest.fn().mockImplementation(() => {}),
  clientNavigateSignIn: jest.fn().mockImplementation(() => {}),
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

/* eslint-disable @typescript-eslint/no-unused-vars */
import dotenv from 'dotenv';
import { mockDeep } from 'jest-mock-extended';

const actualDrizzle = jest.requireActual('drizzle-orm/postgres-js');
const actualSchema = jest.requireActual('@/lib/drizzle-db/schema');
const ErrorBoundary = jest.requireActual('./jest.mock-error-boundary').default;

jest.mock('react-error-boundary', () => {
  return {
    ErrorBoundary,
    FallbackComponent: ({ error }: { error?: Error }) => {
      return createElement('div', { role: 'alert' }, error?.message);
    },
  };
});

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

  const insertBuilder = {
    values: jest.fn(),
    onConflictDoUpdate: jest.fn(),
    __setRecords: <T extends Record<string, unknown> = Record<string, unknown>>(
      v: T[] | MockDbQueryCallback,
      rows?: T[] | null,
      state?: unknown,
    ) => {
      qb.__setRecords<T>(v, rows, state);
      return insertBuilder;
    },
    __getRecords: <T>() => {
      qb.__getRecords<T>();
      return insertBuilder;
    },
    __resetMocks: () => {
      qb.__resetMocks();
      return insertBuilder;
    },
  };
  insertBuilder.values.mockReturnValue(insertBuilder);
  insertBuilder.onConflictDoUpdate.mockReturnValue(insertBuilder);

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
      if (!current) {
        qb[key] = jest.fn();
      }
      if (key === 'execute') {
        qb[key].mockImplementation(async () => {
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
      } else if (key === 'insert') {
        (qb[key] as jest.Mock).mockImplementation(() => insertBuilder);
      } else {
        qb[key].mockImplementation(() => db);
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
  return db;
};

let mockDb: DatabaseMockType = mockDbFactory();

export const makeMockDb = (): DatabaseType => {
  // Return the same mock instance to ensure test isolation but consistency within a test
  // The mock will be reset between test files by Jest's resetMocks option

  // Ensure the query structure is properly mocked with the expected methods
  if (mockDb.query && mockDb.query.documentUnits) {
    // Set default behaviors - tests can override these
    /*
    if (
      !(
        mockDb.query.documentUnits.findMany as jest.Mock
      ).getMockImplementation()
    ) {
      (mockDb.query.documentUnits.findMany as jest.Mock).mockResolvedValue([]);
    }
    if (
      !(
        mockDb.query.documentUnits.findFirst as jest.Mock
      ).getMockImplementation()
    ) {
      (mockDb.query.documentUnits.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
    }
    */
    if (!(mockDb.$count as jest.Mock).getMockImplementation()) {
      (mockDb.$count as jest.Mock).mockResolvedValue(1);
    }
  }
  return mockDb;
};

const makeRecursiveMock = jest
  .fn()
  .mockImplementation(() => jest.fn(() => jest.fn(makeRecursiveMock)));
jest.mock('drizzle-orm/postgres-js', () => {
  return {
    ...actualDrizzle,
    drizzle: jest.fn(() => mockDb),
    sql: jest.fn(() => jest.fn().mockImplementation(() => makeRecursiveMock())),
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
    schema: actualSchema,
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
    schema: actualSchema,
    sql: jest.fn(() => makeRecursiveMock()),
  };
});
// Mocking modules before imports
jest.mock('google-auth-library');
jest.mock('googleapis');
jest.mock('postgres', () => {
  return {
    default: jest.fn().mockImplementation((strings, ...values) => {
      return jest.fn(() => Promise.resolve({ rows: [] }));
    }),
  };
});
jest.mock('next-auth', () => {
  return jest.fn();
});
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}));
jest.mock('@/auth', () => {
  return {
    auth: jest.fn(() => ({
      id: 'fdsdfs',
    })),
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

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })),
  usePathname: jest.fn(() => '/test'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

export const createRedisClient = jest.fn(() => ({
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setEx: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  flushDb: jest.fn().mockResolvedValue('OK'),
  on: jest.fn(),
}));
// Mock Redis client for cache tests
jest.mock('redis', () => ({
  createClient: createRedisClient,
}));

const makeMockImplementation = (name: string) => {
  return (...args: unknown[]) =>
    shouldWriteToConsole
      ? console.log(`logger::${name} called with `, args)
      : () => {};
};

const loggerInstance = (() => ({
  warn: jest.fn(makeMockImplementation('warn')),
  error: jest.fn(makeMockImplementation('error')),
  info: jest.fn(makeMockImplementation('info')),
  debug: jest.fn(makeMockImplementation('debug')),
  silly: jest.fn(makeMockImplementation('silly')),
  verbose: jest.fn(makeMockImplementation('verbose')),
  log: jest.fn(makeMockImplementation('log')),
}))();

jest.mock('@/lib/logger', () => {
  return {
    logger: jest.fn(() => loggerInstance),
    log: jest.fn((cb: (l: typeof loggerInstance) => void) =>
      cb(loggerInstance),
    ),
    errorLogFactory: jest.fn((x) => x),
    simpleScopedLogger: jest.fn(() => loggerInstance),
  };
});

import NextAuth from 'next-auth';
import { auth } from '@/auth';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { sendApiRequest } from '@/lib/send-api-request';
import postgres from 'postgres';
import { resetGlobalCache } from '@/data-models/api/contact-cache';
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
import { sql } from 'drizzle-orm';
import { FormatAlignCenterSharp } from '@mui/icons-material';
import { createElement } from 'react';
import { TrackWithAppInsight } from '@/components/general/telemetry/track-with-app-insight';
import instrument, { getAppInsights } from '@/instrument/browser';
import { log } from '@/lib/logger';
import { isKeyOf } from '@/lib/typescript';
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
globalThis.TextEncoder = TextEncoder as any;

// Ensure WHATWG Response/Request/Headers exist in all environments (jsdom/node)
// Node 18+ typically provides these via undici, but jsdom can lack them during tests.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const undici = require('undici');
  if (!globalThis.Response && undici.Response) {
    globalThis.Response = undici.Response;
  }
  if (!globalThis.Request && undici.Request) {
    globalThis.Request = undici.Request;
  }
  if (!globalThis.Headers && undici.Headers) {
    globalThis.Headers = undici.Headers;
  }
  // Do not override fetch if already mocked below
  if (!globalThis.fetch && undici.fetch) {
    globalThis.fetch = undici.fetch;
  }
} catch {
  // ignore if undici is unavailable; tests that require Response will provide their own env
}

// Ensure WHATWG Streams exist in Jest (jsdom)
(() => {
  try {
    if (typeof (globalThis as any).TransformStream === 'undefined') {
      // Prefer Node's built-in streams if available
      // eslint-disable-next-line @typescript-eslint/no-require-imports
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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ponyfill = require('web-streams-polyfill');
  (globalThis as any).TransformStream ||= ponyfill.TransformStream;
  (globalThis as any).ReadableStream ||= ponyfill.ReadableStream;
  (globalThis as any).WritableStream ||= ponyfill.WritableStream;
})();

// Automocks

(NextAuth as jest.Mock).mockImplementation(() => jest.fn);
(auth as jest.Mock).mockImplementation(() => {
  return jest.fn(() => Promise.resolve({ id: 'test-id' }));
});

const DefaultEnvVariables = {
  AZURE_STORAGE_CONNECTION_STRING: 'azure-storage-connection-string',
  NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING:
    'azure-applicationinsights-connection-string',
  NEXT_PUBLIC_HOSTNAME: `http://test-run.localhost`,
  NEXT_PUBLIC_LOG_LEVEL_CLIENT: `silly`,
  LOG_LEVEL_SERVER: `silly`,
  DATABASE_URL: `http://pooldatabase_server.localhost`,
  DATABASE_URL_UNPOOLED: `http://nopool_database_server.localhost`,
  AUTH_GOOGLE_ID: 'auth-google-id',
  AUTH_GOOGLE_SECRET: 'auth-google-secret',
  AUTH_GOOGLE_APIKEY: 'auth-google-apikey',
  REDIS_URL: 'redis://never-url.local:6379',
  REDIS_PASSWORD: 'redis-password',
  AZURE_OPENAI_ENDPOINT: 'https://fake-openai-endpoint.com',
  AZURE_OPENAI_KEY: 'blahblah',
  AZURE_AISEARCH_ENDPOINT: 'https://fake-aisearch-endpoint.com',
  AZURE_AISEARCH_KEY: 'fake-aisearch-key',
  AZURE_AISEARCH_DOCUMENTS_INDEX_NAME: 'documents-index',
  AZURE_AISEARCH_POLICY_INDEX_NAME: 'policy-index',
  AZURE_AISEARCH_VECTOR_SIZE_SMALL: '1536',
  AZURE_AISEARCH_VECTOR_SIZE_LARGE: '3172',
  AZURE_AISEARCH_DOCUMENT_SPLITTER_OVERLAP: '50',
  AZURE_AISEARCH_DOCUMENT_SPLITTER_MAX_TOKENS: '1000',
  AZURE_STORAGE_ACCOUNT_KEY: 'azure-storage-account-key',
  AZURE_STORAGE_ACCOUNT_NAME: 'azure-storage-account-name',
  LOCAL_DEV_AUTH_BYPASS_USER_ID: '',
};
let originalProcessEnv = (() => {
  try {
    const origConfig = dotenv.parse(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
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

export const resetEnvVariables = () => {
  process.env = {
    ...process.env,
    ...DefaultEnvVariables,
  };
};

beforeAll(() => {
  try {
    const origConfig = dotenv.parse(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
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

beforeEach(async () => {
  resetEnvVariables();
  resetGlobalCache();
  for (const [, value] of Object.entries(loggerInstance)) {
    (value as jest.Mock).mockClear();
  }
});

afterEach(() => {
  jest.clearAllMocks();
  mockDb = mockDbFactory();
  resetGlobalCache();
  Object.entries(originalProcessEnv).forEach(([key, value]) => {
    process.env[key] = value;
  });
});
