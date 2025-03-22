/* eslint-disable @typescript-eslint/no-unused-vars */
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

jest.mock('google-auth-library');
jest.mock('googleapis');
jest.mock('@neondatabase/serverless');
jest.mock('postgres');
// Automocks

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
