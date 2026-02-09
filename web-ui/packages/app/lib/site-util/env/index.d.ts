/**
 * @module site-util/env
 * @description Central environment variable management with type-safe access
 *
 * This module provides a unified interface for accessing environment variables
 * with automatic runtime detection, comprehensive validation via Zod schemas,
 * and full TypeScript type safety. It handles both server-only secrets and
 * public client-side configuration (NEXT_PUBLIC_*).
 *
 * **Key Features**:
 * - Runtime-aware: Automatically loads server or client config based on execution context
 * - Type-safe: Full IntelliSense and compile-time checking for all env variables
 * - Validated: All variables are validated through Zod schemas with sensible defaults
 * - Cached: Uses singleton pattern to avoid repeated validation/parsing
 * - Overloaded: Multiple function signatures for maximum flexibility
 *
 * **Architecture**:
 * - `_common.ts`: Runtime detection utilities and Zod processors
 * - `_client.ts`: Client-side (NEXT_PUBLIC_*) variables and validation
 * - `_server.ts`: Server-side secrets, credentials, and configuration
 * - `index.ts`: Main entry point with cached env() accessor function
 *
 * **Security**:
 * - Server variables are NEVER exposed to client bundles
 * - Client variables are safe to inline during build
 * - Validation prevents undefined/invalid values from reaching application code
 *
 * @example
 * ```typescript
 * import { env, isRunningOnServer } from '@/lib/site-util/env';
 *
 * // Get specific variable (type-safe)
 * const apiUrl = env('NEXT_PUBLIC_HOSTNAME'); // string
 * const dbUrl = env('DATABASE_URL'); // string (server-only)
 *
 * // Get all variables
 * const config = env();
 * console.log(config.NEXT_PUBLIC_LOG_LEVEL_CLIENT);
 *
 * // Conditional access
 * if (isRunningOnServer()) {
 *   const secretKey = env('AUTH_SECRET');
 *   // ... server-only operations
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Using with async functions
 * export async function getServerSideProps() {
 *   const env = (await import('@/lib/site-util/env')).env;
 *   const dbConnection = env('DATABASE_URL');
 *   // ... fetch data
 * }
 * ```
 *
 * @see {@link _client.ts} for client environment variable definitions
 * @see {@link _server.ts} for server environment variable definitions
 * @see {@link _common.ts} for validation utilities and runtime detection
 */

import type { ServerEnvType } from './_server';
import type { ClientEnvType } from './_client';
import type { RuntimeConfig } from './_common';

/**
 * Type representing validated server-side environment variables.
 *
 * Includes all server-only configuration such as database URLs, API keys,
 * authentication secrets, and service credentials. These values are only
 * available in server-side code and API routes.
 *
 * @see {@link _server.d.ts} for complete field documentation
 *
 * @example
 * ```typescript
 * import { ServerEnvType } from '@/lib/site-util/env';
 *
 * function initDatabase(env: ServerEnvType) {
 *   return createConnection({
 *     url: env.DATABASE_URL,
 *     poolSize: 10
 *   });
 * }
 * ```
 */
export type { ServerEnvType };

/**
 * Type representing validated client-side environment variables.
 *
 * Includes only NEXT_PUBLIC_* variables that are safe to expose to the
 * browser. These values are inlined into the client bundle at build time.
 *
 * @see {@link _client.d.ts} for complete field documentation
 *
 * @example
 * ```typescript
 * import { ClientEnvType } from '@/lib/site-util/env';
 *
 * function ApiClient(config: ClientEnvType) {
 *   this.baseUrl = config.NEXT_PUBLIC_HOSTNAME;
 *   this.logLevel = config.NEXT_PUBLIC_LOG_LEVEL_CLIENT;
 * }
 * ```
 */
export type { ClientEnvType };

