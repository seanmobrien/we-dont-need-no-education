type NextPublicEnvVariables<TSource> = {
  [K in keyof TSource as K extends `NEXT_PUBLIC_${string}`
  ? K
  : never]: TSource[K];
};

import { __clearEnvCacheForTests } from '@compliance-theater/env';
import { SingletonProvider } from '@compliance-theater/typescript';

export class MockEnvVarProvider<
  TSource extends Record<string, string | undefined>,
> {
  static snapshot(): Record<string, string | undefined> {
    // Use reduce to create a shallow copy of process.env
    const ret = Object.entries(process.env).reduce(
      (acc, [key, _value]) => {
        acc[key] = process.env[key];
        return acc;
      },
      {} as Record<string, string | undefined>,
    );
    return ret;
  }
  static apply(
    snapshot: Record<string, string | undefined>,
    merge: boolean = false,
  ): void {
    // Iterate through all current proces.env keys to restore or delete
    const restoreKeys = new Set<string>(Object.keys(snapshot));
    Array.from(Object.keys(process.env)).forEach((key) => {
      if (restoreKeys.has(key)) {
        process.env[key] = snapshot[key];
        restoreKeys.delete(key);
      } else if (!merge) {
        delete process.env[key];
      }
    });
    // Then iterate through any remaining keys in the snapshot to restore
    Array.from(restoreKeys).forEach((key) => {
      process.env[key] = snapshot[key];
    });
  }
  static create<T extends Record<string, string | undefined>>(
    source: T,
  ): MockEnvVarProvider<T> {
    const original = MockEnvVarProvider.snapshot();
    return new MockEnvVarProvider<T>({
      original,
      initial: { ...source },
      merge: true,
    });
  }

  readonly #original: Record<string, string | undefined>;
  readonly #source: TSource;
  private constructor(options: {
    original: Record<string, string | undefined>;
    initial: TSource;
    merge: boolean;
  }) {
    this.#source = options.initial;
    this.#original = options.original;
    MockEnvVarProvider.apply(options.initial, options.merge);
  }

  get server(): TSource {
    return this.#source;
  }
  get browser(): NextPublicEnvVariables<TSource> {
    return Object.entries(this.#source).reduce((acc, [key, value]) => {
      if (key.startsWith('NEXT_PUBLIC_')) {
        acc = {
          ...acc,
          [key]: value!,
        };
      }
      return acc;
    }, {} as NextPublicEnvVariables<TSource>);
  }

  [Symbol.dispose](): void {
    MockEnvVarProvider.apply(this.#original);
  }
}

const DefaultEnvVariables = {
  AZURE_STORAGE_CONNECTION_STRING: 'azure-storage-connection-string',
  AZURE_APPLICATIONINSIGHTS_CONNECTION_STRING:
    'azure-applicationinsights-connection-string',
  NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING:
    'azure-applicationinsights-connection-string',
  NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID: 'test-environment-id',
  NEXT_PUBLIC_FLAGSMITH_API_URL: 'https://api.flagsmith.notadomain.net/api/v1/',
  FLAGSMITH_SDK_KEY: 'test-server-id',
  AUTH_KEYCLOAK_ISSUER: 'https://keycloak.example.com/realms/test',
  AUTH_KEYCLOAK_CLIENT_ID: 'test-client-id',
  AUTH_KEYCLOAK_CLIENT_SECRET: 'test-client-secret',
  AUTH_KEYCLOAK_REDIRECT_URI: 'https://app.example.com/callback',
  AUTH_KEYCLOAK_IMPERSONATOR_USERNAME: 'admin-user',
  AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD: 'admin-pass',
  AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN: '',
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
  AZURE_API_KEY: 'test-azure-key',
  AZURE_OPENAI_DEPLOYMENT_COMPLETIONS: 'test-completions',
  AZURE_OPENAI_DEPLOYMENT_LOFI: 'test-lofi',
  AZURE_OPENAI_DEPLOYMENT_HIFI: 'test-hifi',
  AZURE_OPENAI_DEPLOYMENT_EMBEDDING: 'test-embedding',
  GOOGLE_GENERATIVE_AI_API_KEY: 'test-google-key',
} as const;
type EnvVarType = typeof DefaultEnvVariables;

let originalEnv: MockEnvVarProvider<EnvVarType> | undefined;
if (!originalEnv) {
  originalEnv = MockEnvVarProvider.create(DefaultEnvVariables);
}
let mockEnv: MockEnvVarProvider<EnvVarType> | undefined;

beforeEach(() => {
  __clearEnvCacheForTests();
  SingletonProvider.Instance.clear();
  mockEnv = MockEnvVarProvider.create(DefaultEnvVariables);
});

afterEach(() => {
  __clearEnvCacheForTests();
  if (mockEnv) {
    mockEnv[Symbol.dispose]();
    mockEnv = undefined;
  }
});
afterAll(() => {
  if (originalEnv) {
    originalEnv[Symbol.dispose]();
    originalEnv = undefined;
  }
});
