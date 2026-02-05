/**
 * @fileoverview Server-side environment variable configuration and validation
 *
 * This module provides type-safe access to server-only environment variables
 * with Zod schema validation. It extends the client environment variables
 * with additional server-specific configuration for databases, AI services,
 * authentication providers, and other server-only resources.
 *
 * @author NoEducation Platform Team
 * @version 1.0.0
 */

import { z } from 'zod';
import { getMappedSource, isRunningOnClient, ZodProcessors } from './_common';
import {
  clientEnvFactory,
  clientRawInstance,
  clientEnvSchema,
} from './_client';
import { AiModelType } from '@/lib/ai/core';

const buildRawInstance = () => {
  const raw = {
    ...clientRawInstance,
    AUTH_SECRET: process.env.AUTH_SECRET,
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
    NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING:
      process.env.NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING,
    AZURE_STORAGE_CONNECTION_STRING:
      process.env.AZURE_STORAGE_CONNECTION_STRING,
    AZURE_STORAGE_ACCOUNT_KEY: process.env.AZURE_STORAGE_ACCOUNT_KEY,
    AZURE_STORAGE_ACCOUNT_NAME: process.env.AZURE_STORAGE_ACCOUNT_NAME,
    FLAGSMITH_SDK_KEY: process.env.FLAGSMITH_SDK_KEY,
    GOOGLE_CHROME_DEVTOOLS_WORKSPACE_ID:
      process.env.GOOGLE_CHROME_DEVTOOLS_WORKSPACE_ID,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    GOOGLE_GENERATIVE_AI_BASE_URL: process.env.GOOGLE_GENERATIVE_AI_BASE_URL,
    GOOGLE_GENERATIVE_HIFI: process.env.GOOGLE_GENERATIVE_HIFI,
    GOOGLE_GENERATIVE_LOFI: process.env.GOOGLE_GENERATIVE_LOFI,
    GOOGLE_GENERATIVE_EMBEDDING: process.env.GOOGLE_GENERATIVE_EMBEDDING,
    AUTH_KEYCLOAK_CLIENT_ID: process.env.AUTH_KEYCLOAK_CLIENT_ID,
    AUTH_KEYCLOAK_CLIENT_SECRET: process.env.AUTH_KEYCLOAK_CLIENT_SECRET,
    AUTH_KEYCLOAK_IMPERSONATION_AUDIENCE:
      process.env.AUTH_KEYCLOAK_IMPERSONATION_AUDIENCE,
    AUTH_KEYCLOAK_ISSUER: process.env.AUTH_KEYCLOAK_ISSUER,
    AUTH_KEYCLOAK_REDIRECT_URI: process.env.AUTH_KEYCLOAK_REDIRECT_URI,
    AUTH_KEYCLOAK_IMPERSONATOR_USERNAME:
      process.env.AUTH_KEYCLOAK_IMPERSONATOR_USERNAME,
    AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD:
      process.env.AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD,
    AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN:
      process.env.AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN,
    AUTH_KEYCLOAK_SCOPE: process.env.AUTH_KEYCLOAK_SCOPE,
    AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_NAME: process.env.AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_NAME,
    AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_ID: process.env.AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_ID,
    REDIS_URL: process.env.REDIS_URL,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    LOCAL_DEV_AUTH_BYPASS_USER_ID: process.env.LOCAL_DEV_AUTH_BYPASS_USER_ID,
    MEM0_API_HOST: process.env.MEM0_API_HOST,
    MEM0_API_BASE_PATH: process.env.MEM0_API_BASE_PATH ?? 'api/v1',
    MEM0_UI_HOST: process.env.MEM0_UI_HOST,
    MEM0_USERNAME: process.env.MEM0_USERNAME,
    MEM0_ORG_ID: process.env.MEM0_ORG_ID,
    MEM0_PROJECT_ID: process.env.MEM0_PROJECT_ID,
    MEM0_API_KEY: process.env.MEM0_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_TRUST_HOST: process.env.NEXTAUTH_TRUST_HOST,
    /** OpenAI API key for direct OpenAI service access. Example: 'sk-1234567890abcdef...' */
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    /** OpenAI high-fidelity model name for complex tasks. Example: 'gpt-4-turbo' */
    OPENAI_HIFI: process.env.OPENAI_HIFI,
    /** OpenAI low-fidelity/fast model name for simple tasks. Example: 'gpt-3.5-turbo' */
    OPENAI_LOFI: process.env.OPENAI_LOFI,
    /** OpenAI embedding model name for vector generation. Example: 'text-embedding-3-large' */
    OPENAI_EMBEDDING: process.env.OPENAI_EMBEDDING,
    /** Maximum token threshold for AI batch processing. Example: '50000' */
    TOKEN_BATCH_THRESHOLD: process.env.TOKEN_BATCH_THRESHOLD,
  };
  if (!raw.AUTH_KEYCLOAK_REDIRECT_URI) {
    raw.AUTH_KEYCLOAK_REDIRECT_URI = new URL(
      `/api/auth/callback/keycloak`,
      process.env.NEXT_PUBLIC_HOSTNAME,
    ).toString();
  }
  return getMappedSource(raw);
};

