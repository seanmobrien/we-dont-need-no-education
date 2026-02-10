/**
 * @module site-util/env/_common
 * @description Common utilities for environment configuration and runtime detection
 *
 * This module provides foundational utilities for determining the current runtime
 * environment and processing environment variables with Zod validation. It includes
 * type-safe preprocessors for common data types (URLs, integers, booleans, etc.)
 * and helpers for environment variable mapping across different runtime contexts.
 *
 * @example
 * ```typescript
 * import { runtime, isRunningOnServer, ZodProcessors } from './_common';
 *
 * // Check current runtime
 * if (isRunningOnServer()) {
 *   // Server-side code
 * }
 *
 * // Use Zod processors for validation
 * const schema = z.object({
 *   API_URL: ZodProcessors.url(),
 *   LOG_LEVEL: ZodProcessors.logLevel('info'),
 *   MAX_ITEMS: ZodProcessors.integer()
 * });
 * ```
 */

import type { z } from 'zod';
import type { AiModelType } from '../../ai/core/unions';

/**
 * Represents the possible runtime environments where the application code executes.
 *
 * - `'nodejs'`: Running in a Node.js server environment with full Node.js API access
 * - `'edge'`: Running in an Edge runtime (e.g., Vercel Edge, Cloudflare Workers)
 * - `'client'`: Running in a client-side browser environment
 * - `'static'`: Running during static site generation or build time
 * - `'server'`: Generic server-side environment
 */
export type RuntimeConfig = 'nodejs' | 'edge' | 'client' | 'static' | 'server';

/**
 * Returns the current runtime environment.
 *
 * This function determines where the code is executing by checking for runtime-specific
 * features and environment variables. The result is cached on module initialization.
 *
 * @returns {RuntimeConfig} The current runtime environment
 *
 * @example
 * ```typescript
 * const env = runtime();
 * switch (env) {
 *   case 'client':
 *     // Browser-specific code
 *     break;
 *   case 'nodejs':
 *     // Node.js server code
 *     break;
 *   case 'edge':
 *     // Edge runtime code
 *     break;
 * }
 * ```
 */
export declare function runtime(): RuntimeConfig;

/**
 * Checks if the code is currently running on the server.
 *
 * This check is based on the runtime environment and presence of AUTH_SECRET,
 * which is only available server-side.
 *
 * @returns {boolean} `true` if executing on server, `false` otherwise
 *
 * @example
 * ```typescript
 * if (isRunningOnServer()) {
 *   // Safe to access server-only APIs and environment variables
 *   const dbUrl = process.env.DATABASE_URL;
 * }
 * ```
 */
export declare function isRunningOnServer(): boolean;

/**
 * Checks if the code is currently running on the client (browser).
 *
 * This check excludes edge runtimes and considers absence of AUTH_SECRET
 * as a client-side indicator.
 *
 * @returns {boolean} `true` if executing on client, `false` otherwise
 *
 * @example
 * ```typescript
 * if (isRunningOnClient()) {
 *   // Safe to access browser APIs
 *   const userAgent = window.navigator.userAgent;
 * }
 * ```
 */
export declare function isRunningOnClient(): boolean;

/**
 * Checks if the code is currently running in an edge runtime.
 *
 * Edge runtimes include Vercel Edge Functions, Cloudflare Workers, and similar
 * environments with limited Node.js API access.
 *
 * @returns {boolean} `true` if executing on edge, `false` otherwise
 *
 * @example
 * ```typescript
 * if (isRunningOnEdge()) {
 *   // Use edge-compatible APIs only
 *   // Avoid Node.js-specific features like fs, crypto
 * }
 * ```
 */
export declare function isRunningOnEdge(): boolean;

/**
 * Checks if the code is running during the build/static generation process.
 *
 * This is useful for conditionally executing code only during build time,
 * such as pre-computing data or generating static assets.
 *
 * @returns {boolean} `true` if executing during build, `false` otherwise
 *
 * @example
 * ```typescript
 * if (isBuilding()) {
 *   // Pre-compute static data
 *   await generateStaticSitemap();
 * }
 * ```
 */