/**
 * Returns the current runtime environment.
 *
 * Determines where code is executing: browser (client), Node.js server,
 * Edge runtime, or during static build process. Result is cached at
 * module initialization for performance.
 *
 * @returns {RuntimeConfig} One of: 'nodejs', 'edge', 'client', 'static', 'server'
 *
 * @example
 * ```typescript
 * import { runtime } from '@/lib/site-util/env';
 *
 * const currentRuntime = runtime();
 * console.log(`Running in: ${currentRuntime}`);
 *
 * switch (currentRuntime) {
 *   case 'client':
 *     // Browser-specific code
 *     break;
 *   case 'nodejs':
 *     // Node.js server code
 *     break;
 *   case 'edge':
 *     // Edge runtime compatible code
 *     break;
 * }
 * ```
 */
export declare function runtime(): RuntimeConfig;

/**
 * Checks if code is currently executing on the client (browser).
 *
 * Uses runtime detection and AUTH_SECRET presence to determine context.
 * Useful for conditionally running client-only code or accessing browser APIs.
 *
 * @returns {boolean} true if running in browser, false otherwise
 *
 * @example
 * ```typescript
 * import { isRunningOnClient, env } from '@/lib/site-util/env';
 *
 * if (isRunningOnClient()) {
 *   // Safe to access window, document, localStorage
 *   const userAgent = window.navigator.userAgent;
 *   const apiUrl = env('NEXT_PUBLIC_HOSTNAME');
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Component that works in both contexts
 * function Logo() {
 *   const isBrowser = isRunningOnClient();
 *   return <img src={isBrowser ? '/logo.webp' : '/logo.png'} />;
 * }
 * ```
 */
export declare function isRunningOnClient(): boolean;

/**
 * Checks if code is currently executing on the server (Node.js).
 *
 * Uses runtime detection and AUTH_SECRET presence to determine context.
 * Useful for conditionally running server-only code or accessing Node.js APIs.
 *
 * @returns {boolean} true if running on server, false otherwise
 *
 * @example
 * ```typescript
 * import { isRunningOnServer, env } from '@/lib/site-util/env';
 *
 * if (isRunningOnServer()) {
 *   // Safe to access server-only environment variables
 *   const dbUrl = env('DATABASE_URL');
 *   const secretKey = env('AUTH_SECRET');
 *
 *   // Safe to use Node.js APIs
 *   const fs = require('fs');
 * }
 * ```
 *
 * @example
 * ```typescript
 * // API route handler
 * export async function GET(request: Request) {
 *   if (!isRunningOnServer()) {
 *     throw new Error('This endpoint must run on the server');
 *   }
 *   const apiKey = env('AZURE_API_KEY');
 *   // ... make authenticated API call
 * }
 * ```
 */
export declare function isRunningOnServer(): boolean;

/**
 * Checks if code is currently executing in an edge runtime.
 *
 * Edge runtimes (Vercel Edge, Cloudflare Workers, etc.) have limited
 * Node.js API access. Use this to conditionally run edge-compatible code.
 *
 * @returns {boolean} true if running on edge, false otherwise
 *
 * @example
 * ```typescript
 * import { isRunningOnEdge } from '@/lib/site-util/env';
 *
 * if (isRunningOnEdge()) {
 *   // Use edge-compatible APIs only
 *   // Avoid: fs, crypto (Node.js), complex npm packages
 *   const response = await fetch('https://api.example.com');
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Middleware with edge runtime
 * export const config = { runtime: 'edge' };
 *
 * export function middleware(req: Request) {
 *   if (!isRunningOnEdge()) {
 *     console.warn('Middleware expected to run on edge');
 *   }
 *   // ... edge-compatible logic
 * }
 * ```
 */
export declare function isRunningOnEdge(): boolean;

