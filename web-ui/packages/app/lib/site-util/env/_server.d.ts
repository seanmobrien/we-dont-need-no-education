/**
 * @module site-util/env/_server
 * @description Server-side environment variable configuration and validation
 *
 * This module provides type-safe access to server-only environment variables
 * with Zod schema validation. It extends the client environment variables
 * with additional server-specific configuration for databases, AI services,
 * authentication providers, and other server-only resources.
 *
 * **SECURITY**: Never import or expose these variables to client-side code.
 * They contain sensitive credentials and should only be accessed in server
 * components, API routes, and server actions.
 *
 * @author NoEducation Platform Team
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * import { serverEnvFactory } from './_server';
 *
 * // In a server component or API route
 * export async function GET() {
 *   const env = serverEnvFactory();
 *   const dbUrl = env.DATABASE_URL;
 *   const aiKey = env.AZURE_API_KEY;
 *   // ... server-only operations
 * }
 * ```
 *
 * @see {@link https://nextjs.org/docs/app/building-your-application/configuring/environment-variables Next.js Environment Variables}
 */

import type { z } from 'zod';

/**
 * Type representing the validated server-side environment variables.
 *
 * This type includes all client environment variables plus server-specific
 * configuration. It is automatically inferred from the Zod schema and provides
 * complete type safety for all server environment variables.
 *
 * @remarks
 * Inherits all properties from ClientEnvType and adds server-specific fields
 *
 * @example
 * ```typescript
 * import { ServerEnvType } from './_server';
 *
 * function getDbConfig(env: ServerEnvType) {
 *   return {
 *     url: env.DATABASE_URL,
 *     unpooled: env.DATABASE_URL_UNPOOLED
 *   };
 * }
 * ```
 */
export type ServerEnvType = ReturnType<typeof serverEnvSchema.parse>;

/**
 * Zod validation schema for server-side environment variables.
 *
 * This comprehensive schema validates and transforms all server environment
 * variables, extending the client schema with server-specific fields. It
 * provides type safety, default values, and detailed validation rules.
 *
 * @remarks
 * - Extends clientEnvSchema to include all public variables
 * - Validates required secrets and credentials
 * - Provides sensible defaults for optional configuration
 * - Includes detailed descriptions for each field
 *
 * Schema includes validation for:
 * - Authentication secrets and OAuth credentials
 * - Database connection strings (pooled and direct)
 * - Azure OpenAI and AI Search configuration
 * - Google Cloud AI services
 * - Keycloak authentication
 * - Redis caching
 * - Azure Storage
 * - Mem0 memory services
 * - Feature flags (Flagsmith)
 * - OpenAI direct access
 * - Vector search configuration
 *
 * @example
 * ```typescript
 * // Typically used internally by serverEnvFactory()
 * // Manual validation for testing:
 * const validated = serverEnvSchema.parse({
 *   AUTH_SECRET: "my-secret-key",
 *   DATABASE_URL: "postgresql://...",
 *   // ... all other required fields
 * });
 * ```
 */