/**
 * Zod schema definition for validating and transforming server-side environment variables.
 * Provides type safety, default values, and validation rules for all server configuration.
 */
const serverEnvSchema = z
  .object({
    AUTH_SECRET: z
      .string()
      .min(1)
      .describe('auth.js secret used when signing tokens'),
    LOG_LEVEL_SERVER: ZodProcessors.logLevel().describe(
      'Server-side logging level for application logs. Example: debug, info, warn, error',
    ),
    DATABASE_URL: ZodProcessors.url().describe(
      'Primary PostgreSQL database connection URL with connection pooling. Example: postgresql://user:pass@host:5432/dbname',
    ),
    DATABASE_URL_UNPOOLED: ZodProcessors.url()
      .optional()
      .describe(
        'Direct PostgreSQL database connection URL without pooling (optional). Example: postgresql://user:pass@host:5432/dbname?pgbouncer=true',
      ),
    AZURE_OPENAI_ENDPOINT: ZodProcessors.url().describe(
      'Azure OpenAI service endpoint URL for AI model access. Example: https://myopenai.openai.azure.com/',
    ),
    AZURE_API_KEY: z
      .string()
      .min(1)
      .describe(
        'Azure OpenAI API key for service authentication. Example: abc123def456...',
      ),
    AZURE_AISEARCH_ENDPOINT: ZodProcessors.url().describe(
      'Azure AI Search service endpoint URL for document indexing. Example: https://mysearch.search.windows.net',
    ),
    AZURE_AISEARCH_KEY: z
      .string()
      .min(1)
      .describe(
        'Azure AI Search API key for service authentication. Example: xyz789abc456...',
      ),
    AZURE_AISEARCH_DOCUMENTS_INDEX_NAME: z
      .string()
      .min(1)
      .describe(
        'Azure AI Search index name for storing document vectors and metadata. Example: documents-prod',
      ),

    AZURE_OPENAI_DEPLOYMENT_CHAT: z
      .string()
      .optional()
      .default('gpt-4.1' as AiModelType)
      .describe(
        'Azure OpenAI deployment name for chat completions. Default: gpt-4.1. Example: gpt-4-turbo',
      ),
    AZURE_OPENAI_DEPLOYMENT_EMBEDDING: z
      .string()
      .optional()
      .default('text-embedding-3-large' as AiModelType)
      .describe(
        'Azure OpenAI deployment name for text embeddings. Default: text-embedding-3-large. Example: text-embedding-ada-002',
      ),
    AZURE_OPENAI_ENDPOINT_EMBEDDING: z
      .string()
      .default(process.env.AZURE_OPENAI_ENDPOINT ?? '')
      .describe(
        'Azure OpenAI endpoint URL for embedding services (fallback to main endpoint). Example: https://myembeddings.openai.azure.com/',
      ),

    AZURE_OPENAI_KEY_EMBEDDING: z
      .string()
      .default(process.env.AZURE_OPENAI_KEY ?? '')
      .describe(
        'Azure OpenAI API key for embedding services (fallback to main key). Example: embed123key456...',
      ),

    AZURE_OPENAI_DEPLOYMENT_HIFI: z
      .string()
      .optional()
      .default('gpt-4.1' as AiModelType)
      .describe(
        'Azure OpenAI deployment name for high-fidelity chat models. Default: gpt-4.1. Example: gpt-4-turbo',
      ),
    AZURE_OPENAI_DEPLOYMENT_LOFI: z
      .string()
      .optional()
      .default('gpt-4o-mini' as AiModelType)
      .describe(
        'Azure OpenAI deployment name for low-fidelity/fast chat models. Default: gpt-4o-mini. Example: gpt-35-turbo',
      ),
    AZURE_OPENAI_DEPLOYMENT_COMPLETIONS: z
      .string()
      .optional()
      .default('gpt-4o-mini' as AiModelType)
      .describe(
        'Azure OpenAI deployment name for text completions. Default: gpt-4o-mini. Example: gpt-35-turbo',
      ),
    AZURE_OPENAI_ENDPOINT_COMPLETIONS: z
      .string()
      .default(process.env.AZURE_OPENAI_ENDPOINT ?? '')
      .describe(
        'Azure OpenAI endpoint URL for completion services (fallback to main endpoint). Example: https://mycompletions.openai.azure.com/',
      ),

    AZURE_OPENAI_KEY_COMPLETIONS: z
      .string()
      .default(process.env.AZURE_OPENAI_KEY ?? '')
      .describe(
        'Azure OpenAI API key for completion services (fallback to main key). Example: comp789key012...',
      ),
    AZURE_AISEARCH_POLICY_INDEX_NAME: z
      .string()
      .min(1)
      .describe(
        'Azure AI Search index name for storing policy document vectors and metadata. Example: policies-prod',
      ),
    AZURE_AISEARCH_VECTOR_SIZE_SMALL: z
      .coerce.number()
      .default(1536)
      .describe(
        'Vector dimension size for small embeddings in Azure AI Search. Default: 1536. Example: 1536',
      ),
    AZURE_AISEARCH_VECTOR_SIZE_LARGE: z
      .coerce.number()
      .default(3072)
      .describe(
        'Vector dimension size for large embeddings in Azure AI Search. Default: 3072. Example: 3072',
      ),
    AZURE_AISEARCH_DOCUMENT_SPLITTER_OVERLAP: z
      .coerce.number()
      .default(15)
      .describe(
        'Token overlap count when splitting documents for search indexing. Default: 15. Example: 20',
      ),
    AZURE_AISEARCH_DOCUMENT_SPLITTER_MAX_TOKENS: z
      .coerce.number()
      .default(512)
      .describe(
        'Maximum tokens per document chunk during splitting for indexing. Default: 512. Example: 512',
      ),
    TOKEN_BATCH_THRESHOLD: z
      .number()
      .default(50000)
      .describe(
        'Maximum cumulative token count (approx) per AI preprocessing batch when grouping case file documents with shared goals. Documents are accumulated until the next document would exceed this threshold, then a batch processing call is executed. Tuned to balance prompt size vs. parallelism. Override via env TOKEN_BATCH_THRESHOLD; defaults to 50,000 tokens. Example: 75000 for larger batches, 25000 for smaller batches',
      ),
    AUTH_GOOGLE_ID: z
      .string()
      .describe(
        'Google OAuth 2.0 client ID for user authentication. Example: 123456789-abcdef.apps.googleusercontent.com',
      ),
    AUTH_GOOGLE_SECRET: z
      .string()
      .describe(
        'Google OAuth 2.0 client secret for authentication flow. Example: GOCSPX-1234567890abcdef...',
      ),
    AUTH_GOOGLE_APIKEY: z
      .string()
      .describe(
        'Google API key for accessing Google services (Gmail, Drive, etc.). Example: AIzaSyD1234567890abcdef...',
      ),
    AZURE_STORAGE_CONNECTION_STRING: z
      .string()
      .min(1)
      .describe(
        'Azure Storage account connection string for blob storage. Example: DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=...',
      ),
    AZURE_STORAGE_ACCOUNT_KEY: z
      .string()
      .min(1)
      .describe(
        'Azure Storage account access key for authentication. Example: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      ),
    AZURE_STORAGE_ACCOUNT_NAME: z
      .string()
      .min(1)
      .describe(
        'Azure Storage account name for blob and file operations. Example: mystorageaccount',
      ),
    FLAGSMITH_SDK_KEY: z
      .string()
      .min(1)
      .describe(
        'Flagsmith server-side SDK key for feature flag management and privileged reads.',
      ),
    GOOGLE_CHROME_DEVTOOLS_WORKSPACE_ID: z
      .string()
      .default('a7c3f8e2-4b9d-4f1a-8c6e-5d2a3b7e9f4c')
      .describe(
        'Google Chrome DevTools workspace ID for app-specific integration. See {@link https://stackoverflow.com/questions/79629915/well-known-appspecific-com-chrome-devtools-json-request/79631068#79631068}',
      ),
    GOOGLE_GENERATIVE_AI_API_KEY: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Google Generative AI API key for Gemini model access (optional). Example: AIzaSyA1234567890abcdef...',
      ),

    GOOGLE_GENERATIVE_AI_BASE_URL: ZodProcessors.url()
      .default('https://generativelanguage.googleapis.com/v1beta')
      .describe(
        'Google Generative AI service base URL. Default: https://generativelanguage.googleapis.com/v1beta. Example: https://generativelanguage.googleapis.com/v1beta',
      ),
    GOOGLE_GENERATIVE_HIFI: z
      .string()
      .optional()
      .default('gemini-2.5-pro' as AiModelType)
      .describe(
        'Google Generative AI high-fidelity model name. Default: gemini-2.5-pro. Example: gemini-2.0-flash-exp',
      ),
    GOOGLE_GENERATIVE_LOFI: z
      .string()
      .optional()
      .default('gemini-2.5-flash' as AiModelType)
      .describe(
        'Google Generative AI low-fidelity/fast model name. Default: gemini-2.5-flash. Example: gemini-2.0-flash',
      ),
    GOOGLE_GENERATIVE_EMBEDDING: z
      .string()
      .optional()
      .default('google-embedding' as AiModelType)
      .describe(
        'Google Generative AI embedding model name. Default: google-embedding. Example: text-embedding-004',
      ),

    AUTH_KEYCLOAK_CLIENT_ID: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Keycloak OAuth client ID for authentication (optional). Example: web-app-client',
      ),
    AUTH_KEYCLOAK_CLIENT_SECRET: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Keycloak OAuth client secret for authentication (optional). Example: abc123-def456-ghi789',
      ),
    AUTH_KEYCLOAK_ISSUER: ZodProcessors.url()
      .optional()
      .describe(
        'Keycloak issuer URL for token validation. Default: development instance (optional). Example: https://auth.example.com/realms/myrealm',
      ),
    AUTH_KEYCLOAK_SCOPE: z
      .string()
      .optional()
      .default('openid')
      .describe(
        'Keycloak OAuth scope for authentication (optional). Example: openid mcp_tool',
      ),
    AUTH_KEYCLOAK_IMPERSONATION_AUDIENCE: z
      .string()
      .optional()
      .describe(
        'Keycloak audience for user impersonation tokens (optional). Example: admin-cli',
      ),
    AUTH_KEYCLOAK_REDIRECT_URI: z
      .string()
      .describe(
        'Keycloak redirect URI for user impersonation tokens (optional). Example: https://auth.example.com/realms/myrealm/protocol/openid-connect/auth',
      ),
    AUTH_KEYCLOAK_IMPERSONATOR_USERNAME: z
      .string()
      .optional()
      .describe(
        'Keycloak impersonator username for user impersonation tokens (optional). Example: admin',
      ),
    AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD: z
      .string()
      .optional()
      .describe(
        'Keycloak impersonator password for user impersonation tokens (optional). Example: admin',
      ),
    AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN: z
      .string()
      .optional()
      .describe(
        'Keycloak impersonator offline token for user impersonation tokens (optional). Example: admin',
      ),

    AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_NAME: z
      .string()
      .describe(
        'Keycloak resource name for MCP tool access; used for failover resolution if resource ID is not provided or invalid. Example: mcp-tool',
      )
      .default('mcp-tool'),
    AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_ID: z
      .string()
      .describe(
        'Keycloak resource ID for MCP tool access evaluation. Example: cd6fd773-2f10-4b32-aba9-9fd491ba9576',
      )
      .default('cd6fd773-2f10-4b32-aba9-9fd491ba9576'),
    REDIS_URL: z
      .string()
      .min(1)
      .describe(
        'Redis server connection URL for caching and session storage. Example: redis://localhost:6379',
      ),
    REDIS_PASSWORD: z
      .string()
      .min(1)
      .describe(
        'Redis server authentication password. Example: redis-secret-password',
      ),
    LOCAL_DEV_AUTH_BYPASS_USER_ID: z
      .string()
      .optional()
      .describe(
        'User ID for bypassing authentication in local development (optional). Example: dev-user-123',
      ),
    MEM0_API_HOST: ZodProcessors.url().describe(
      'Mem0 API service host URL for memory operations. Example: https://api.mem0.ai',
    ),
    MEM0_API_BASE_PATH: z
      .string()
      .default('api/v1')
      .describe(
        'Base path segment appended to Mem0 API requests (without leading slash). Example: api/v1',
      ),
    MEM0_UI_HOST: ZodProcessors.url().describe(
      'Mem0 UI dashboard host URL for memory management. Example: https://app.mem0.ai',
    ),
    MEM0_USERNAME: z
      .string()
      .min(1)
      .describe(
        'Mem0 service username for authentication. Example: user@example.com',
      ),
    MEM0_ORG_ID: ZodProcessors.nullableString()
      .default(null)
      .describe(
        'Mem0 organization ID for account scoping. Default: null. Example: org_1234567890abcdef',
      ),
    MEM0_PROJECT_ID: ZodProcessors.nullableString()
      .default(null)
      .describe(
        'Mem0 project ID for resource scoping. Default: null. Example: proj_abcdef1234567890',
      ),
    MEM0_API_KEY: z
      .string()
      .optional()
      .describe(
        'Mem0 API key for service authentication. Example: mem0_sk_1234567890abcdef...',
      ),
    NEXTAUTH_TRUST_HOST: ZodProcessors.truthy(false),
    NODE_ENV: z
      .string()
      .describe(
        'Node.js runtime environment mode. Example: development, production, test',
      ),
    OPENAI_API_KEY: z
      .string()
      .optional() // NOTE OpenAI direct model access not required
      .describe(
        'OpenAI API key for direct OpenAI service access (optional - Azure OpenAI preferred). Example: sk-1234567890abcdef...',
      ),

    OPENAI_HIFI: z
      .string()
      .optional()
      .default('gpt-5' as AiModelType)
      .describe(
        'OpenAI high-fidelity model name for complex reasoning tasks. Default: gpt-5. Example: gpt-4-turbo',
      ),
    OPENAI_LOFI: z
      .string()
      .optional()
      .default('gpt-5-mini' as AiModelType)
      .describe(
        'OpenAI low-fidelity/fast model name for simple tasks. Default: gpt-5-mini. Example: gpt-3.5-turbo',
      ),
    OPENAI_EMBEDDING: z
      .string()
      .optional()
      .default('text-embedding-3-large' as AiModelType)
      .describe(
        'OpenAI embedding model name for vector generation. Default: text-embedding-3-large. Example: text-embedding-3-large',
      ),
  })
  .extend(clientEnvSchema.shape); // Include all client env vars as well

export type ServerEnvType = ReturnType<typeof serverEnvSchema.parse>;

export const serverEnvFactory = (): ServerEnvType => {
  try {
    return isRunningOnClient()
      ? ({} as ServerEnvType)
      : serverEnvSchema.parse({ ...buildRawInstance(), ...process.env });
  } catch (e) {
    // AUTH_SECRET is only server-side and super required...if it's missing, we're probably a client bundle
    if ((process.env.AUTH_SECRET ?? '').length === 0) {
      // We aren't - return client environment pretending to be server
      return clientEnvFactory() as unknown as ServerEnvType;
    }
    // Otherwise, rethrow the error
    throw e;
  }
};