/**
 * Checks if code is running during the build/static generation process.
 *
 * Useful for conditionally executing code only at build time, such as
 * pre-computing data, generating sitemaps, or optimizing assets.
 *
 * @returns {boolean} true if running during build, false otherwise
 *
 * @example
 * ```typescript
 * import { isBuilding } from '@/lib/site-util/env';
 *
 * if (isBuilding()) {
 *   // Pre-compute expensive data at build time
 *   const staticData = await generateStaticData();
 *   writeFileSync('public/data.json', JSON.stringify(staticData));
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Conditionally enable expensive logging
 * export function logger() {
 *   if (!isBuilding()) {
 *     console.log('Runtime log');
 *   }
 * }
 * ```
 */
export declare function isBuilding(): boolean;

/**
 * Union type of server and client environment variables.
 *
 * Represents environment configuration that could be from either context.
 * Useful for functions that may execute in server or client contexts,
 * though accessing server-only variables in the client will fail at runtime.
 *
 * @remarks
 * When using this type, ensure your code checks the runtime context before
 * accessing server-only variables to avoid runtime errors.
 *
 * @example
 * ```typescript
 * import { ServerOrClientEnvType, isRunningOnServer } from '@/lib/site-util/env';
 *
 * function logEnvironment(config: ServerOrClientEnvType) {
 *   console.log('Hostname:', config.NEXT_PUBLIC_HOSTNAME);
 *
 *   if (isRunningOnServer()) {
 *     // Type assertion needed for server-only variables
 *     console.log('DB:', (config as ServerEnvType).DATABASE_URL);
 *   }
 * }
 * ```
 */
export type ServerOrClientEnvType = ServerEnvType | ClientEnvType;

/**
 * String literal type of all valid server environment variable names.
 *
 * Provides autocomplete and type checking for server env variable keys.
 * Useful for building configuration objects or validation functions.
 *
 * @example
 * ```typescript
 * import { ServerEnvKey, env } from '@/lib/site-util/env';
 *
 * const requiredServerVars: ServerEnvKey[] = [
 *   'DATABASE_URL',
 *   'AUTH_SECRET',
 *   'AZURE_API_KEY'
 * ];
 *
 * function validateServerConfig(keys: ServerEnvKey[]) {
 *   return keys.every(key => {
 *     const value = env(key);
 *     return value !== undefined && value !== '';
 *   });
 * }
 * ```
 */
export type ServerEnvKey = keyof ServerEnvType;

/**
 * String literal type of all valid client environment variable names.
 *
 * Provides autocomplete and type checking for client env variable keys.
 * All keys must start with NEXT_PUBLIC_ prefix.
 *
 * @example
 * ```typescript
 * import { ClientEnvKey, env } from '@/lib/site-util/env';
 *
 * const publicConfig: Record<ClientEnvKey, string> = {
 *   NEXT_PUBLIC_HOSTNAME: env('NEXT_PUBLIC_HOSTNAME'),
 *   NEXT_PUBLIC_LOG_LEVEL_CLIENT: env('NEXT_PUBLIC_LOG_LEVEL_CLIENT'),
 *   // ... all client variables
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Type-safe config builder
 * function buildClientConfig<K extends ClientEnvKey>(keys: K[]) {
 *   return keys.reduce((acc, key) => {
 *     acc[key] = env(key);
 *     return acc;
 *   }, {} as Pick<ClientEnvType, K>);
 * }
 * ```
 */
export type ClientEnvKey = keyof ClientEnvType;

/**
 * String literal type of all valid environment variable names (server + client).
 *
 * Union of ServerEnvKey and ClientEnvKey. Useful for generic functions
 * that work with any environment variable.
 *
 * @example
 * ```typescript
 * import { ServerOrClientEnvKey } from '@/lib/site-util/env';
 *
 * function logEnvVar(key: ServerOrClientEnvKey) {
 *   try {
 *     const value = env(key);
 *     console.log(`${key}: ${value}`);
 *   } catch (error) {
 *     console.error(`Failed to access ${key}`);
 *   }
 * }
 * ```
 */
export type ServerOrClientEnvKey = keyof ServerOrClientEnvType;