export declare const serverEnvSchema: z.ZodObject<{
  /**
   * Auth.js secret for signing JWT tokens and session cookies.
   * Required for authentication to function securely.
   *
   * @required
   * @example "super-secret-random-string-min-32-chars"
   */
  AUTH_SECRET: z.ZodString;

  /**
   * Server-side logging level for application logs.
   * Controls verbosity of server console/file output.
   *
   * @default "warn"
   * @example "error", "warn", "info", "debug", "trace"
   */
  LOG_LEVEL_SERVER: z.ZodDefault<z.ZodString>;

  /**
   * Primary PostgreSQL database connection URL with pooling.
   * Used for most database operations through connection pool.
   *
   * @required
   * @example "postgresql://user:pass@host:5432/dbname?schema=public"
   */
  DATABASE_URL: z.ZodEffects<z.ZodString, string, string>;

  /**
   * Direct PostgreSQL connection URL without pooling.
   * Used for operations requiring direct database access.
   *
   * @optional
   * @example "postgresql://user:pass@host:5432/dbname?pgbouncer=true"
   */
  DATABASE_URL_UNPOOLED: z.ZodOptional<
    z.ZodEffects<z.ZodString, string, string>
  >;

  /**
   * Azure OpenAI service endpoint URL for AI model access.
   *
   * @required
   * @example "https://myopenai.openai.azure.com/"
   */
  AZURE_OPENAI_ENDPOINT: z.ZodEffects<z.ZodString, string, string>;

  /**
   * Azure OpenAI API key for service authentication.
   *
   * @required
   * @example "abc123def456ghi789..."
   */
  AZURE_API_KEY: z.ZodString;

  /**
   * Azure AI Search service endpoint for vector search.
   *
   * @required
   * @example "https://mysearch.search.windows.net"
   */
  AZURE_AISEARCH_ENDPOINT: z.ZodEffects<z.ZodString, string, string>;

  /**
   * Azure AI Search API key for service authentication.
   *
   * @required
   * @example "xyz789abc456def123..."
   */
  AZURE_AISEARCH_KEY: z.ZodString;

  /**
   * Azure AI Search index name for document storage.
   *
   * @required
   * @example "documents-prod", "documents-dev"
   */
  AZURE_AISEARCH_DOCUMENTS_INDEX_NAME: z.ZodString;

  /**
   * Azure OpenAI deployment name for chat models.
   *
   * @default "gpt-4.1"
   * @example "gpt-4-turbo", "gpt-4"
   */
  AZURE_OPENAI_DEPLOYMENT_CHAT: z.ZodDefault<z.ZodOptional<z.ZodString>>;

  /**
   * Azure OpenAI deployment name for embeddings.
   *
   * @default "text-embedding-3-large"
   * @example "text-embedding-ada-002", "text-embedding-3-small"
   */
  AZURE_OPENAI_DEPLOYMENT_EMBEDDING: z.ZodDefault<
    z.ZodOptional<z.ZodString>
  >;

  /**
   * Azure OpenAI endpoint URL for embedding services.
   * Falls back to main AZURE_OPENAI_ENDPOINT if not specified.
   *
   * @default process.env.AZURE_OPENAI_ENDPOINT
   * @example "https://myembeddings.openai.azure.com/"
   */
  AZURE_OPENAI_ENDPOINT_EMBEDDING: z.ZodDefault<z.ZodString>;

  /**
   * Azure OpenAI API key for embedding services.
   * Falls back to main AZURE_API_KEY if not specified.
   *
   * @default process.env.AZURE_API_KEY
   * @example "embed123key456..."
   */
  AZURE_OPENAI_KEY_EMBEDDING: z.ZodDefault<z.ZodString>;

  /**
   * Azure OpenAI deployment name for high-fidelity models.
   *
   * @default "gpt-4.1"
   * @example "gpt-4-turbo", "gpt-5"
   */
  AZURE_OPENAI_DEPLOYMENT_HIFI: z.ZodDefault<z.ZodOptional<z.ZodString>>;

  /**
   * Azure OpenAI deployment name for low-fidelity/fast models.
   *
   * @default "gpt-4o-mini"
   * @example "gpt-35-turbo", "gpt-4o-mini"
   */
  AZURE_OPENAI_DEPLOYMENT_LOFI: z.ZodDefault<z.ZodOptional<z.ZodString>>;

  /**
   * Azure OpenAI deployment name for text completions.
   *
   * @default "gpt-4o-mini"
   * @example "gpt-35-turbo"
   */
  AZURE_OPENAI_DEPLOYMENT_COMPLETIONS: z.ZodDefault<
    z.ZodOptional<z.ZodString>
  >;

  /**
   * Azure OpenAI endpoint URL for completion services.
   * Falls back to main AZURE_OPENAI_ENDPOINT if not specified.
   *
   * @default process.env.AZURE_OPENAI_ENDPOINT
   * @example "https://mycompletions.openai.azure.com/"
   */
  AZURE_OPENAI_ENDPOINT_COMPLETIONS: z.ZodDefault<z.ZodString>;

  /**
   * Azure OpenAI API key for completion services.
   * Falls back to main AZURE_API_KEY if not specified.
   *
   * @default process.env.AZURE_API_KEY
   * @example "comp789key012..."
   */
  AZURE_OPENAI_KEY_COMPLETIONS: z.ZodDefault<z.ZodString>;

  /**
   * Azure AI Search index name for policy documents.
   *
   * @required
   * @example "policies-prod", "policies-dev"
   */
  AZURE_AISEARCH_POLICY_INDEX_NAME: z.ZodString;

  /**
   * Vector dimension size for small embeddings in Azure AI Search.
   *
   * @default 1536
   * @example 1536, 768
   */
  AZURE_AISEARCH_VECTOR_SIZE_SMALL: z.ZodDefault<z.ZodNumber>;

  /**
   * Vector dimension size for large embeddings in Azure AI Search.
   *
   * @default 3072
   * @example 3072, 1536
   */
  AZURE_AISEARCH_VECTOR_SIZE_LARGE: z.ZodDefault<z.ZodNumber>;

  /**
   * Token overlap when splitting documents for indexing.
   * Higher values improve context continuity but increase index size.
   *
   * @default 15
   * @example 20, 10
   */
  AZURE_AISEARCH_DOCUMENT_SPLITTER_OVERLAP: z.ZodDefault<z.ZodNumber>;

  /**
   * Maximum tokens per document chunk for indexing.
   *
   * @default 512
   * @example 512, 1024, 256
   */
  AZURE_AISEARCH_DOCUMENT_SPLITTER_MAX_TOKENS: z.ZodDefault<z.ZodNumber>;

  /**
   * Maximum cumulative tokens per AI batch processing operation.
   * Balances prompt size vs parallelism for document processing.
   *
   * @default 50000
   * @example 75000, 25000
   */
  TOKEN_BATCH_THRESHOLD: z.ZodDefault<z.ZodNumber>;

  /**
   * Google OAuth 2.0 client ID for authentication.
   *
   * @required
   * @example "123456789-abcdef.apps.googleusercontent.com"
   */
  AUTH_GOOGLE_ID: z.ZodString;

  /**
   * Google OAuth 2.0 client secret for authentication.
   *
   * @required
   * @example "GOCSPX-1234567890abcdef..."
   */
  AUTH_GOOGLE_SECRET: z.ZodString;

  /**
   * Google API key for service access (Gmail, Drive, etc.).
   *
   * @required
   * @example "AIzaSyD1234567890abcdef..."
   */
  AUTH_GOOGLE_APIKEY: z.ZodString;

  /**
   * Azure Storage account connection string for blob storage.
   *
   * @required
   * @example "DefaultEndpointsProtocol=https;AccountName=myaccount;..."
   */
  AZURE_STORAGE_CONNECTION_STRING: z.ZodString;

  /**
   * Azure Storage account access key.
   *
   * @required
   * @example "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
   */
  AZURE_STORAGE_ACCOUNT_KEY: z.ZodString;

  /**
   * Azure Storage account name.
   *
   * @required
   * @example "mystorageaccount"
   */
  AZURE_STORAGE_ACCOUNT_NAME: z.ZodString;

  /**
   * Flagsmith server-side SDK key for feature flags.
   * Supports privileged operations and updates.
   *
   * @required
   * @example "ser.abc123def456..."
   */
  FLAGSMITH_SDK_KEY: z.ZodString;

  /**
   * Google Chrome DevTools workspace ID for app integration.
   *
   * @default "a7c3f8e2-4b9d-4f1a-8c6e-5d2a3b7e9f4c"
   * @example "a7c3f8e2-4b9d-4f1a-8c6e-5d2a3b7e9f4c"
   * @see {@link https://stackoverflow.com/questions/79629915/ Stack Overflow Discussion}
   */
  GOOGLE_CHROME_DEVTOOLS_WORKSPACE_ID: z.ZodDefault<z.ZodString>;

  /**
   * Google Generative AI API key for Gemini models.
   *
   * @optional
   * @example "AIzaSyA1234567890abcdef..."
   */
  GOOGLE_GENERATIVE_AI_API_KEY: z.ZodOptional<z.ZodString>;

  /**
   * Google Generative AI service base URL.
   *
   * @default "https://generativelanguage.googleapis.com/v1beta"
   * @example "https://generativelanguage.googleapis.com/v1beta"
   */
  GOOGLE_GENERATIVE_AI_BASE_URL: z.ZodDefault<
    z.ZodEffects<z.ZodString, string, string>
  >;

  /**
   * Google Generative AI high-fidelity model name.
   *
   * @default "gemini-2.5-pro"
   * @example "gemini-2.0-flash-exp", "gemini-pro"
   */
  GOOGLE_GENERATIVE_HIFI: z.ZodDefault<z.ZodOptional<z.ZodString>>;

  /**
   * Google Generative AI low-fidelity/fast model name.
   *
   * @default "gemini-2.5-flash"
   * @example "gemini-2.0-flash", "gemini-flash"
   */
  GOOGLE_GENERATIVE_LOFI: z.ZodDefault<z.ZodOptional<z.ZodString>>;

  /**
   * Google Generative AI embedding model name.
   *
   * @default "google-embedding"
   * @example "text-embedding-004"
   */
  GOOGLE_GENERATIVE_EMBEDDING: z.ZodDefault<z.ZodOptional<z.ZodString>>;

  /**
   * Keycloak OAuth client ID for authentication.
   *
   * @optional
   * @example "web-app-client"
   */
  AUTH_KEYCLOAK_CLIENT_ID: z.ZodOptional<z.ZodString>;

  /**
   * Keycloak OAuth client secret.
   *
   * @optional
   * @example "abc123-def456-ghi789"
   */
  AUTH_KEYCLOAK_CLIENT_SECRET: z.ZodOptional<z.ZodString>;

  /**
   * Keycloak issuer URL for token validation.
   *
   * @optional
   * @example "https://auth.example.com/realms/myrealm"
   */
  AUTH_KEYCLOAK_ISSUER: z.ZodOptional<
    z.ZodEffects<z.ZodString, string, string>
  >;

  /**
   * Keycloak OAuth scope for authentication.
   *
   * @default "openid"
   * @example "openid profile email roles mcp-tool"
   */
  AUTH_KEYCLOAK_SCOPE: z.ZodDefault<z.ZodOptional<z.ZodString>>;

  /**
   * Keycloak audience for impersonation tokens.
   *
   * @optional
   * @example "admin-cli"
   */
  AUTH_KEYCLOAK_IMPERSONATION_AUDIENCE: z.ZodOptional<z.ZodString>;

  /**
   * Keycloak redirect URI for authentication callbacks.
   *
   * @required
   * @example "https://app.example.com/api/auth/callback/keycloak"
   */
  AUTH_KEYCLOAK_REDIRECT_URI: z.ZodString;

  /**
   * Keycloak impersonator username for user impersonation.
   *
   * @optional
   * @example "admin"
   */
  AUTH_KEYCLOAK_IMPERSONATOR_USERNAME: z.ZodOptional<z.ZodString>;

  /**
   * Keycloak impersonator password for user impersonation.
   *
   * @optional
   * @example "admin-password"
   */
  AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD: z.ZodOptional<z.ZodString>;

  /**
   * Keycloak impersonator offline token for long-lived impersonation.
   *
   * @optional
   * @example "offline-token-abc123..."
   */
  AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN: z.ZodOptional<z.ZodString>;

  /**
   * Keycloak resource name for MCP tool access control.
   * Used for failover if resource ID is invalid.
   *
   * @default "mcp-tool"
   * @example "mcp-tool", "chat-access"
   */
  AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_NAME: z.ZodDefault<z.ZodString>;

  /**
   * Keycloak resource ID for MCP tool access evaluation.
   *
   * @default "cd6fd773-2f10-4b32-aba9-9fd491ba9576"
   * @example "cd6fd773-2f10-4b32-aba9-9fd491ba9576"
   */
  AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_ID: z.ZodDefault<z.ZodString>;

  /**
   * Redis connection URL for caching and sessions.
   *
   * @required
   * @example "redis://localhost:6379", "rediss://user:pass@host:6380"
   */
  REDIS_URL: z.ZodString;

  /**
   * Redis authentication password.
   *
   * @required
   * @example "redis-secret-password"
   */
  REDIS_PASSWORD: z.ZodString;

  /**
   * User ID to bypass authentication in local development.
   * Should never be set in production.
   *
   * @optional
   * @example "dev-user-123"
   */
  LOCAL_DEV_AUTH_BYPASS_USER_ID: z.ZodOptional<z.ZodString>;

  /**
   * Mem0 API service host URL for memory operations.
   *
   * @required
   * @example "https://api.mem0.ai"
   */
  MEM0_API_HOST: z.ZodEffects<z.ZodString, string, string>;

  /**
   * Base path appended to Mem0 API requests.
   *
   * @default "api/v1"
   * @example "api/v1", "v2"
   */
  MEM0_API_BASE_PATH: z.ZodDefault<z.ZodString>;

  /**
   * Mem0 UI dashboard host URL.
   *
   * @required
   * @example "https://app.mem0.ai"
   */
  MEM0_UI_HOST: z.ZodEffects<z.ZodString, string, string>;

  /**
   * Mem0 service username for authentication.
   *
   * @required
   * @example "user@example.com"
   */
  MEM0_USERNAME: z.ZodString;

  /**
   * Mem0 organization ID for account scoping.
   *
   * @default null
   * @example "org_1234567890abcdef"
   */
  MEM0_ORG_ID: z.ZodDefault<
    z.ZodEffects<z.ZodNullable<z.ZodString>, string | null, string | null>
  >;

  /**
   * Mem0 project ID for resource scoping.
   *
   * @default null
   * @example "proj_abcdef1234567890"
   */
  MEM0_PROJECT_ID: z.ZodDefault<
    z.ZodEffects<z.ZodNullable<z.ZodString>, string | null, string | null>
  >;

  /**
   * Mem0 API key for service authentication.
   *
   * @optional
   * @example "mem0_sk_1234567890abcdef..."
   */
  MEM0_API_KEY: z.ZodOptional<z.ZodString>;

  /**
   * Node.js environment mode.
   *
   * @required
   * @example "development", "production", "test"
   */
  NODE_ENV: z.ZodString;

  /**
   * OpenAI API key for direct OpenAI service access.
   * Optional - Azure OpenAI is preferred.
   *
   * @optional
   * @example "sk-1234567890abcdef..."
   */
  OPENAI_API_KEY: z.ZodOptional<z.ZodString>;

  /**
   * OpenAI high-fidelity model for complex tasks.
   *
   * @default "gpt-5"
   * @example "gpt-4-turbo", "gpt-4"
   */
  OPENAI_HIFI: z.ZodDefault<z.ZodOptional<z.ZodString>>;

  /**
   * OpenAI low-fidelity/fast model for simple tasks.
   *
   * @default "gpt-5-mini"
   * @example "gpt-3.5-turbo", "gpt-4o-mini"
   */
  OPENAI_LOFI: z.ZodDefault<z.ZodOptional<z.ZodString>>;

  /**
   * OpenAI embedding model for vector generation.
   *
   * @default "text-embedding-3-large"
   * @example "text-embedding-3-large", "text-embedding-ada-002"
   */
  OPENAI_EMBEDDING: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}>;

