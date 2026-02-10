/**
 * @jest-environment node
 */

import { isRunningOnServer, isRunningOnClient, runtime, __clearEnvCacheForTests } from '../src/env';

describe('env package', () => {
  // Set minimal required env vars for testing
  const originalEnv = process.env;
  
  beforeAll(() => {
    process.env = {
      ...originalEnv,
      AUTH_SECRET: 'test-secret-key-for-testing-only',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      AZURE_OPENAI_ENDPOINT: 'https://test.openai.azure.com',
      AZURE_API_KEY: 'test-api-key',
      AZURE_AISEARCH_ENDPOINT: 'https://test.search.windows.net',
      AZURE_AISEARCH_KEY: 'test-search-key',
      AZURE_AISEARCH_DOCUMENTS_INDEX_NAME: 'test-documents',
      AZURE_AISEARCH_POLICY_INDEX_NAME: 'test-policies',
      AUTH_GOOGLE_ID: 'test-google-id',
      AUTH_GOOGLE_SECRET: 'test-google-secret',
      AUTH_GOOGLE_APIKEY: 'test-google-apikey',
      AZURE_STORAGE_CONNECTION_STRING: 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test',
      AZURE_STORAGE_ACCOUNT_KEY: 'test-storage-key',
      AZURE_STORAGE_ACCOUNT_NAME: 'teststorage',
      FLAGSMITH_SDK_KEY: 'test-flagsmith-key',
      NEXT_PUBLIC_FLAGSMITH_API_URL: 'https://api.flagsmith.com/api/v1',
      NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID: 'test-env-id',
      REDIS_URL: 'redis://localhost:6379',
      REDIS_PASSWORD: 'test-redis-password',
      MEM0_API_HOST: 'https://api.mem0.ai',
      MEM0_UI_HOST: 'https://app.mem0.ai',
      MEM0_USERNAME: 'test@example.com',
      NODE_ENV: 'test',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    __clearEnvCacheForTests();
  });

  describe('runtime detection', () => {
    it('should detect server runtime', () => {
      expect(isRunningOnServer()).toBe(true);
      expect(isRunningOnClient()).toBe(false);
    });

    it('should return runtime type', () => {
      const runtimeType = runtime();
      expect(runtimeType).toBeDefined();
      expect(['nodejs', 'edge', 'client', 'static', 'server']).toContain(runtimeType);
    });
  });

  describe('env function', () => {
    it('should return environment object when called without key', () => {
      // Import here to ensure env vars are set first
      const { env } = require('../src/env');
      const envObj = env();
      expect(envObj).toBeDefined();
      expect(typeof envObj).toBe('object');
    });

    it('should cache environment instance', () => {
      const { env } = require('../src/env');
      const env1 = env();
      const env2 = env();
      expect(env1).toBe(env2);
    });

    it('should clear cache when __clearEnvCacheForTests is called', () => {
      const { env } = require('../src/env');
      const env1 = env();
      __clearEnvCacheForTests();
      const env2 = env();
      expect(env1).not.toBe(env2);
    });
  });

  describe('ZodProcessors', () => {
    it('should export ZodProcessors utilities', () => {
      const { ZodProcessors } = require('../src/env/_common');
      expect(ZodProcessors).toBeDefined();
      expect(ZodProcessors.url).toBeDefined();
      expect(ZodProcessors.logLevel).toBeDefined();
      expect(ZodProcessors.integer).toBeDefined();
    });
  });
});
