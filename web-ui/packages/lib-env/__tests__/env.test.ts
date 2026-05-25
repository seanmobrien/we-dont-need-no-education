/**
 * @jest-environment node
 */

type EnvModule = typeof import('../src');

describe('env package', () => {
  const originalEnvSnapshot: NodeJS.ProcessEnv = { ...process.env };
  let envModule: EnvModule;

  const requiredEnv: Readonly<Record<string, string>> = {
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
    AZURE_STORAGE_CONNECTION_STRING:
      'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test',
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
    AZURE_OPENAI_DEPLOYMENT_EMBEDDING: 'text-embedding-3-large',
    GOOGLE_GENERATIVE_EMBEDDING: 'text-embedding-004',
    OPENAI_EMBEDDING: 'text-embedding-3-large',
    NODE_ENV: 'test',
  };

  const withRequiredEnv = (): NodeJS.ProcessEnv => ({
    ...originalEnvSnapshot,
    ...requiredEnv,
  });

  const loadEnvModule = (): EnvModule => {
    jest.resetModules();
    envModule = require('../src') as EnvModule;
    return envModule;
  };

  beforeEach(() => {
    process.env = withRequiredEnv();
    loadEnvModule();
    envModule.__clearEnvCacheForTests();
  });

  afterAll(() => {
    process.env = { ...originalEnvSnapshot };
  });

  describe('runtime detection', () => {
    it('should detect server runtime', () => {
      expect(envModule.isRunningOnServer()).toBe(true);
      expect(envModule.isRunningOnClient()).toBe(false);
    });

    it('should return a valid runtime type', () => {
      expect(['nodejs', 'edge', 'client', 'static', 'server']).toContain(
        envModule.runtime(),
      );
    });
  });

  describe('env function', () => {
    it('should return environment object when called without key', () => {
      const envObj = envModule.env();

      expect(envObj).toBeDefined();
      expect(typeof envObj).toBe('object');
    });

    it('should cache environment instance', () => {
      const env1 = envModule.env();
      const env2 = envModule.env();

      expect(env1).toBe(env2);
    });

    it('should clear cache when __clearEnvCacheForTests is called', () => {
      const env1 = envModule.env();

      envModule.__clearEnvCacheForTests();

      const env2 = envModule.env();
      expect(env1).not.toBe(env2);
    });

    it('should not rebuild cached env object until cache is cleared', () => {
      const env1 = envModule.env();

      process.env.AUTH_SECRET = 'mutated-after-cache';
      const env2 = envModule.env();

      expect(env2).toBe(env1);
    });

    it('should rebuild env object after cache clear when process.env changes', () => {
      const env1 = envModule.env();

      process.env.AUTH_SECRET = 'mutated-after-cache-clear';
      envModule.__clearEnvCacheForTests();

      const env2 = envModule.env();
      expect(env2).not.toBe(env1);
    });

    it('should infer small embedding models when explicit small env vars are unset', () => {
      process.env.AZURE_OPENAI_DEPLOYMENT_EMBEDDING = 'text-embedding-3-large';
      delete process.env.AZURE_OPENAI_DEPLOYMENT_EMBEDDING_SMALL;
      process.env.GOOGLE_GENERATIVE_EMBEDDING = 'text-embedding-004';
      delete process.env.GOOGLE_GENERATIVE_EMBEDDING_SMALL;
      process.env.OPENAI_EMBEDDING = 'text-embedding-3-large';
      delete process.env.OPENAI_EMBEDDING_SMALL;

      envModule.__clearEnvCacheForTests();
      const currentEnv = envModule.env();

      expect(currentEnv.AZURE_OPENAI_DEPLOYMENT_EMBEDDING_SMALL).toBe(
        'text-embedding-3-small',
      );
      expect(currentEnv.GOOGLE_GENERATIVE_EMBEDDING_SMALL).toBe(
        'text-embedding-004',
      );
      expect(currentEnv.OPENAI_EMBEDDING_SMALL).toBe(
        'text-embedding-3-small',
      );
    });

    it('should prefer explicit small embedding env vars over inferred values', () => {
      process.env.AZURE_OPENAI_DEPLOYMENT_EMBEDDING = 'text-embedding-3-large';
      process.env.AZURE_OPENAI_DEPLOYMENT_EMBEDDING_SMALL =
        'text-embedding-3-small-explicit';
      process.env.GOOGLE_GENERATIVE_EMBEDDING = 'text-embedding-004';
      process.env.GOOGLE_GENERATIVE_EMBEDDING_SMALL =
        'text-embedding-004-small-explicit';
      process.env.OPENAI_EMBEDDING = 'text-embedding-3-large';
      process.env.OPENAI_EMBEDDING_SMALL = 'text-embedding-3-small-explicit';

      envModule.__clearEnvCacheForTests();
      const currentEnv = envModule.env();

      expect(currentEnv.AZURE_OPENAI_DEPLOYMENT_EMBEDDING_SMALL).toBe(
        'text-embedding-3-small-explicit',
      );
      expect(currentEnv.GOOGLE_GENERATIVE_EMBEDDING_SMALL).toBe(
        'text-embedding-004-small-explicit',
      );
      expect(currentEnv.OPENAI_EMBEDDING_SMALL).toBe(
        'text-embedding-3-small-explicit',
      );
    });
  });

  describe('ZodProcessors', () => {
    it('should export ZodProcessors utilities', () => {
      const { ZodProcessors } = require('../src/_common') as {
        readonly ZodProcessors: {
          readonly url?: unknown;
          readonly logLevel?: unknown;
          readonly integer?: unknown;
        };
      };

      expect(ZodProcessors).toBeDefined();
      expect(ZodProcessors.url).toBeDefined();
      expect(ZodProcessors.logLevel).toBeDefined();
      expect(ZodProcessors.integer).toBeDefined();
    });

    it('should expose processor entries as objects or functions', () => {
      const { ZodProcessors } = require('../src/_common') as {
        readonly ZodProcessors: Record<string, unknown>;
      };

      for (const key of ['url', 'logLevel', 'integer']) {
        const value = ZodProcessors[key];
        const valueType = typeof value;
        expect(['object', 'function']).toContain(valueType);
      }
    });
  });
});
