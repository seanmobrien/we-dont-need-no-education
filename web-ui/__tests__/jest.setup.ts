/* eslint-disable @typescript-eslint/no-unused-vars */

// Mocking modules before imports
jest.mock('google-auth-library');
jest.mock('googleapis');
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

jest.mock('drizzle-orm/postgres-js', () => {
  return {
    drizzle: jest.fn(() => ({
      query: jest.fn(() => ({
        select: jest.fn(() => ({
          from: jest.fn(() => ({
            where: jest.fn(() => ({
              orderBy: jest.fn(() => ({
                limit: jest.fn(() => ({
                  offset: jest.fn(() => ({
                    execute: jest.fn(() => Promise.resolve({ rows: [] })),
                  })),
                })),
              })),
            })),
          })),
        })),
      })),
    })),
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
// jest.setup.ts
import '@testing-library/jest-dom';
import 'jest';

// Automocks
(postgres as unknown as jest.Mock).mockImplementation((strings, ...values) => {
  return jest.fn(() => Promise.resolve({ rows: [] }));
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
