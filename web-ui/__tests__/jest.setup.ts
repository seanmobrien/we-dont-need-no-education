const shouldWriteToConsole = jest
  .requireActual('@/lib/react-util')
  .isTruthy(process.env.TESTS_WRITE_TO_CONSOLE);

/* eslint-disable @typescript-eslint/no-unused-vars */
import dotenv from 'dotenv';
import { mockDeep } from 'jest-mock-extended';
import type { DbDatabaseType } from '@/lib/drizzle-db/schema';


const actualDrizzle = jest.requireActual('drizzle-orm/postgres-js');
const actualSchema = jest.requireActual('@/lib/drizzle-db/schema');
type DatabaseType = DbDatabaseType;

export const makeMockDb = (): DatabaseType => {
  // Using drizzle.mock we can quickly spin up a mock database that matches our schema, no driver or db connection required.
  // Use jest-mock-extended's deepMock to create a fully mocked database object
  const ret = mockDeep<DatabaseType>();
  return ret;
};

const mockDb = actualDrizzle.drizzle.mock({ actualSchema });
const makeRecursiveMock = jest
  .fn()
  .mockImplementation(() => makeRecursiveMock());
jest.mock('drizzle-orm/postgres-js', () => {
  return {
    ...actualDrizzle,
    drizzle: jest.fn(() => mockDb),
    sql: jest.fn(() => jest.fn().mockImplementation(() => makeRecursiveMock())),
  };
});
jest.mock('@/lib/neondb/connection', () => {
  return {
    sql: jest.fn(() => makeRecursiveMock()),
  };
});
jest.mock('@/lib/drizzle-db/connection', () => {
  return {
    db: makeMockDb(),
    schema: actualSchema,
  };
});
jest.mock('@/lib/drizzle-db', () => {
  return {
    db: makeMockDb(),
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
const logger = () => ({
  warn: jest.fn(makeMockImplementation('warn')),
  error: jest.fn(makeMockImplementation('error')),
  info: jest.fn(makeMockImplementation('info')),
  debug: jest.fn(makeMockImplementation('debug')),
  silly: jest.fn(makeMockImplementation('silly')),
  verbose: jest.fn(makeMockImplementation('verbose')),
  log: jest.fn(makeMockImplementation('log')),
});

jest.mock('@/lib/logger', () => {
  return {
    logger: Promise.resolve(() => ({
      warn: jest.fn(makeMockImplementation('warn')),
      error: jest.fn(makeMockImplementation('error')),
      info: jest.fn(makeMockImplementation('info')),
      debug: jest.fn(makeMockImplementation('debug')),
      silly: jest.fn(makeMockImplementation('silly')),
      verbose: jest.fn(makeMockImplementation('verbose')),
      log: jest.fn(makeMockImplementation('log')),
    })),
    log: jest.fn((cb: (l: ReturnType<typeof logger>) => void) => cb(logger())),
    errorLogFactory: jest.fn((x) => x),
    simpleScopedLogger: jest.fn(() => logger()),
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
import { db } from '@/lib/drizzle-db';
// jest.setup.ts
// If using React Testing Library
import '@testing-library/jest-dom';
import 'jest';

// Polyfill TextEncoder and TextDecoder for Node.js environment
import { TextEncoder, TextDecoder } from 'util';
import { mock } from 'jest-mock-extended';
import { sql } from 'drizzle-orm';
import { FormatAlignCenterSharp } from '@mui/icons-material';
globalThis.TextEncoder = TextEncoder;

// React 19 + React Testing Library 16 compatibility setup
/*
import React from 'react';
import { act } from 'react';

// Set up React.act environment for React 19 concurrent features
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).IS_REACT_ACT_ENVIRONMENT = true;
*/

/*
// Set React.act on the global React object to ensure compatibility
// This is the correct way to handle React 19 with React Testing Library 16
if (typeof React.act === 'undefined') {
  React.act = act;
}

// Also make act available globally for React Testing Library
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof (global as any).act === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).act = act;
}
*/

// Automocks

(NextAuth as jest.Mock).mockImplementation(() => jest.fn);
(auth as jest.Mock).mockImplementation(() => {
  return jest.fn(() => Promise.resolve({ id: 'test-id' }));
});

const DefaultEnvVariables = {
  AZURE_STORAGE_CONNECTION_STRING: 'azure-storage-connection-string',
  NEXT_PUBLIC_AZURE_APPLICATIONINSIGHTS_CONNECTION_STRING:
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

beforeEach(() => {
  resetEnvVariables();
  resetGlobalCache();
});

afterEach(() => {
  jest.clearAllMocks();
  resetGlobalCache();
  Object.entries(originalProcessEnv).forEach(([key, value]) => {
    process.env[key] = value;
  });
});