/**
 * Union type representing either server or client environment configuration.
 *
 * This is effectively equivalent to ServerOrClientEnvType and represents the
 * return type of the env() function when called without arguments. TypeScript
 * cannot statically determine which environment the code will run in, so this
 * is always a union of both possibilities.
 *
 * @remarks
 * **Important**: TypeScript cannot determine runtime context at compile time.
 * Always use runtime checks like `isRunningOnServer()` or `isRunningOnClient()`
 * to safely access environment-specific variables.
 *
 * @example
 * ```typescript
 * import { EnvType, isRunningOnServer } from '@/lib/site-util/env';
 *
 * const config: EnvType = env();
 *
 * // Safe: accessing client variable (available in both environments)
 * console.log(config.NEXT_PUBLIC_HOSTNAME);
 *
 * // Unsafe: requires runtime check
 * if (isRunningOnServer()) {
 *   console.log((config as ServerEnvType).DATABASE_URL);
 * }
 * ```
 *
 * @see {@link ServerOrClientEnvType} - Identical type with clearer name
 */
export type EnvType = ServerEnvType | ClientEnvType;

/**
 * Helper function that returns strongly-typed server environment.
 *
 * This is a type guard function that asserts the code is running on the server
 * and returns a properly typed ServerEnvType. Use this when you need full
 * type narrowing for server-only code paths.
 *
 * @returns {ServerEnvType | null} Server environment if on server, null if on client
 *
 * @example
 * ```typescript
 * import { getServerEnv } from '@/lib/site-util/env';
 *
 * const serverEnv = getServerEnv();
 * if (serverEnv) {
 *   // TypeScript knows this is ServerEnvType
 *   const dbUrl = serverEnv.DATABASE_URL; // ✓ Type-safe
 *   const apiKey = serverEnv.AZURE_API_KEY; // ✓ Type-safe
 * }
 * ```
 */
export declare function getServerEnv(): ServerEnvType | null;

/**
 * Helper function that returns strongly-typed client environment.
 *
 * This is a type guard function that returns properly typed ClientEnvType.
 * Use this when you need explicit client-only environment access.
 *
 * @returns {ClientEnvType} Client environment variables
 *
 * @example
 * ```typescript
 * import { getClientEnv } from '@/lib/site-util/env';
 *
 * const clientEnv = getClientEnv();
 * // TypeScript knows this is ClientEnvType
 * const hostname = clientEnv.NEXT_PUBLIC_HOSTNAME; // ✓ Type-safe
 * const logLevel = clientEnv.NEXT_PUBLIC_LOG_LEVEL_CLIENT; // ✓ Type-safe
 * ```
 */
export declare function getClientEnv(): ClientEnvType;

/**
 * @internal
 * Clears the cached environment instance. FOR TESTING ONLY.
 * 
 * This function removes the singleton cache, allowing tests to reset the
 * environment between test cases. Should never be used in production code.
 * 
 * @example
 * ```typescript
 * import { __clearEnvCacheForTests } from '@/lib/site-util/env';
 * 
 * afterEach(() => {
 *   __clearEnvCacheForTests();
 * });
 * ```
 */
export declare function __clearEnvCacheForTests(): void;

