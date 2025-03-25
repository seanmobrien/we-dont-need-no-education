/* eslint-disable @typescript-eslint/no-unused-vars */

// Mocking modules before imports
jest.mock('google-auth-library');
jest.mock('googleapis');
jest.mock('@neondatabase/serverless');
jest.mock('postgres');
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
jest.mock('@/lib/neondb/connection', () => {});

const makeMockImplementation = (name: string) => {
  return (...args: unknown[]) =>
    console.log(`logger::${name} called with `, args);
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
    logger: Promise.resolve(logger),
    log: jest.fn((cb: (l: ReturnType<typeof logger>) => void) => cb(logger())),
    errorLogFactory: jest.fn((x) => x),
  };
});

import NextAuth from 'next-auth';
import { auth } from '@/auth';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { sendApiRequest } from '@/lib/send-api-request';
import { neon } from '@neondatabase/serverless';
import postgres from 'postgres';
import { resetGlobalCache } from '@/data-models/api/contact-cache';
// jest.setup.ts
import '@testing-library/jest-dom';
import 'jest';

// Automocks
(postgres as unknown as jest.Mock).mockImplementation((strings, ...values) => {
  return jest.fn(() => Promise.resolve({ rows: [] }));
});
(neon as jest.Mock).mockImplementation((conn, ops) => {
  const fullResultset = ops?.fullResultset ?? false;
  return fullResultset
    ? jest.fn(() => Promise.resolve({ rows: [] }))
    : jest.fn(() => Promise.resolve([]));
});
(NextAuth as jest.Mock).mockImplementation(() => jest.fn);
(auth as jest.Mock).mockImplementation(() => {
  return jest.fn(() => Promise.resolve({ id: 'test-id' }));
});

const DefaultEnvVariables = {
  AZURE_STORAGE_CONNECTION_STRING: 'azure-storage-connection-string',
  AZURE_APPLICATIONINSIGHTS_CONNECTION_STRING:
    'azure-applicationinsights-connection-string',
  NEXT_PUBLIC_HOSTNAME: `http://test-run.localhost`,
  NEXT_PUBLIC_LOG_LEVEL_CLIENT: `silly`,
  LOG_LEVEL_SERVER: `silly`,
  DATABASE_URL: `http://pooldatabase_server.localhost`,
  DATABASE_URL_UNPOOLED: `http://nopool_database_server.localhost`,
  AUTH_GOOGLE_ID: 'auth-google-id',
  AUTH_GOOGLE_SECRET: 'auth-google-secret',
  AUTH_GOOGLE_APIKEY: 'auth-google-apikey',
  REDIS_URL: 'redis://neverurl',
  REDIS_PASSWORD: 'redis-password',
};

global.fetch = jest.fn().mockImplementation(() => {
  console.log('in mock fetch', new Error().stack);
  return Promise.resolve({
    ok: false,
    status: 500,
    json: () => Promise.resolve({ response: 'error' }),
  });
});

const resetEnvVariables = () => {
  process.env = {
    ...process.env,
    ...DefaultEnvVariables,
  };
};

beforeEach(() => {
  resetEnvVariables();
  resetGlobalCache();
});

afterEach(() => {
  jest.clearAllMocks();
  resetGlobalCache();
});
