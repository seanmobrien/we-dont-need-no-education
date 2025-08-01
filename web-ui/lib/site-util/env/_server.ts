import { z } from 'zod';
import { isRunningOnClient, ZodProcessors } from './_common';
import { clientEnvFactory, clientRawInstance } from './_client';
import { AiLanguageModelType, isAiLanguageModelType } from '@/lib/ai/core';

const buildRawInstance = () => ({
  ...clientRawInstance,
  LOG_LEVEL_SERVER: process.env.LOG_LEVEL_SERVER ?? 'warn',
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
  AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
  AZURE_API_KEY: process.env.AZURE_API_KEY,
  AZURE_AISEARCH_ENDPOINT: process.env.AZURE_AISEARCH_ENDPOINT,
  AZURE_AISEARCH_KEY: process.env.AZURE_AISEARCH_KEY,
  AZURE_AISEARCH_DOCUMENTS_INDEX_NAME:
    process.env.AZURE_AISEARCH_DOCUMENTS_INDEX_NAME,
  AZURE_OPENAI_DEPLOYMENT_CHAT: process.env.AZURE_OPENAI_DEPLOYMENT_CHAT,
  AZURE_OPENAI_DEPLOYMENT_EMBEDDING:
    process.env.AZURE_OPENAI_DEPLOYMENT_EMBEDDING,
  AZURE_OPENAI_ENDPOINT_EMBEDDING: process.env.AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_KEY_EMBEDDING: process.env.AZURE_OPENAI_KEY_EMBEDDING,
  AZURE_OPENAI_DEPLOYMENT_COMPLETIONS:
    process.env.AZURE_OPENAI_DEPLOYMENT_COMPLETIONS,
  AZURE_OPENAI_ENDPOINT_COMPLETIONS:
    process.env.AZURE_OPENAI_ENDPOINT_COMPLETIONS,
  AZURE_OPENAI_KEY_COMPLETIONS: process.env.AZURE_OPENAI_KEY_COMPLETIONS,
  AZURE_AISEARCH_POLICY_INDEX_NAME:
    process.env.AZURE_AISEARCH_POLICY_INDEX_NAME,
  AZURE_AISEARCH_VECTOR_SIZE_SMALL:
    process.env.AZURE_AISEARCH_VECTOR_SIZE_SMALL,
  AZURE_AISEARCH_VECTOR_SIZE_LARGE:
    process.env.AZURE_AISEARCH_VECTOR_SIZE_LARGE,
  AZURE_AISEARCH_DOCUMENT_SPLITTER_OVERLAP:
    process.env.AZURE_AISEARCH_DOCUMENT_SPLITTER_OVERLAP,
  AZURE_AISEARCH_DOCUMENT_SPLITTER_MAX_TOKENS:
    process.env.AZURE_AISEARCH_DOCUMENT_SPLITTER_MAX_TOKENS,
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
  AUTH_GOOGLE_APIKEY: process.env.AUTH_GOOGLE_APIKEY,
  AUTH_HEADER_BYPASS_KEY: process.env.AUTH_HEADER_BYPASS_KEY,
  AUTH_HEADER_BYPASS_VALUE: process.env.AUTH_HEADER_BYPASS_VALUE,
  NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING:
    process.env.NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING,
  AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING,
  AZURE_STORAGE_ACCOUNT_KEY: process.env.AZURE_STORAGE_ACCOUNT_KEY,
  AZURE_STORAGE_ACCOUNT_NAME: process.env.AZURE_STORAGE_ACCOUNT_NAME,
  GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  GOOGLE_GENERATIVE_AI_BASE_URL: process.env.GOOGLE_GENERATIVE_AI_BASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  MEM0_DISABLED: process.env.MEM0_DISABLED,
  MEM0_API_HOST: process.env.MEM0_API_HOST,
  MEM0_UI_HOST: process.env.MEM0_UI_HOST,
  MEM0_USERNAME: process.env.MEM0_USERNAME,
  MEM0_ORG_ID: process.env.MEM0_ORG_ID,
  MEM0_PROJECT_ID: process.env.MEM0_PROJECT_ID,
  MEM0_API_KEY: process.env.MEM0_API_KEY,
  LOCAL_DEV_AUTH_BYPASS_USER_ID: process.env.LOCAL_DEV_AUTH_BYPASS_USER_ID,
});

