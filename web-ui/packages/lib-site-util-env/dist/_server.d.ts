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
/**
 * Zod schema definition for validating and transforming server-side environment variables.
 * Provides type safety, default values, and validation rules for all server configuration.
 */
declare const serverEnvSchema: z.ZodObject<{
    AUTH_SECRET: z.ZodString;
    LOG_LEVEL_SERVER: z.ZodDefault<z.ZodString>;
    DATABASE_URL: z.ZodEffects<z.ZodString, string, string>;
    DATABASE_URL_UNPOOLED: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    AZURE_OPENAI_ENDPOINT: z.ZodEffects<z.ZodString, string, string>;
    AZURE_API_KEY: z.ZodString;
    AZURE_AISEARCH_ENDPOINT: z.ZodEffects<z.ZodString, string, string>;
    AZURE_AISEARCH_KEY: z.ZodString;
    AZURE_AISEARCH_DOCUMENTS_INDEX_NAME: z.ZodString;
    AZURE_OPENAI_DEPLOYMENT_CHAT: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    AZURE_OPENAI_DEPLOYMENT_EMBEDDING: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    AZURE_OPENAI_ENDPOINT_EMBEDDING: z.ZodDefault<z.ZodString>;
    AZURE_OPENAI_KEY_EMBEDDING: z.ZodDefault<z.ZodString>;
    AZURE_OPENAI_DEPLOYMENT_HIFI: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    AZURE_OPENAI_DEPLOYMENT_LOFI: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    AZURE_OPENAI_DEPLOYMENT_COMPLETIONS: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    AZURE_OPENAI_ENDPOINT_COMPLETIONS: z.ZodDefault<z.ZodString>;
    AZURE_OPENAI_KEY_COMPLETIONS: z.ZodDefault<z.ZodString>;
    AZURE_AISEARCH_POLICY_INDEX_NAME: z.ZodString;
    AZURE_AISEARCH_VECTOR_SIZE_SMALL: z.ZodDefault<z.ZodNumber>;
    AZURE_AISEARCH_VECTOR_SIZE_LARGE: z.ZodDefault<z.ZodNumber>;
    AZURE_AISEARCH_DOCUMENT_SPLITTER_OVERLAP: z.ZodDefault<z.ZodNumber>;
    AZURE_AISEARCH_DOCUMENT_SPLITTER_MAX_TOKENS: z.ZodDefault<z.ZodNumber>;
    TOKEN_BATCH_THRESHOLD: z.ZodDefault<z.ZodNumber>;
    AUTH_GOOGLE_ID: z.ZodString;
    AUTH_GOOGLE_SECRET: z.ZodString;
    AUTH_GOOGLE_APIKEY: z.ZodString;
    AZURE_STORAGE_CONNECTION_STRING: z.ZodString;
    AZURE_STORAGE_ACCOUNT_KEY: z.ZodString;
    AZURE_STORAGE_ACCOUNT_NAME: z.ZodString;
    FLAGSMITH_SDK_KEY: z.ZodString;
    GOOGLE_CHROME_DEVTOOLS_WORKSPACE_ID: z.ZodDefault<z.ZodString>;
    GOOGLE_GENERATIVE_AI_API_KEY: z.ZodOptional<z.ZodString>;
    GOOGLE_GENERATIVE_AI_BASE_URL: z.ZodDefault<z.ZodEffects<z.ZodString, string, string>>;
    GOOGLE_GENERATIVE_HIFI: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    GOOGLE_GENERATIVE_LOFI: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    GOOGLE_GENERATIVE_EMBEDDING: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    AUTH_KEYCLOAK_CLIENT_ID: z.ZodOptional<z.ZodString>;
    AUTH_KEYCLOAK_CLIENT_SECRET: z.ZodOptional<z.ZodString>;
    AUTH_KEYCLOAK_ISSUER: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    AUTH_KEYCLOAK_SCOPE: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    AUTH_KEYCLOAK_IMPERSONATION_AUDIENCE: z.ZodOptional<z.ZodString>;
    AUTH_KEYCLOAK_REDIRECT_URI: z.ZodString;
    AUTH_KEYCLOAK_IMPERSONATOR_USERNAME: z.ZodOptional<z.ZodString>;
    AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD: z.ZodOptional<z.ZodString>;
    AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN: z.ZodOptional<z.ZodString>;
    AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_NAME: z.ZodDefault<z.ZodString>;
    AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_ID: z.ZodDefault<z.ZodString>;
    REDIS_URL: z.ZodString;
    REDIS_PASSWORD: z.ZodString;
    LOCAL_DEV_AUTH_BYPASS_USER_ID: z.ZodOptional<z.ZodString>;
    MEM0_API_HOST: z.ZodEffects<z.ZodString, string, string>;
    MEM0_API_BASE_PATH: z.ZodDefault<z.ZodString>;
    MEM0_UI_HOST: z.ZodEffects<z.ZodString, string, string>;
    MEM0_USERNAME: z.ZodString;
    MEM0_ORG_ID: z.ZodDefault<z.ZodEffects<z.ZodNullable<z.ZodString>, string | null, string | null>>;
    MEM0_PROJECT_ID: z.ZodDefault<z.ZodEffects<z.ZodNullable<z.ZodString>, string | null, string | null>>;
    MEM0_API_KEY: z.ZodOptional<z.ZodString>;
    NODE_ENV: z.ZodString;
    OPENAI_API_KEY: z.ZodOptional<z.ZodString>;
    OPENAI_HIFI: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    OPENAI_LOFI: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    OPENAI_EMBEDDING: z.ZodDefault<z.ZodOptional<z.ZodString>>;
} & {
    NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING: z.ZodOptional<z.ZodString>;
    NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT: z.ZodDefault<z.ZodType<number, z.ZodTypeDef, unknown>>;
    NEXT_PUBLIC_DEFAULT_AI_MODEL: z.ZodDefault<z.ZodEffects<z.ZodString, "lofi" | "hifi" | "google:lofi" | "google:hifi" | "completions" | "gemini-pro" | "gemini-flash" | "azure:lofi" | "azure:hifi" | "azure:completions" | "azure:embedding" | "google:completions" | "google:embedding" | "google:gemini-2.0-flash", string>>;
    NEXT_PUBLIC_FLAGSMITH_API_URL: z.ZodString;
    NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID: z.ZodString;
    NEXT_PUBLIC_HOSTNAME: z.ZodDefault<z.ZodEffects<z.ZodString, string, string>>;
    NEXT_PUBLIC_LOG_LEVEL_CLIENT: z.ZodDefault<z.ZodDefault<z.ZodString>>;
    NEXT_PUBLIC_MUI_LICENSE: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    LOG_LEVEL_SERVER: string;
    NEXT_PUBLIC_LOG_LEVEL_CLIENT: string;
    AUTH_SECRET: string;
    NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT: number;
    NEXT_PUBLIC_DEFAULT_AI_MODEL: "lofi" | "hifi" | "google:lofi" | "google:hifi" | "completions" | "gemini-pro" | "gemini-flash" | "azure:lofi" | "azure:hifi" | "azure:completions" | "azure:embedding" | "google:completions" | "google:embedding" | "google:gemini-2.0-flash";
    NEXT_PUBLIC_FLAGSMITH_API_URL: string;
    NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID: string;
    NEXT_PUBLIC_HOSTNAME: string;
    NEXT_PUBLIC_MUI_LICENSE: string;
    DATABASE_URL: string;
    AZURE_OPENAI_ENDPOINT: string;
    AZURE_API_KEY: string;
    AZURE_AISEARCH_ENDPOINT: string;
    AZURE_AISEARCH_KEY: string;
    AZURE_AISEARCH_DOCUMENTS_INDEX_NAME: string;
    AZURE_OPENAI_DEPLOYMENT_CHAT: string;
    AZURE_OPENAI_DEPLOYMENT_EMBEDDING: string;
    AZURE_OPENAI_ENDPOINT_EMBEDDING: string;
    AZURE_OPENAI_KEY_EMBEDDING: string;
    AZURE_OPENAI_DEPLOYMENT_HIFI: string;
    AZURE_OPENAI_DEPLOYMENT_LOFI: string;
    AZURE_OPENAI_DEPLOYMENT_COMPLETIONS: string;
    AZURE_OPENAI_ENDPOINT_COMPLETIONS: string;
    AZURE_OPENAI_KEY_COMPLETIONS: string;
    AZURE_AISEARCH_POLICY_INDEX_NAME: string;
    AZURE_AISEARCH_VECTOR_SIZE_SMALL: number;
    AZURE_AISEARCH_VECTOR_SIZE_LARGE: number;
    AZURE_AISEARCH_DOCUMENT_SPLITTER_OVERLAP: number;
    AZURE_AISEARCH_DOCUMENT_SPLITTER_MAX_TOKENS: number;
    TOKEN_BATCH_THRESHOLD: number;
    AUTH_GOOGLE_ID: string;
    AUTH_GOOGLE_SECRET: string;
    AUTH_GOOGLE_APIKEY: string;
    AZURE_STORAGE_CONNECTION_STRING: string;
    AZURE_STORAGE_ACCOUNT_KEY: string;
    AZURE_STORAGE_ACCOUNT_NAME: string;
    FLAGSMITH_SDK_KEY: string;
    GOOGLE_CHROME_DEVTOOLS_WORKSPACE_ID: string;
    GOOGLE_GENERATIVE_AI_BASE_URL: string;
    GOOGLE_GENERATIVE_HIFI: string;
    GOOGLE_GENERATIVE_LOFI: string;
    GOOGLE_GENERATIVE_EMBEDDING: string;
    AUTH_KEYCLOAK_SCOPE: string;
    AUTH_KEYCLOAK_REDIRECT_URI: string;
    AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_NAME: string;
    AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_ID: string;
    REDIS_URL: string;
    REDIS_PASSWORD: string;
    MEM0_API_HOST: string;
    MEM0_API_BASE_PATH: string;
    MEM0_UI_HOST: string;
    MEM0_USERNAME: string;
    MEM0_ORG_ID: string | null;
    MEM0_PROJECT_ID: string | null;
    NODE_ENV: string;
    OPENAI_HIFI: string;
    OPENAI_LOFI: string;
    OPENAI_EMBEDDING: string;
    NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING?: string | undefined;
    DATABASE_URL_UNPOOLED?: string | undefined;
    GOOGLE_GENERATIVE_AI_API_KEY?: string | undefined;
    AUTH_KEYCLOAK_CLIENT_ID?: string | undefined;
    AUTH_KEYCLOAK_CLIENT_SECRET?: string | undefined;
    AUTH_KEYCLOAK_ISSUER?: string | undefined;
    AUTH_KEYCLOAK_IMPERSONATION_AUDIENCE?: string | undefined;
    AUTH_KEYCLOAK_IMPERSONATOR_USERNAME?: string | undefined;
    AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD?: string | undefined;
    AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN?: string | undefined;
    LOCAL_DEV_AUTH_BYPASS_USER_ID?: string | undefined;
    MEM0_API_KEY?: string | undefined;
    OPENAI_API_KEY?: string | undefined;
}, {
    AUTH_SECRET: string;
    NEXT_PUBLIC_FLAGSMITH_API_URL: string;
    NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID: string;
    DATABASE_URL: string;
    AZURE_OPENAI_ENDPOINT: string;
    AZURE_API_KEY: string;
    AZURE_AISEARCH_ENDPOINT: string;
    AZURE_AISEARCH_KEY: string;
    AZURE_AISEARCH_DOCUMENTS_INDEX_NAME: string;
    AZURE_AISEARCH_POLICY_INDEX_NAME: string;
    AUTH_GOOGLE_ID: string;
    AUTH_GOOGLE_SECRET: string;
    AUTH_GOOGLE_APIKEY: string;
    AZURE_STORAGE_CONNECTION_STRING: string;
    AZURE_STORAGE_ACCOUNT_KEY: string;
    AZURE_STORAGE_ACCOUNT_NAME: string;
    FLAGSMITH_SDK_KEY: string;
    AUTH_KEYCLOAK_REDIRECT_URI: string;
    REDIS_URL: string;
    REDIS_PASSWORD: string;
    MEM0_API_HOST: string;
    MEM0_UI_HOST: string;
    MEM0_USERNAME: string;
    NODE_ENV: string;
    LOG_LEVEL_SERVER?: string | undefined;
    NEXT_PUBLIC_LOG_LEVEL_CLIENT?: string | undefined;
    NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING?: string | undefined;
    NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT?: unknown;
    NEXT_PUBLIC_DEFAULT_AI_MODEL?: string | undefined;
    NEXT_PUBLIC_HOSTNAME?: string | undefined;
    NEXT_PUBLIC_MUI_LICENSE?: string | undefined;
    DATABASE_URL_UNPOOLED?: string | undefined;
    AZURE_OPENAI_DEPLOYMENT_CHAT?: string | undefined;
    AZURE_OPENAI_DEPLOYMENT_EMBEDDING?: string | undefined;
    AZURE_OPENAI_ENDPOINT_EMBEDDING?: string | undefined;
    AZURE_OPENAI_KEY_EMBEDDING?: string | undefined;
    AZURE_OPENAI_DEPLOYMENT_HIFI?: string | undefined;
    AZURE_OPENAI_DEPLOYMENT_LOFI?: string | undefined;
    AZURE_OPENAI_DEPLOYMENT_COMPLETIONS?: string | undefined;
    AZURE_OPENAI_ENDPOINT_COMPLETIONS?: string | undefined;
    AZURE_OPENAI_KEY_COMPLETIONS?: string | undefined;
    AZURE_AISEARCH_VECTOR_SIZE_SMALL?: number | undefined;
    AZURE_AISEARCH_VECTOR_SIZE_LARGE?: number | undefined;
    AZURE_AISEARCH_DOCUMENT_SPLITTER_OVERLAP?: number | undefined;
    AZURE_AISEARCH_DOCUMENT_SPLITTER_MAX_TOKENS?: number | undefined;
    TOKEN_BATCH_THRESHOLD?: number | undefined;
    GOOGLE_CHROME_DEVTOOLS_WORKSPACE_ID?: string | undefined;
    GOOGLE_GENERATIVE_AI_API_KEY?: string | undefined;
    GOOGLE_GENERATIVE_AI_BASE_URL?: string | undefined;
    GOOGLE_GENERATIVE_HIFI?: string | undefined;
    GOOGLE_GENERATIVE_LOFI?: string | undefined;
    GOOGLE_GENERATIVE_EMBEDDING?: string | undefined;
    AUTH_KEYCLOAK_CLIENT_ID?: string | undefined;
    AUTH_KEYCLOAK_CLIENT_SECRET?: string | undefined;
    AUTH_KEYCLOAK_ISSUER?: string | undefined;
    AUTH_KEYCLOAK_SCOPE?: string | undefined;
    AUTH_KEYCLOAK_IMPERSONATION_AUDIENCE?: string | undefined;
    AUTH_KEYCLOAK_IMPERSONATOR_USERNAME?: string | undefined;
    AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD?: string | undefined;
    AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN?: string | undefined;
    AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_NAME?: string | undefined;
    AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_ID?: string | undefined;
    LOCAL_DEV_AUTH_BYPASS_USER_ID?: string | undefined;
    MEM0_API_BASE_PATH?: string | undefined;
    MEM0_ORG_ID?: string | null | undefined;
    MEM0_PROJECT_ID?: string | null | undefined;
    MEM0_API_KEY?: string | undefined;
    OPENAI_API_KEY?: string | undefined;
    OPENAI_HIFI?: string | undefined;
    OPENAI_LOFI?: string | undefined;
    OPENAI_EMBEDDING?: string | undefined;
}>;
/**
 * TypeScript type definition for validated server environment variables.
 * Inferred from the Zod schema to ensure type safety across the application.
 */
export type ServerEnvType = ReturnType<typeof serverEnvSchema.parse>;
/**
 * Factory function for creating validated server environment configuration.
 *
 * This function provides type-safe access to server-side environment variables
 * with comprehensive validation and fallback handling. It ensures that all
 * required configuration is present and valid before the application starts.
 *
 * @returns Validated server environment configuration object
 *
 * @throws {ZodError} When required environment variables are missing or invalid
 *
 * @example
 * ```typescript
 * // Get validated server environment
 * const env = serverEnvFactory();
 *
 * // Access configuration with full type safety
 * const dbUrl = env.DATABASE_URL;
 * const aiModel = env.AZURE_OPENAI_DEPLOYMENT_HIFI;
 * const logLevel = env.LOG_LEVEL_SERVER;
 * ```
 *
 * @remarks
 * - Returns empty object when running on client-side (SSR safety)
 * - Falls back to client environment if AUTH_SECRET is missing
 * - Validates all environment variables against their schemas
 * - Provides default values for optional configuration
 */
export declare const serverEnvFactory: () => ServerEnvType;
export {};
//# sourceMappingURL=_server.d.ts.map