export declare function isBuilding(): boolean;

/**
 * Collection of Zod preprocessors for common environment variable transformations.
 *
 * These processors provide type-safe validation and transformation of environment
 * variables from strings to their appropriate types with sensible defaults.
 */
export declare const ZodProcessors: {
  /**
   * Processor for URL string environment variables.
   *
   * Validates the value is a properly formatted URL and removes trailing slashes
   * for consistency. Throws a Zod validation error if the URL is malformed.
   *
   * @returns {ZodEffects<ZodString, string, string>} Zod schema for URL validation
   *
   * @example
   * ```typescript
   * const schema = z.object({
   *   API_ENDPOINT: ZodProcessors.url()
   * });
   * // Valid: "https://api.example.com" -> "https://api.example.com"
   * // Valid: "https://api.example.com/" -> "https://api.example.com"
   * // Invalid: "not-a-url" -> throws ZodError
   * ```
   */
  url: () => z.ZodEffects<z.ZodString, string, string>;

  /**
   * Processor for log level environment variables.
   *
   * Provides a default log level if not specified. Common values include
   * 'error', 'warn', 'info', 'debug', 'trace', 'silly'.
   *
   * @param {string} [level='info'] - Default log level if environment variable is not set
   * @returns {ZodDefault<ZodString>} Zod schema with default log level
   *
   * @example
   * ```typescript
   * const schema = z.object({
   *   LOG_LEVEL: ZodProcessors.logLevel('warn')
   * });
   * // If LOG_LEVEL not set -> "warn"
   * // If LOG_LEVEL="debug" -> "debug"
   * ```
   */
  logLevel: (level?: string) => z.ZodDefault<z.ZodString>;

  /**
   * Processor for AI model type environment variables.
   *
   * Validates the value matches a known AI model type and provides a default
   * if not specified or invalid.
   *
   * @param {AiModelType} defaultValue - Default AI model type to use
   * @returns {ZodDefault<ZodType<AiModelType>>} Zod schema for AI model type validation
   *
   * @example
   * ```typescript
   * const schema = z.object({
   *   DEFAULT_MODEL: ZodProcessors.aiModelType('gpt-4')
   * });
   * // Valid: "gpt-4" -> "gpt-4"
   * // Invalid: "unknown-model" -> throws ZodError or uses default
   * ```
   */
  aiModelType: (
    defaultValue: AiModelType,
  ) => z.ZodDefault<z.ZodType<AiModelType, z.ZodTypeDef, unknown>>;

  /**
   * Processor for integer environment variables.
   *
   * Converts string values to integers using parseInt. Non-numeric strings
   * will fail validation.
   *
   * @returns {ZodType<number, ZodTypeDef, unknown>} Zod schema for integer validation
   *
   * @example
   * ```typescript
   * const schema = z.object({
   *   PORT: ZodProcessors.integer(),
   *   MAX_CONNECTIONS: ZodProcessors.integer()
   * });
   * // "3000" -> 3000
   * // "abc" -> throws ZodError
   * ```
   */
  integer: () => z.ZodType<number, z.ZodTypeDef, unknown>;

  /**
   * Processor for boolean environment variables with default value.
   *
   * Converts string representations to boolean values.
   *
   * @returns {ZodDefault<ZodBoolean>} Zod boolean schema with false default
   *
   * @example
   * ```typescript
   * const schema = z.object({
   *   ENABLE_FEATURE: ZodProcessors.boolean()
   * });
   * // Not set -> false
   * // "true" -> true
   * // "false" -> false
   * ```
   */
  boolean: () => z.ZodDefault<z.ZodBoolean>;

  /**
   * Processor for truthy boolean environment variables.
   *
   * Interprets various string values as boolean using truthy evaluation.
   * Common truthy values: "true", "1", "yes", "on"
   * Common falsy values: "false", "0", "no", "off", "" (empty), undefined, null
   *
   * @param {boolean} [defaultValue=false] - Default value when environment variable is not set
   * @returns {ZodType<boolean, ZodEffectsDef<ZodBoolean>, unknown>} Zod boolean schema
   *
   * @example
   * ```typescript
   * const schema = z.object({
   *   DEBUG_MODE: ZodProcessors.truthy(false)
   * });
   * // "true" or "1" or "yes" -> true
   * // "false" or "0" or "no" or "" -> false
   * // Not set -> false (default)
   * ```
   */
  truthy: (
    defaultValue?: boolean,
  ) => z.ZodType<boolean, z.ZodEffectsDef<z.ZodBoolean>, unknown>;

  /**
   * Processor for array environment variables.
   *
   * Provides a default empty array if not specified. Expects array-like input.
   *
   * @returns {ZodDefault<ZodArray<ZodUnknown>>} Zod array schema with empty default
   *
   * @example
   * ```typescript
   * const schema = z.object({
   *   ALLOWED_ORIGINS: ZodProcessors.array()
   * });
   * // Not set -> []
   * // ["origin1", "origin2"] -> ["origin1", "origin2"]
   * ```
   */
  array: () => z.ZodDefault<z.ZodArray<z.ZodUnknown>>;

  /**
   * Processor for object environment variables.
   *
   * Provides a default empty object if not specified.
   *
   * @returns {ZodDefault<ZodObject<ZodRawShape>>} Zod object schema with empty default
   *
   * @example
   * ```typescript
   * const schema = z.object({
   *   CUSTOM_CONFIG: ZodProcessors.object()
   * });
   * // Not set -> {}
   * // {key: "value"} -> {key: "value"}
   * ```
   */
  object: () => z.ZodDefault<z.ZodObject<z.ZodRawShape>>;

  /**
   * Processor for nullable string environment variables.
   *
   * Trims whitespace from string values and converts empty strings to null.
   * Useful for optional configuration that should be explicitly null when absent.
   *
   * @returns {ZodEffects<ZodNullable<ZodString>, string | null, string | null>} Zod nullable string schema
   *
   * @example
   * ```typescript
   * const schema = z.object({
   *   OPTIONAL_API_KEY: ZodProcessors.nullableString()
   * });
   * // Not set or "" -> null
   * // "  value  " -> "value"
   * // "value" -> "value"
   * ```
   */
  nullableString: () => z.ZodEffects<
    z.ZodNullable<z.ZodString>,
    string | null,
    string | null
  >;
};