/**
 * Factory function for creating validated server environment configuration.
 *
 * This function provides type-safe access to server-side environment variables
 * with comprehensive validation and fallback handling. It ensures all required
 * configuration is present and valid before the application starts.
 *
 * @returns {ServerEnvType} Validated server environment configuration object
 *
 * @throws {z.ZodError} When required environment variables are missing or invalid
 *
 * @remarks
 * - Returns empty object when running on client-side (SSR safety)
 * - Falls back to client environment if AUTH_SECRET is missing
 * - Validates all environment variables against their schemas
 * - Provides default values for optional configuration
 * - Merges client and server environment variables
 *
 * @example
 * ```typescript
 * // In a server component
 * export default async function ServerPage() {
 *   const env = serverEnvFactory();
 *
 *   // Access server configuration with full type safety
 *   const db = await connectDatabase(env.DATABASE_URL);
 *   const ai = createAIClient(env.AZURE_API_KEY);
 *   const logLevel = env.LOG_LEVEL_SERVER;
 * }
 *
 * // In an API route
 * export async function POST(request: Request) {
 *   const env = serverEnvFactory();
 *   const redis = createRedisClient(env.REDIS_URL, env.REDIS_PASSWORD);
 *   // ... handle request
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Error handling
 * try {
 *   const env = serverEnvFactory();
 * } catch (error) {
 *   if (error instanceof z.ZodError) {
 *     console.error('Environment validation failed:');
 *     error.issues.forEach(issue => {
 *       console.error(`- ${issue.path.join('.')}: ${issue.message}`);
 *     });
 *   }
 *   throw error;
 * }
 * ```
 */
export declare function serverEnvFactory(): ServerEnvType;
