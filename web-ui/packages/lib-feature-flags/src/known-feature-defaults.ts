import type { AiProvider } from './external-types';
import type { StorageStrategyConfig } from './external-types';
import { env } from '@compliance-theater/env';

import type {
  KnownFeatureValueTypeMap,
  ModelConfig,
  ModelProviderFactoryConfig,
  EnhancedFetchConfig,
} from './types';
import { SingletonProvider } from '@compliance-theater/typescript/singleton-provider';
import { PickField } from '@compliance-theater/typescript/types';

const DEFAULT_IN_MEMORY_STORAGE_CONFIG =
  {} as const satisfies StorageStrategyConfig;

const DEFAULT_REDIS_STORAGE_CONFIG = {
  ttl: 86400,
  keyPrefix: 'todo',
  enableFallback: true,
} as const satisfies StorageStrategyConfig;

const DEFAULT_ENHANCED_FETCH_CONFIG = {
  timeout: {
    lookup: 1 * 200,
    connect: 1 * 1000,
    secureConnect: 1 * 1000,
    socket: 60 * 1000,
    send: 10 * 1000,
    response: 30 * 1000,
    request: 60 * 1000,
  } as const,
} as const satisfies EnhancedFetchConfig;

type ModelConfigDefaultType = {
  [key in AiProvider | 'client']: key extends infer K
    ? K extends AiProvider
      ? ModelProviderFactoryConfig
      : ModelConfig
    : never;
};

const ModelConfigDefaults: ModelConfigDefaultType = {
  client: {
    provider: 'azure',
    chat_model: 'lofi',
    tool_model: 'lofi',
  },
  azure: {
    default: {
      base: env('AZURE_OPENAI_ENDPOINT'),
      // NOTE: Version removed from recent API updates
      // version: '2025-04-01-preview'
    },
    named: {
      hifi: {
        model: env('AZURE_OPENAI_DEPLOYMENT_HIFI'),
      },
      lofi: {
        model: env('AZURE_OPENAI_DEPLOYMENT_LOFI'),
      },
      completions: {
        model: env('AZURE_OPENAI_DEPLOYMENT_COMPLETIONS'),
      },
    },
    embedding: {
      model: env('AZURE_OPENAI_DEPLOYMENT_EMBEDDING'),
    },
  },
  google: {
    default: {},
    named: {
      hifi: { model: 'gemini-2.5-pro' },
      lofi: { model: 'gemini-2.5-flash' },
      completions: { model: 'gemini-2.5-flash' },
      'gemini-2.0-flash': { model: 'gemini-2.0-flash' },
    },
    embedding: { model: 'text-embedding-004' },
  },
  openai: {
    default: {},
    named: {
      hifi: { model: 'gpt-5' },
      lofi: { model: 'gpt-5-mini' },
      completions: { model: 'gpt-5-mini' },
    },
    embedding: { model: 'text-embedding-3-large' },
  },
} as const;

export const AllFeatureFlagsDefault: KnownFeatureValueTypeMap = {
  health_checks: {
    staleTime: 5 * 1000,
    refresh: {
      healthy: 3 * 60 * 1000,
      warning: 30 * 1000,
      error: 10 * 1000,
    },
    retry: {
      exp: 1 * 1000,
      cap: 3 * 60 * 1000,
    },
  },
  mem0_mcp_tools_enabled: true,
  models_fetch_cache_ttl: 300,
  models_fetch_concurrency: 8,
  models_fetch_enhanced: DEFAULT_ENHANCED_FETCH_CONFIG,
  models_fetch_dedup_writerequests: true,
  models_fetch_stream_buffer: {
    max: 64 * 1024,
    detect: 4 * 1024,
  },
  models_fetch_stream_max_total_bytes: 10 * 1024 * 1024,
  models_fetch_stream_max_chunks: 1024,
  models_fetch_trace_level: 'warn',
  models_azure: true,
  models_openai: false,
  models_google: true,
  models_defaults: ModelConfigDefaults.client,
  models_config_azure: ModelConfigDefaults.azure,
  models_config_google: ModelConfigDefaults.google,
  models_config_openai: ModelConfigDefaults.openai,
  mcp_cache_tools: false,
  mcp_cache_client: true,
  mcp_max_duration: 1000 * 60 * 15,
  mcp_protocol_http_stream: false,
  mcp_trace_level: 'warn',
  health_database_cache_ttl: 120,
  health_memory_cache_ttl: 60,
  health_memory_cache_error_ttl: 10,
  health_memory_cache_warning_ttl: 30,
  health_startup_failure_threshold: 10,
  todo_storage_strategy: 'in-memory',
  todo_storage_in_memory_config: DEFAULT_IN_MEMORY_STORAGE_CONFIG,
  todo_storage_redis_config: DEFAULT_REDIS_STORAGE_CONFIG,
} as const;

export type GetFeatureFlagDefault<K extends keyof KnownFeatureValueTypeMap> = {
  [k in K]: PickField<KnownFeatureValueTypeMap, k>
}[K];

export const FLAGSMITH_SERVER_SINGLETON_KEY =
  '@noeducation/flagsmith-server' as const;

export const isFlagsmithServerReady = () =>
  SingletonProvider.Instance.has(FLAGSMITH_SERVER_SINGLETON_KEY);