// Define the schema for server-side environment variables
const serverEnvSchema = z.object({
  // BEGIN vars shared with client
  NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT: ZodProcessors.integer().default(
    5 * 60 * 1000,
  ),
  NEXT_PUBLIC_HOSTNAME: ZodProcessors.url(),
  NEXT_PUBLIC_LOG_LEVEL_CLIENT: ZodProcessors.logLevel(),
  NEXT_PUBLIC_DEFAULT_AI_MODEL: z
    .string()
    .transform((val) => {
      return isAiLanguageModelType(val) ? val : ('hifi' as AiLanguageModelType);
    })
    .default('hifi' as AiLanguageModelType),

  /**
   * The license key for MUI X Pro components.
   */
  NEXT_PUBLIC_MUI_LICENSE: z.string().min(1),
  // END NEXT_PUBLIC env vars
  LOG_LEVEL_SERVER: ZodProcessors.logLevel(),
  DATABASE_URL: ZodProcessors.url(),
  DATABASE_URL_UNPOOLED: ZodProcessors.url().optional(),
  AZURE_OPENAI_ENDPOINT: ZodProcessors.url(),
  AZURE_API_KEY: z.string().min(1),
  AZURE_AISEARCH_ENDPOINT: ZodProcessors.url(),
  AZURE_AISEARCH_KEY: z.string().min(1),
  AZURE_AISEARCH_DOCUMENTS_INDEX_NAME: z.string().min(1),
  AZURE_OPENAI_DEPLOYMENT_CHAT: z.string().default('gpt-4.1'),
  AZURE_OPENAI_DEPLOYMENT_EMBEDDING: z
    .string()
    .default('text-embedding-3-large'),
  AZURE_OPENAI_ENDPOINT_EMBEDDING: z
    .string()
    .default(process.env.AZURE_OPENAI_ENDPOINT ?? ''),
  AZURE_OPENAI_KEY_EMBEDDING: z
    .string()
    .default(process.env.AZURE_OPENAI_KEY ?? ''),
  AZURE_OPENAI_DEPLOYMENT_HIFI: z.string().default('gpt-4.1'),
  AZURE_OPENAI_DEPLOYMENT_LOFI: z.string().default('gpt-4o-mini'),
  AZURE_OPENAI_DEPLOYMENT_COMPLETIONS: z.string().default('gpt-4o-mini'),
  AZURE_OPENAI_ENDPOINT_COMPLETIONS: z
    .string()
    .default(process.env.AZURE_OPENAI_ENDPOINT ?? ''),
  AZURE_OPENAI_KEY_COMPLETIONS: z
    .string()
    .default(process.env.AZURE_OPENAI_KEY ?? ''),
  AZURE_AISEARCH_POLICY_INDEX_NAME: z.string().min(1),
  AZURE_AISEARCH_VECTOR_SIZE_SMALL: z.number().default(1536),
  AZURE_AISEARCH_VECTOR_SIZE_LARGE: z.number().default(3072),
  AZURE_AISEARCH_DOCUMENT_SPLITTER_OVERLAP: z.number().default(15),
  AZURE_AISEARCH_DOCUMENT_SPLITTER_MAX_TOKENS: z.number().default(512),

  AUTH_GOOGLE_ID: z.string(),
  AUTH_GOOGLE_SECRET: z.string(),
  AUTH_GOOGLE_APIKEY: z.string(),
  AUTH_HEADER_BYPASS_KEY: z.string().optional(),
  AUTH_HEADER_BYPASS_VALUE: z.string().optional(),
  AZURE_STORAGE_CONNECTION_STRING: z.string().min(1),
  AZURE_STORAGE_ACCOUNT_KEY: z.string().min(1),
  AZURE_STORAGE_ACCOUNT_NAME: z.string().min(1),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1).optional(),
  GOOGLE_GENERATIVE_AI_BASE_URL: ZodProcessors.url().default(
    'https://generativelanguage.googleapis.com/v1beta',
  ),
  REDIS_URL: z.string().min(1),
  REDIS_PASSWORD: z.string().min(1),
  MEM0_DISABLED: ZodProcessors.truthy(false),
  MEM0_API_HOST: ZodProcessors.url(),
  MEM0_UI_HOST: ZodProcessors.url(),
  MEM0_USERNAME: z.string().min(1),
  MEM0_ORG_ID: ZodProcessors.nullableString().default(null),
  MEM0_PROJECT_ID: ZodProcessors.nullableString().default(null),
  MEM0_API_KEY: z.string().optional().default('SKYNET'),
  LOCAL_DEV_AUTH_BYPASS_USER_ID: z.string().optional(),
});

export type ServerEnvType = ReturnType<typeof serverEnvSchema.parse>;

export const serverEnvFactory = (): ServerEnvType => {
  try {
    return isRunningOnClient()
      ? ({} as ServerEnvType)
      : serverEnvSchema.parse(buildRawInstance());
  } catch (e) {
    // Check an environment variable to verify really are running on server
    if ((process.env.DATABASE_URL ?? '').length === 0) {
      // We aren't - suppress (arguably could return client here)
      return clientEnvFactory() as unknown as ServerEnvType;
    }
    // Otherwise, rethrow the error
    throw e;
  }
};
