"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/_server.ts
var server_exports = {};
__export(server_exports, {
  serverEnvFactory: () => serverEnvFactory
});
module.exports = __toCommonJS(server_exports);
var import_zod3 = require("zod");

// src/_common.ts
var import_utility_methods = require("@repo/app/lib/react-util/utility-methods");
var import_logged_error = require("@repo/app/lib/react-util/errors/logged-error");
var import_zod = __toESM(require("zod"));
var import_guards = require("@repo/app/lib/ai/core/guards");
var import_unions = require("@repo/app/lib/ai/core/unions");
var currentRuntime = (() => {
  if (typeof window !== "undefined") {
    if ("Deno" in window) {
      return "edge";
    } else if ("process" in window) {
      return "nodejs";
    }
    return "client";
  } else {
    if (typeof process !== "undefined") {
      return "nodejs";
    }
    return "server";
  }
  return "static";
})();
var isRunningOnClient = () => {
  switch (currentRuntime) {
    case "client":
      return true;
    case "edge":
      return false;
    default:
      return !process.env.AUTH_SECRET;
  }
};
var ZodProcessors = {
  /**
   * Processor for URL strings.
   * Ensures the value is a valid URL and removes trailing slashes.
   *
   * @returns {ZodString} A Zod string schema for URLs.
   */
  url: () => import_zod.default.string().transform((val, ctx) => {
    try {
      const url = new URL(val);
      return url.href.replace(/\/$/, "");
    } catch (error) {
      ctx.addIssue({
        code: import_zod.default.ZodIssueCode.custom,
        message: `Invalid URL: ${val} - ${import_logged_error.LoggedError.isTurtlesAllTheWayDownBaby(error).message}`
      });
      return import_zod.default.NEVER;
    }
  }),
  /**
   * Processor for log level strings.
   * Provides a default value of 'info' if not specified.
   *
   * @returns {ZodString} A Zod string schema for log levels.
   */
  logLevel: (level = "info") => import_zod.default.string().default(level ?? "info"),
  aiModelType: (defaultValue) => import_zod.default.preprocess((val, ctx) => {
    if ((0, import_guards.isAiModelType)(val)) {
      return val;
    }
    ctx.addIssue({
      code: import_zod.default.ZodIssueCode.custom,
      message: `Invalid AI model type: ${val}`,
      path: ctx.path
    });
    return import_zod.default.NEVER;
  }, import_zod.default.enum(import_unions.AiModelTypeValues)).default(defaultValue),
  /**
   * Processor for integer values.
   * Ensures the value is a valid integer and provides a default value of 120 if not specified.
   *
   * @returns {ZodType<number, ZodTypeDef, unknown>} A Zod schema for integers.
   */
  integer: () => import_zod.default.preprocess((val) => {
    if (typeof val === "string") {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return val;
  }, import_zod.default.number().int()),
  /**
   * Processor for boolean values.
   * Ensures the value is a valid boolean and provides a default value of false if not specified.
   *
   * @returns {ZodBoolean} A Zod boolean schema.
   */
  boolean: () => import_zod.default.boolean().default(false),
  /**
   * Processor for truthy boolean values.
   * Ensures the value is a valid boolean and provides a default value if not specified.
   *
   * @returns {ZodBoolean} A Zod boolean schema.
   */
  truthy: (defaultValue = false) => import_zod.default.preprocess(
    (val) => {
      return typeof val === void 0 || val === null || typeof val === "string" && val.trim() === "" ? !!defaultValue : (0, import_utility_methods.isTruthy)(val);
    },
    import_zod.default.boolean(),
    import_zod.default.boolean()
  ),
  /**
   * Processor for array values.
   * Ensures the value is a valid array and provides a default value of an empty array if not specified.
   *
   * @returns {ZodArray} A Zod array schema.
   */
  array: () => import_zod.default.array(import_zod.default.unknown()).default([]),
  /**
   * Processor for object values.
   * Ensures the value is a valid object and provides a default value of an empty object if not specified.
   *
   * @returns {ZodObject} A Zod object schema.
   */
  object: () => import_zod.default.object({}).default({}),
  /**
   * Trimmed nullable string processor
   * @returns
   */
  nullableString: () => import_zod.default.string().nullable().transform((val) => val ? val.trim() : null)
};
var getMappedSource = (source) => {
  if (typeof process !== "object" || !process || typeof process.env !== "object" || !process.env) {
    return source;
  }
  const getRawValue = (key) => {
    const envValue = process.env[key];
    if (typeof envValue === "string" && envValue.trim() !== "") {
      return envValue;
    }
    return source[key];
  };
  return Object.keys(source).reduce(
    (acc, key) => {
      acc[key] = getRawValue(key);
      return acc;
    },
    {}
  );
};

// src/_client.ts
var import_zod2 = require("zod");
var import_client = require("@repo/app/lib/ai/client");
var clientRawInstance = {
  NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING: process.env.NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING,
  /**
   * The cache timeout for client-side data grids.
   * @type {number | undefined}
   */
  NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT: process.env.NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT ?? 5 * 60 * 1e3,
  /**
   * The default AI model
   */
  NEXT_PUBLIC_DEFAULT_AI_MODEL: process.env.NEXT_PUBLIC_DEFAULT_AI_MODEL,
  /**
   * The hostname for the public-facing application.
   * @type {string | undefined}
   */
  NEXT_PUBLIC_HOSTNAME: process.env.NEXT_PUBLIC_HOSTNAME,
  /**
   * The log level for client-side logging.
   * @type {string | undefined}
   */
  NEXT_PUBLIC_LOG_LEVEL_CLIENT: process.env.NEXT_PUBLIC_LOG_LEVEL_CLIENT ?? "silly",
  /**
   * Flagsmith API URL for feature flag management and retrieval.
   */
  NEXT_PUBLIC_FLAGSMITH_API_URL: process.env.NEXT_PUBLIC_FLAGSMITH_API_URL,
  /**
   * Flagsmith environment ID for scoping feature flags.
   */
  NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID: process.env.NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID,
  /**
   * The license key for MUI X Pro components.
   */
  NEXT_PUBLIC_MUI_LICENSE: process.env.NEXT_PUBLIC_MUI_LICENSE
};
var clientEnvSchema = import_zod2.z.object({
  NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING: import_zod2.z.string().optional(),
  NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT: ZodProcessors.integer().default(
    5 * 60 * 1e3
  ),
  NEXT_PUBLIC_DEFAULT_AI_MODEL: import_zod2.z.string().transform((val) => {
    return (0, import_client.isAiLanguageModelType)(val) ? val : "hifi";
  }).default("hifi"),
  NEXT_PUBLIC_FLAGSMITH_API_URL: import_zod2.z.string().min(1),
  NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID: import_zod2.z.string().min(1),
  NEXT_PUBLIC_HOSTNAME: ZodProcessors.url().default("http://localhost:3000"),
  NEXT_PUBLIC_LOG_LEVEL_CLIENT: ZodProcessors.logLevel().default("silly"),
  NEXT_PUBLIC_MUI_LICENSE: import_zod2.z.string().default("")
});
var clientEnvFactory = () => clientEnvSchema.parse(getMappedSource(clientRawInstance));

// src/_server.ts
var buildRawInstance = () => {
  const raw = {
    ...clientRawInstance,
    AUTH_SECRET: process.env.AUTH_SECRET,
    /** Server-side logging level - controls verbosity of server logs. Example: 'debug', 'info', 'warn', 'error' */
    LOG_LEVEL_SERVER: process.env.LOG_LEVEL_SERVER ?? "warn",
    /** Primary database connection URL for pooled connections. Example: 'postgresql://user:pass@host:5432/dbname' */
    DATABASE_URL: process.env.DATABASE_URL,
    /** Database connection URL for direct/unpooled connections. Example: 'postgresql://user:pass@host:5432/dbname?pgbouncer=true' */
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
    /** Azure OpenAI service endpoint URL. Example: 'https://myopenai.openai.azure.com/' */
    AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
    /** Azure OpenAI API key for authentication. Example: 'abc123def456...' */
    AZURE_API_KEY: process.env.AZURE_API_KEY,
    /** Azure AI Search service endpoint URL. Example: 'https://mysearch.search.windows.net' */
    AZURE_AISEARCH_ENDPOINT: process.env.AZURE_AISEARCH_ENDPOINT,
    /** Azure AI Search service API key. Example: 'xyz789abc456...' */
    AZURE_AISEARCH_KEY: process.env.AZURE_AISEARCH_KEY,
    /** Azure AI Search index name for document storage. Example: 'documents-prod' */
    AZURE_AISEARCH_DOCUMENTS_INDEX_NAME: process.env.AZURE_AISEARCH_DOCUMENTS_INDEX_NAME,
    /** Azure OpenAI deployment name for chat models. Example: 'gpt-4-turbo' */
    AZURE_OPENAI_DEPLOYMENT_CHAT: process.env.AZURE_OPENAI_DEPLOYMENT_CHAT,
    /** Azure OpenAI deployment name for embedding models. Example: 'text-embedding-ada-002' */
    AZURE_OPENAI_DEPLOYMENT_EMBEDDING: process.env.AZURE_OPENAI_DEPLOYMENT_EMBEDDING,
    /** Azure OpenAI endpoint URL for embedding services. Example: 'https://myembeddings.openai.azure.com/' */
    AZURE_OPENAI_ENDPOINT_EMBEDDING: process.env.AZURE_OPENAI_ENDPOINT,
    /** Azure OpenAI API key for embedding services. Example: 'embed123key456...' */
    AZURE_OPENAI_KEY_EMBEDDING: process.env.AZURE_OPENAI_KEY_EMBEDDING,
    /** Azure OpenAI deployment name for completion models. Example: 'gpt-35-turbo' */
    AZURE_OPENAI_DEPLOYMENT_COMPLETIONS: process.env.AZURE_OPENAI_DEPLOYMENT_COMPLETIONS,
    /** Azure OpenAI endpoint URL for completion services. Example: 'https://mycompletions.openai.azure.com/' */
    AZURE_OPENAI_ENDPOINT_COMPLETIONS: process.env.AZURE_OPENAI_ENDPOINT_COMPLETIONS,
    /** Azure OpenAI API key for completion services. Example: 'comp789key012...' */
    AZURE_OPENAI_KEY_COMPLETIONS: process.env.AZURE_OPENAI_KEY_COMPLETIONS,
    /** Azure AI Search index name for policy document storage. Example: 'policies-prod' */
    AZURE_AISEARCH_POLICY_INDEX_NAME: process.env.AZURE_AISEARCH_POLICY_INDEX_NAME,
    /** Vector dimension size for small embeddings in Azure AI Search. Example: '1536' */
    AZURE_AISEARCH_VECTOR_SIZE_SMALL: process.env.AZURE_AISEARCH_VECTOR_SIZE_SMALL,
    /** Vector dimension size for large embeddings in Azure AI Search. Example: '3072' */
    AZURE_AISEARCH_VECTOR_SIZE_LARGE: process.env.AZURE_AISEARCH_VECTOR_SIZE_LARGE,
    /** Token overlap count when splitting documents for indexing. Example: '20' */
    AZURE_AISEARCH_DOCUMENT_SPLITTER_OVERLAP: process.env.AZURE_AISEARCH_DOCUMENT_SPLITTER_OVERLAP,
    /** Maximum tokens per document chunk during splitting. Example: '512' */
    AZURE_AISEARCH_DOCUMENT_SPLITTER_MAX_TOKENS: process.env.AZURE_AISEARCH_DOCUMENT_SPLITTER_MAX_TOKENS,
    /** Google OAuth 2.0 client ID for authentication. Example: '123456789-abcdef.apps.googleusercontent.com' */
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    /** Google OAuth 2.0 client secret for authentication. Example: 'GOCSPX-1234567890abcdef...' */
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    /** Google API key for service access. Example: 'AIzaSyD1234567890abcdef...' */
    AUTH_GOOGLE_APIKEY: process.env.AUTH_GOOGLE_APIKEY,
    /** Azure Monitor Application Insights connection string. Example: 'InstrumentationKey=12345678-1234-1234-1234-123456789012' */
    NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING: process.env.NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING,
    /** Azure Storage account connection string. Example: 'DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=...' */
    AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING,
    /** Azure Storage account access key. Example: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' */
    AZURE_STORAGE_ACCOUNT_KEY: process.env.AZURE_STORAGE_ACCOUNT_KEY,
    /** Azure Storage account name. Example: 'mystorageaccount' */
    AZURE_STORAGE_ACCOUNT_NAME: process.env.AZURE_STORAGE_ACCOUNT_NAME,
    /*** Flagsmith server-side SDK key, supporting update and privledged server-side reads */
    FLAGSMITH_SDK_KEY: process.env.FLAGSMITH_SDK_KEY,
    /** Google Chrome DevTools workspace ID for app-specific integration. Example: 'a7c3f8e2-4b9d-4f1a-8c6e-5d2a3b7e9f4c' */
    GOOGLE_CHROME_DEVTOOLS_WORKSPACE_ID: process.env.GOOGLE_CHROME_DEVTOOLS_WORKSPACE_ID,
    /** Google Generative AI API key for Gemini models. Example: 'AIzaSyA1234567890abcdef...' */
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    /** Google Generative AI service base URL. Example: 'https://generativelanguage.googleapis.com/v1beta' */
    GOOGLE_GENERATIVE_AI_BASE_URL: process.env.GOOGLE_GENERATIVE_AI_BASE_URL,
    /** Google Generative AI high-fidelity model name. Example: 'gemini-2.0-flash-exp' */
    GOOGLE_GENERATIVE_HIFI: process.env.GOOGLE_GENERATIVE_HIFI,
    /** Google Generative AI low-fidelity/fast model name. Example: 'gemini-2.0-flash' */
    GOOGLE_GENERATIVE_LOFI: process.env.GOOGLE_GENERATIVE_LOFI,
    /** Google Generative AI embedding model name. Example: 'text-embedding-004' */
    GOOGLE_GENERATIVE_EMBEDDING: process.env.GOOGLE_GENERATIVE_EMBEDDING,
    /** Keycloak OAuth client ID for authentication. Example: 'web-app-client' */
    AUTH_KEYCLOAK_CLIENT_ID: process.env.AUTH_KEYCLOAK_CLIENT_ID,
    /** Keycloak OAuth client secret for authentication. Example: 'abc123-def456-ghi789' */
    AUTH_KEYCLOAK_CLIENT_SECRET: process.env.AUTH_KEYCLOAK_CLIENT_SECRET,
    /** Keycloak audience for impersonation tokens. Example: 'admin-cli' */
    AUTH_KEYCLOAK_IMPERSONATION_AUDIENCE: process.env.AUTH_KEYCLOAK_IMPERSONATION_AUDIENCE,
    /** Keycloak issuer URL for token validation. Example: 'https://auth.example.com/realms/myrealm' */
    AUTH_KEYCLOAK_ISSUER: process.env.AUTH_KEYCLOAK_ISSUER,
    /** Keycloak redirect URI for authentication callbacks. Example: 'https://app.example.com/auth/callback' */
    AUTH_KEYCLOAK_REDIRECT_URI: process.env.AUTH_KEYCLOAK_REDIRECT_URI,
    /** Keycloak impersonator username for user impersonation tokens (optional). Example: admin */
    AUTH_KEYCLOAK_IMPERSONATOR_USERNAME: process.env.AUTH_KEYCLOAK_IMPERSONATOR_USERNAME,
    /** Keycloak impersonator password for user impersonation tokens (optional). Example: admin */
    AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD: process.env.AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD,
    /** Keycloak impersonator offline token for user impersonation tokens (optional). Example: admin */
    AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN: process.env.AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN,
    /** Keycloak OAuth scope for authentication. Example: 'openid profile email roles mcp-tool' */
    AUTH_KEYCLOAK_SCOPE: process.env.AUTH_KEYCLOAK_SCOPE,
    /** Name of the Keycloak resource controlling chat access; used for resolution if resource ID is not provided.  Example: 'mcp-tool' */
    AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_NAME: process.env.AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_NAME,
    /** ID of the Keycloak resource controlling chat access; example 'cd6fd773-2f10-4b32-aba9-9fd491ba9576'. */
    AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_ID: process.env.AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_ID,
    /** Redis connection URL for caching and session storage. Example: 'redis://localhost:6379' */
    REDIS_URL: process.env.REDIS_URL,
    /** Redis password for authentication. Example: 'redis-secret-password' */
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    /** User ID to bypass authentication in local development. Example: 'dev-user-123' */
    LOCAL_DEV_AUTH_BYPASS_USER_ID: process.env.LOCAL_DEV_AUTH_BYPASS_USER_ID,
    /** Mem0 API service host URL. Example: 'https://api.mem0.ai' */
    MEM0_API_HOST: process.env.MEM0_API_HOST,
    /** Base path appended to Mem0 API requests. Example: 'api/v1' */
    MEM0_API_BASE_PATH: process.env.MEM0_API_BASE_PATH ?? "api/v1",
    /** Mem0 UI dashboard host URL. Example: 'https://app.mem0.ai' */
    MEM0_UI_HOST: process.env.MEM0_UI_HOST,
    /** Mem0 service username for authentication. Example: 'user@example.com' */
    MEM0_USERNAME: process.env.MEM0_USERNAME,
    /** Mem0 organization ID for scoping. Example: 'org_1234567890abcdef' */
    MEM0_ORG_ID: process.env.MEM0_ORG_ID,
    /** Mem0 project ID for scoping. Example: 'proj_abcdef1234567890' */
    MEM0_PROJECT_ID: process.env.MEM0_PROJECT_ID,
    /** Mem0 API key for service authentication. Example: 'mem0_sk_1234567890abcdef...' */
    MEM0_API_KEY: process.env.MEM0_API_KEY,
    /** Node.js environment mode. Example: 'development', 'production', 'test' */
    NODE_ENV: process.env.NODE_ENV,
    /** OpenAI API key for direct OpenAI service access. Example: 'sk-1234567890abcdef...' */
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    /** OpenAI high-fidelity model name for complex tasks. Example: 'gpt-4-turbo' */
    OPENAI_HIFI: process.env.OPENAI_HIFI,
    /** OpenAI low-fidelity/fast model name for simple tasks. Example: 'gpt-3.5-turbo' */
    OPENAI_LOFI: process.env.OPENAI_LOFI,
    /** OpenAI embedding model name for vector generation. Example: 'text-embedding-3-large' */
    OPENAI_EMBEDDING: process.env.OPENAI_EMBEDDING,
    /** Maximum token threshold for AI batch processing. Example: '50000' */
    TOKEN_BATCH_THRESHOLD: process.env.TOKEN_BATCH_THRESHOLD
  };
  if (!raw.AUTH_KEYCLOAK_REDIRECT_URI) {
    raw.AUTH_KEYCLOAK_REDIRECT_URI = new URL(
      `/api/auth/callback/keycloak`,
      process.env.NEXT_PUBLIC_HOSTNAME
    ).toString();
  }
  return getMappedSource(raw);
};
var serverEnvSchema = import_zod3.z.object({
  AUTH_SECRET: import_zod3.z.string().min(1).describe("auth.js secret used when signing tokens"),
  LOG_LEVEL_SERVER: ZodProcessors.logLevel().describe(
    "Server-side logging level for application logs. Example: debug, info, warn, error"
  ),
  DATABASE_URL: ZodProcessors.url().describe(
    "Primary PostgreSQL database connection URL with connection pooling. Example: postgresql://user:pass@host:5432/dbname"
  ),
  DATABASE_URL_UNPOOLED: ZodProcessors.url().optional().describe(
    "Direct PostgreSQL database connection URL without pooling (optional). Example: postgresql://user:pass@host:5432/dbname?pgbouncer=true"
  ),
  AZURE_OPENAI_ENDPOINT: ZodProcessors.url().describe(
    "Azure OpenAI service endpoint URL for AI model access. Example: https://myopenai.openai.azure.com/"
  ),
  AZURE_API_KEY: import_zod3.z.string().min(1).describe(
    "Azure OpenAI API key for service authentication. Example: abc123def456..."
  ),
  AZURE_AISEARCH_ENDPOINT: ZodProcessors.url().describe(
    "Azure AI Search service endpoint URL for document indexing. Example: https://mysearch.search.windows.net"
  ),
  AZURE_AISEARCH_KEY: import_zod3.z.string().min(1).describe(
    "Azure AI Search API key for service authentication. Example: xyz789abc456..."
  ),
  AZURE_AISEARCH_DOCUMENTS_INDEX_NAME: import_zod3.z.string().min(1).describe(
    "Azure AI Search index name for storing document vectors and metadata. Example: documents-prod"
  ),
  AZURE_OPENAI_DEPLOYMENT_CHAT: import_zod3.z.string().optional().default("gpt-4.1").describe(
    "Azure OpenAI deployment name for chat completions. Default: gpt-4.1. Example: gpt-4-turbo"
  ),
  AZURE_OPENAI_DEPLOYMENT_EMBEDDING: import_zod3.z.string().optional().default("text-embedding-3-large").describe(
    "Azure OpenAI deployment name for text embeddings. Default: text-embedding-3-large. Example: text-embedding-ada-002"
  ),
  AZURE_OPENAI_ENDPOINT_EMBEDDING: import_zod3.z.string().default(process.env.AZURE_OPENAI_ENDPOINT ?? "").describe(
    "Azure OpenAI endpoint URL for embedding services (fallback to main endpoint). Example: https://myembeddings.openai.azure.com/"
  ),
  AZURE_OPENAI_KEY_EMBEDDING: import_zod3.z.string().default(process.env.AZURE_OPENAI_KEY ?? "").describe(
    "Azure OpenAI API key for embedding services (fallback to main key). Example: embed123key456..."
  ),
  AZURE_OPENAI_DEPLOYMENT_HIFI: import_zod3.z.string().optional().default("gpt-4.1").describe(
    "Azure OpenAI deployment name for high-fidelity chat models. Default: gpt-4.1. Example: gpt-4-turbo"
  ),
  AZURE_OPENAI_DEPLOYMENT_LOFI: import_zod3.z.string().optional().default("gpt-4o-mini").describe(
    "Azure OpenAI deployment name for low-fidelity/fast chat models. Default: gpt-4o-mini. Example: gpt-35-turbo"
  ),
  AZURE_OPENAI_DEPLOYMENT_COMPLETIONS: import_zod3.z.string().optional().default("gpt-4o-mini").describe(
    "Azure OpenAI deployment name for text completions. Default: gpt-4o-mini. Example: gpt-35-turbo"
  ),
  AZURE_OPENAI_ENDPOINT_COMPLETIONS: import_zod3.z.string().default(process.env.AZURE_OPENAI_ENDPOINT ?? "").describe(
    "Azure OpenAI endpoint URL for completion services (fallback to main endpoint). Example: https://mycompletions.openai.azure.com/"
  ),
  AZURE_OPENAI_KEY_COMPLETIONS: import_zod3.z.string().default(process.env.AZURE_OPENAI_KEY ?? "").describe(
    "Azure OpenAI API key for completion services (fallback to main key). Example: comp789key012..."
  ),
  AZURE_AISEARCH_POLICY_INDEX_NAME: import_zod3.z.string().min(1).describe(
    "Azure AI Search index name for storing policy document vectors and metadata. Example: policies-prod"
  ),
  AZURE_AISEARCH_VECTOR_SIZE_SMALL: import_zod3.z.coerce.number().default(1536).describe(
    "Vector dimension size for small embeddings in Azure AI Search. Default: 1536. Example: 1536"
  ),
  AZURE_AISEARCH_VECTOR_SIZE_LARGE: import_zod3.z.coerce.number().default(3072).describe(
    "Vector dimension size for large embeddings in Azure AI Search. Default: 3072. Example: 3072"
  ),
  AZURE_AISEARCH_DOCUMENT_SPLITTER_OVERLAP: import_zod3.z.coerce.number().default(15).describe(
    "Token overlap count when splitting documents for search indexing. Default: 15. Example: 20"
  ),
  AZURE_AISEARCH_DOCUMENT_SPLITTER_MAX_TOKENS: import_zod3.z.coerce.number().default(512).describe(
    "Maximum tokens per document chunk during splitting for indexing. Default: 512. Example: 512"
  ),
  TOKEN_BATCH_THRESHOLD: import_zod3.z.number().default(5e4).describe(
    "Maximum cumulative token count (approx) per AI preprocessing batch when grouping case file documents with shared goals. Documents are accumulated until the next document would exceed this threshold, then a batch processing call is executed. Tuned to balance prompt size vs. parallelism. Override via env TOKEN_BATCH_THRESHOLD; defaults to 50,000 tokens. Example: 75000 for larger batches, 25000 for smaller batches"
  ),
  AUTH_GOOGLE_ID: import_zod3.z.string().describe(
    "Google OAuth 2.0 client ID for user authentication. Example: 123456789-abcdef.apps.googleusercontent.com"
  ),
  AUTH_GOOGLE_SECRET: import_zod3.z.string().describe(
    "Google OAuth 2.0 client secret for authentication flow. Example: GOCSPX-1234567890abcdef..."
  ),
  AUTH_GOOGLE_APIKEY: import_zod3.z.string().describe(
    "Google API key for accessing Google services (Gmail, Drive, etc.). Example: AIzaSyD1234567890abcdef..."
  ),
  AZURE_STORAGE_CONNECTION_STRING: import_zod3.z.string().min(1).describe(
    "Azure Storage account connection string for blob storage. Example: DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=..."
  ),
  AZURE_STORAGE_ACCOUNT_KEY: import_zod3.z.string().min(1).describe(
    "Azure Storage account access key for authentication. Example: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  ),
  AZURE_STORAGE_ACCOUNT_NAME: import_zod3.z.string().min(1).describe(
    "Azure Storage account name for blob and file operations. Example: mystorageaccount"
  ),
  FLAGSMITH_SDK_KEY: import_zod3.z.string().min(1).describe(
    "Flagsmith server-side SDK key for feature flag management and privileged reads."
  ),
  GOOGLE_CHROME_DEVTOOLS_WORKSPACE_ID: import_zod3.z.string().default("a7c3f8e2-4b9d-4f1a-8c6e-5d2a3b7e9f4c").describe(
    "Google Chrome DevTools workspace ID for app-specific integration. See {@link https://stackoverflow.com/questions/79629915/well-known-appspecific-com-chrome-devtools-json-request/79631068#79631068}"
  ),
  GOOGLE_GENERATIVE_AI_API_KEY: import_zod3.z.string().min(1).optional().describe(
    "Google Generative AI API key for Gemini model access (optional). Example: AIzaSyA1234567890abcdef..."
  ),
  GOOGLE_GENERATIVE_AI_BASE_URL: ZodProcessors.url().default("https://generativelanguage.googleapis.com/v1beta").describe(
    "Google Generative AI service base URL. Default: https://generativelanguage.googleapis.com/v1beta. Example: https://generativelanguage.googleapis.com/v1beta"
  ),
  GOOGLE_GENERATIVE_HIFI: import_zod3.z.string().optional().default("gemini-2.5-pro").describe(
    "Google Generative AI high-fidelity model name. Default: gemini-2.5-pro. Example: gemini-2.0-flash-exp"
  ),
  GOOGLE_GENERATIVE_LOFI: import_zod3.z.string().optional().default("gemini-2.5-flash").describe(
    "Google Generative AI low-fidelity/fast model name. Default: gemini-2.5-flash. Example: gemini-2.0-flash"
  ),
  GOOGLE_GENERATIVE_EMBEDDING: import_zod3.z.string().optional().default("google-embedding").describe(
    "Google Generative AI embedding model name. Default: google-embedding. Example: text-embedding-004"
  ),
  AUTH_KEYCLOAK_CLIENT_ID: import_zod3.z.string().min(1).optional().describe(
    "Keycloak OAuth client ID for authentication (optional). Example: web-app-client"
  ),
  AUTH_KEYCLOAK_CLIENT_SECRET: import_zod3.z.string().min(1).optional().describe(
    "Keycloak OAuth client secret for authentication (optional). Example: abc123-def456-ghi789"
  ),
  AUTH_KEYCLOAK_ISSUER: ZodProcessors.url().optional().describe(
    "Keycloak issuer URL for token validation. Default: development instance (optional). Example: https://auth.example.com/realms/myrealm"
  ),
  AUTH_KEYCLOAK_SCOPE: import_zod3.z.string().optional().default("openid").describe(
    "Keycloak OAuth scope for authentication (optional). Example: openid mcp_tool"
  ),
  AUTH_KEYCLOAK_IMPERSONATION_AUDIENCE: import_zod3.z.string().optional().describe(
    "Keycloak audience for user impersonation tokens (optional). Example: admin-cli"
  ),
  AUTH_KEYCLOAK_REDIRECT_URI: import_zod3.z.string().describe(
    "Keycloak redirect URI for user impersonation tokens (optional). Example: https://auth.example.com/realms/myrealm/protocol/openid-connect/auth"
  ),
  AUTH_KEYCLOAK_IMPERSONATOR_USERNAME: import_zod3.z.string().optional().describe(
    "Keycloak impersonator username for user impersonation tokens (optional). Example: admin"
  ),
  AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD: import_zod3.z.string().optional().describe(
    "Keycloak impersonator password for user impersonation tokens (optional). Example: admin"
  ),
  AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN: import_zod3.z.string().optional().describe(
    "Keycloak impersonator offline token for user impersonation tokens (optional). Example: admin"
  ),
  AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_NAME: import_zod3.z.string().describe(
    "Keycloak resource name for MCP tool access; used for failover resolution if resource ID is not provided or invalid. Example: mcp-tool"
  ).default("mcp-tool"),
  AUTH_KEYCLOAK_MCP_TOOL_RESOURCE_ID: import_zod3.z.string().describe(
    "Keycloak resource ID for MCP tool access evaluation. Example: cd6fd773-2f10-4b32-aba9-9fd491ba9576"
  ).default("cd6fd773-2f10-4b32-aba9-9fd491ba9576"),
  REDIS_URL: import_zod3.z.string().min(1).describe(
    "Redis server connection URL for caching and session storage. Example: redis://localhost:6379"
  ),
  REDIS_PASSWORD: import_zod3.z.string().min(1).describe(
    "Redis server authentication password. Example: redis-secret-password"
  ),
  LOCAL_DEV_AUTH_BYPASS_USER_ID: import_zod3.z.string().optional().describe(
    "User ID for bypassing authentication in local development (optional). Example: dev-user-123"
  ),
  MEM0_API_HOST: ZodProcessors.url().describe(
    "Mem0 API service host URL for memory operations. Example: https://api.mem0.ai"
  ),
  MEM0_API_BASE_PATH: import_zod3.z.string().default("api/v1").describe(
    "Base path segment appended to Mem0 API requests (without leading slash). Example: api/v1"
  ),
  MEM0_UI_HOST: ZodProcessors.url().describe(
    "Mem0 UI dashboard host URL for memory management. Example: https://app.mem0.ai"
  ),
  MEM0_USERNAME: import_zod3.z.string().min(1).describe(
    "Mem0 service username for authentication. Example: user@example.com"
  ),
  MEM0_ORG_ID: ZodProcessors.nullableString().default(null).describe(
    "Mem0 organization ID for account scoping. Default: null. Example: org_1234567890abcdef"
  ),
  MEM0_PROJECT_ID: ZodProcessors.nullableString().default(null).describe(
    "Mem0 project ID for resource scoping. Default: null. Example: proj_abcdef1234567890"
  ),
  MEM0_API_KEY: import_zod3.z.string().optional().describe(
    "Mem0 API key for service authentication. Example: mem0_sk_1234567890abcdef..."
  ),
  NODE_ENV: import_zod3.z.string().describe(
    "Node.js runtime environment mode. Example: development, production, test"
  ),
  OPENAI_API_KEY: import_zod3.z.string().optional().describe(
    "OpenAI API key for direct OpenAI service access (optional - Azure OpenAI preferred). Example: sk-1234567890abcdef..."
  ),
  OPENAI_HIFI: import_zod3.z.string().optional().default("gpt-5").describe(
    "OpenAI high-fidelity model name for complex reasoning tasks. Default: gpt-5. Example: gpt-4-turbo"
  ),
  OPENAI_LOFI: import_zod3.z.string().optional().default("gpt-5-mini").describe(
    "OpenAI low-fidelity/fast model name for simple tasks. Default: gpt-5-mini. Example: gpt-3.5-turbo"
  ),
  OPENAI_EMBEDDING: import_zod3.z.string().optional().default("text-embedding-3-large").describe(
    "OpenAI embedding model name for vector generation. Default: text-embedding-3-large. Example: text-embedding-3-large"
  )
}).extend(clientEnvSchema.shape);
var serverEnvFactory = () => {
  try {
    return isRunningOnClient() ? {} : serverEnvSchema.parse({ ...buildRawInstance(), ...process.env });
  } catch (e) {
    if ((process.env.AUTH_SECRET ?? "").length === 0) {
      return clientEnvFactory();
    }
    throw e;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  serverEnvFactory
});
