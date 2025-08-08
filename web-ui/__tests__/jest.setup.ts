/* eslint-disable @typescript-eslint/no-explicit-any */
const shouldWriteToConsole = jest
  .requireActual('@/lib/react-util')
  .isTruthy(process.env.TESTS_WRITE_TO_CONSOLE);

jest.mock('@/components/general/telemetry/track-with-app-insight', () => ({
  TrackWithAppInsight: jest.fn((props: any) => {
    const { children, ...rest } = props;
    return React.createElement('div', rest, children);
  })
}));
jest.mock('@microsoft/applicationinsights-react-js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withAITracking: (plugin: any, Component: any) => Component,
}));

jest.mock('@/lib/nextjs-util/fetch', () => ({
  fetch: jest.fn(() => Promise.resolve({ json: jest.fn(() => Promise.resolve({})) })),
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
  instrument: jest.fn()
}));

jest.mock('react-error-boundary', () => {
 class ErrorBoundary extends Component<{}, { hasError: boolean; error: Error | null }> {
   #fallbackRender?: (props: { error: unknown; resetErrorBoundary: () => void }) => React.ReactNode;
   #children: React.ReactNode;
   #onReset?: () => void;
   #onError?: (error: Error, errorInfo: { componentStack: string }) => void;
   
   constructor(props: {
     children?: React.ReactNode;
     fallbackRender?: (props: { error: unknown; resetErrorBoundary: () => void }) => React.ReactNode;
     onReset?: () => void;
     onError?: (error: Error, errorInfo: { componentStack: string }) => void;
   }) {
     super(props);
     const { fallbackRender, onReset, onError } = props;
     this.#fallbackRender = fallbackRender;
     this.#onReset = onReset;
     this.#onError = onError;
     this.#children = props.children;
     this.state = { hasError: false, error: null as Error | null };
   }

   static getDerivedStateFromError(error: any) {
     return { hasError: true, error };
   }

   componentDidCatch(error: any, errorInfo: any) {
     if (this.#onError) {
       this.#onError(error, errorInfo || { componentStack: 'test-component-stack' });
     }
   }

   render() {
     try {
       if ('hasError' in this.state && this.state.hasError) {
         const error =
           'error' in this.state && !!this.state.error
             ? this.state.error
             : new Error('An error occurred');
         
         if (this.#fallbackRender) {
           const FallbackWrapper = () => this.#fallbackRender!({ 
             error, 
             resetErrorBoundary: () => {
               this.setState({ hasError: false, error: null });
               this.#onReset?.();
             }
           });
           return React.createElement(FallbackWrapper);
         }
         
         return React.createElement('div', { role: 'alert' }, String(error));
       }
       return this.#children;
     } catch (error) {
       // Catch errors during render and trigger error boundary behavior
       if (!this.state.hasError) {
         this.setState({ hasError: true, error: error as Error });
         if (this.#onError) {
           this.#onError(error as Error, { componentStack: 'test-component-stack' });
         }
       }
       return React.createElement('div', { role: 'alert' }, String(error));
     }
   }
 }
  return {
  ErrorBoundary,
  FallbackComponent: ({ error }: { error?: Error }) => {
    return React.createElement('div', { role: 'alert' }, error?.message);
  },
};
});

/* eslint-disable @typescript-eslint/no-unused-vars */
import dotenv from 'dotenv';
import { mockDeep } from 'jest-mock-extended';
import type { DbDatabaseType } from '@/lib/drizzle-db/schema';

const actualDrizzle = jest.requireActual('drizzle-orm/postgres-js');
const actualSchema = jest.requireActual('@/lib/drizzle-db/schema');
type DatabaseType = DbDatabaseType;


let mockDb = mockDeep<DatabaseType>();

export const makeMockDb = (): DatabaseType => {
  // Return the same mock instance to ensure test isolation but consistency within a test
  // The mock will be reset between test files by Jest's resetMocks option
  
  // Ensure the query structure is properly mocked with the expected methods
  if (mockDb.query && mockDb.query.documentUnits) {
    // Set default behaviors - tests can override these
    if (!(mockDb.query.documentUnits.findMany as jest.Mock).getMockImplementation()) {
      (mockDb.query.documentUnits.findMany as jest.Mock).mockResolvedValue([]);
    }
    if (!(mockDb.query.documentUnits.findFirst as jest.Mock).getMockImplementation()) {
      (mockDb.query.documentUnits.findFirst as jest.Mock).mockResolvedValue(null);
    }
    if (!(mockDb.$count as jest.Mock).getMockImplementation()) {
      (mockDb.$count as jest.Mock).mockResolvedValue(1);
    }
    if (
      !(mockDb.select as jest.Mock).getMockImplementation()
    ) {
      (mockDb.select as jest.Mock).mockResolvedValue(mockDb);
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
    drizDbWithInit: jest.fn(() => Promise.resolve(makeMockDb())),
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
    drizDbWithInit: jest.fn(() => Promise.resolve(makeMockDb())),
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
import React, { Component } from 'react';
import { TrackWithAppInsight } from '@/components/general/telemetry';
import instrument, { getAppInsights } from '@/instrument/browser';
import { log } from '@/lib/logger';
globalThis.TextEncoder = TextEncoder;

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
  mockDb = mockDeep<DatabaseType>();
  resetGlobalCache();
  Object.entries(originalProcessEnv).forEach(([key, value]) => {
    process.env[key] = value;
  });
});