/**
 * Main environment variable accessor function with multiple overloaded signatures.
 *
 * This is the primary interface for accessing environment variables. It provides
 * type-safe access with automatic runtime detection and validation. The function
 * uses a singleton pattern with Symbol.for('APP_ENV') to cache the configuration
 * after first access, avoiding repeated validation overhead.
 *
 * **Overload Signatures**:
 *
 * 1. **Get specific server variable**: `env<TKey extends ServerEnvKey>(key: TKey)`
 *    - Returns the typed value for the specified server env key
 *    - Full autocomplete for all server variable names
 *    - Type-safe return value matching the key's type
 *
 * 2. **Get specific client variable**: `env<TKey extends ClientEnvKey>(key: TKey)`
 *    - Returns the typed value for the specified client env key
 *    - Full autocomplete for all NEXT_PUBLIC_* variable names
 *    - Type-safe return value matching the key's type
 *
 * 3. **Get all variables**: `env()`
 *    - Returns complete environment object for current runtime
 *    - ServerEnvType on server, ClientEnvType on client
 *    - Use `getServerEnv()` or `getClientEnv()` for proper type narrowing
 *    - No key parameter required
 *
 * **Caching Behavior**:
 * - First call validates and caches environment using Symbol.for('APP_ENV')
 * - Subsequent calls return cached instance for performance
 * - Cache is global across entire application
 * - Validation only runs once per process lifecycle
 *
 * **Error Handling**:
 * - Throws ZodError if required variables are missing or invalid
 * - Throws TypeError if accessing server variables from client context
 * - All errors occur at initialization, not during access
 *
 * **Type Narrowing**:
 * - For better type inference, use `getServerEnv()` or `getClientEnv()`
 * - These helpers leverage runtime detection for proper TypeScript narrowing
 *
 * @example
 * ```typescript
 * // Get all variables with proper type narrowing
 * import { getServerEnv, getClientEnv } from '@/lib/site-util/env';
 *
 * const serverEnv = getServerEnv();
 * if (serverEnv) {
 *   // TypeScript knows: ServerEnvType
 *   console.log(serverEnv.DATABASE_URL);
 * }
 *
 * const clientEnv = getClientEnv();
 * // TypeScript knows: ClientEnvType
 * console.log(clientEnv.NEXT_PUBLIC_HOSTNAME);
 * ```
 *
 * @example
 * ```typescript
 * // Get specific variable (most common usage)
 * const hostname = env('NEXT_PUBLIC_HOSTNAME'); // Type: string
 * const dbUrl = env('DATABASE_URL'); // Type: string (server-only)
 * const logLevel = env('LOG_LEVEL_SERVER'); // Type: string (server-only)
 * ```
 *
 * @example
 * ```typescript
 * // Get all variables
 * const config = env();
 *
 * // On server: config is ServerEnvType
 * if (isRunningOnServer()) {
 *   console.log(config.DATABASE_URL);
 *   console.log(config.AUTH_SECRET);
 * }
 *
 * // On client: config is ClientEnvType
 * if (isRunningOnClient()) {
 *   console.log(config.NEXT_PUBLIC_HOSTNAME);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Using in API routes
 * export async function POST(request: Request) {
 *   const azureKey = env('AZURE_API_KEY');
 *   const endpoint = env('AZURE_OPENAI_ENDPOINT');
 *
 *   const client = new OpenAIClient(endpoint, azureKey);
 *   // ... handle request
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Using in client components
 * export function Header() {
 *   const apiUrl = env('NEXT_PUBLIC_HOSTNAME');
 *   const flagsmithUrl = env('NEXT_PUBLIC_FLAGSMITH_API_URL');
 *
 *   return <nav data-api={apiUrl}>...</nav>;
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Type-safe configuration builder
 * function createDatabaseConfig() {
 *   return {
 *     url: env('DATABASE_URL'),
 *     unpooled: env('DATABASE_URL_UNPOOLED'),
 *     ssl: process.env.NODE_ENV === 'production'
 *   };
 * }
 * ```
 *
 * @throws {z.ZodError} When environment validation fails (missing/invalid variables)
 * @throws {TypeError} When accessing server variables from client context
 *
 * @see {@link ServerEnvType} for server variable documentation
 * @see {@link ClientEnvType} for client variable documentation
 */
export declare const env: {
  <TKey extends ServerEnvKey>(key: TKey): Pick<ServerEnvType, TKey>[TKey];
  <TKey extends ClientEnvKey>(key: TKey): Pick<ClientEnvType, TKey>[TKey];
  <TKey extends ClientEnvKey | ServerEnvKey>(): TKey extends ClientEnvKey
    ? ClientEnvType
    : TKey extends ServerEnvKey
      ? ServerEnvType
      : never;
  (): ServerOrClientEnvType;
};