/**
 * Retrieves and maps environment variable values from a source object.
 *
 * This function provides a merge strategy where `process.env` values take precedence
 * over the source object values. This allows for runtime overrides of default values
 * while maintaining type safety.
 *
 * @template TSource - Type of the source configuration object
 * @param {TSource} source - Source object with default environment variable values
 * @returns {Record<keyof TSource, string | number | undefined>} Mapped environment variables
 *
 * @remarks
 * - Returns source unchanged if `process.env` is not available (client-side safety)
 * - Empty string values from `process.env` are ignored in favor of source values
 * - Whitespace-only strings from `process.env` are ignored in favor of source values
 *
 * @example
 * ```typescript
 * const defaults = {
 *   API_URL: 'https://default-api.example.com',
 *   PORT: 3000,
 *   DEBUG: undefined
 * };
 *
 * // If process.env.API_URL = "https://prod-api.example.com"
 * // If process.env.PORT is not set
 * const mapped = getMappedSource(defaults);
 * // Result: {
 * //   API_URL: "https://prod-api.example.com",
 * //   PORT: 3000,
 * //   DEBUG: undefined
 * // }
 * ```
 */
export declare function getMappedSource<
  TSource extends Record<string, string | number | undefined>,
>(
  source: TSource,
): Record<keyof TSource, string | number | undefined>;
