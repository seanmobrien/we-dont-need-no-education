/**
 * @module site-util/env/_client
 * @description Client-side environment variable configuration and validation
 *
 * This module provides type-safe access to client-side (NEXT_PUBLIC_*) environment
 * variables with Zod schema validation. All variables defined here are safe to
 * expose to the browser and will be bundled into the client JavaScript.
 *
 * **IMPORTANT**: Only NEXT_PUBLIC_* variables should be defined here, as they
 * will be inlined into the client bundle during build time. Never include
 * sensitive credentials or server-only configuration.
 *
 * @example
 * ```typescript
 * import { clientEnvFactory } from './_client';
 *
 * // Get validated client environment
 * const env = clientEnvFactory();
 *
 * // Access public configuration
 * console.log(`API URL: ${env.NEXT_PUBLIC_HOSTNAME}`);
 * console.log(`Log Level: ${env.NEXT_PUBLIC_LOG_LEVEL_CLIENT}`);
 * ```
 *
 * @see {@link https://nextjs.org/docs/app/building-your-application/configuring/environment-variables Next.js Environment Variables}
 */

import { z } from 'zod';
import { AiLanguageModelType } from '../../ai/client';

/**
 * Type representing the validated client-side environment variables.
 *
 * This type is automatically inferred from the Zod schema and provides
 * complete type safety for all client environment variables. It includes
 * proper typing for URLs, integers, booleans, and model types.
 *
 * @example
 * ```typescript
 * import { ClientEnvType } from './_client';
 *
 * function useConfig(): ClientEnvType {
 *   return clientEnvFactory();
 * }
 * ```
 */
export type ClientEnvType = ReturnType<typeof clientEnvSchema.parse>;

/**
 * Raw instance containing unvalidated client environment variables.
 *
 * This object directly accesses NEXT_PUBLIC_* environment variables from
 * process.env. Values must be accessed directly (not via spread) to prevent
 * them from being stripped during the build optimization process.
 *
 * @remarks
 * - Direct property access is required for Next.js to inline these values
 * - Default values are provided for optional configuration
 * - All values are strings or undefined until validated by the schema
 *
 * @example
 * ```typescript
 * // This object is used internally by clientEnvFactory()
 * // and should not be accessed directly in application code
 * ```
 */
export declare const clientRawInstance: {
  /**
   * Azure Monitor Application Insights connection string for telemetry.
   * Optional - if not set, telemetry will be disabled.
   *
   * @example "InstrumentationKey=12345678-1234-1234-1234-123456789012;..."
   */
  NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING: string | undefined;

  /**
   * Cache timeout duration for client-side data grids in milliseconds.
   * Controls how long grid data is cached before refetching.
   *
   * @default 300000 (5 minutes)
   * @example 60000 for 1 minute, 600000 for 10 minutes
   */
  NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT: string | number | undefined;

  /**
   * Default AI model to use for language operations.
   * Must be a valid AiLanguageModelType value.
   *
   * @example "hifi", "lofi"
   */
  NEXT_PUBLIC_DEFAULT_AI_MODEL: string | undefined;

  /**
   * The public-facing hostname/URL for the application.
   * Used for constructing absolute URLs and OAuth redirects.
   *
   * @example "https://app.example.com", "http://localhost:3000"
   */
  NEXT_PUBLIC_HOSTNAME: string | undefined;

  /**
   * Log level for client-side logging.
   * Controls verbosity of browser console output.
   *
   * @default "silly"
   * @example "error", "warn", "info", "debug", "silly"
   */
  NEXT_PUBLIC_LOG_LEVEL_CLIENT: string | undefined;

  /**
   * Flagsmith API endpoint URL for feature flag retrieval.
   * Required for feature flag functionality.
   *
   * @example "https://flags.example.com/api/v1/"
   */
  NEXT_PUBLIC_FLAGSMITH_API_URL: string;

  /**
   * Flagsmith environment identifier for scoping feature flags.
   * Required for feature flag functionality.
   *
   * @example "xXnDu6N5NqCRhkFEqTtApy"
   */
  NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID: string;

  /**
   * MUI X Pro license key for premium components.
   * Optional - if not set, MUI X Pro features will show warnings.
   *
   * @example "abc123def456..."
   */
  NEXT_PUBLIC_MUI_LICENSE: string | undefined;
};

/**
 * Zod validation schema for client-side environment variables.
 *
 * This schema ensures all required environment variables are present with
 * valid values and provides sensible defaults for optional configuration.
 * It validates types, formats, and constraints at runtime.
 *
 * @remarks
 * - All fields are validated during application initialization
 * - Invalid values will throw a ZodError with detailed error messages
 * - Default values are applied for optional fields
 *
 * @example
 * ```typescript
 * // Manual validation (typically not needed)
 * const validated = clientEnvSchema.parse({
 *   NEXT_PUBLIC_HOSTNAME: "https://app.example.com",
 *   NEXT_PUBLIC_FLAGSMITH_API_URL: "https://flags.example.com/api/v1/",
 *   // ... other required fields
 * });
 * ```
 */
export declare const clientEnvSchema: z.ZodObject<{
  /**
   * Azure Monitor connection string validation.
   * Optional string, no default value.
   */
  NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING: z.ZodOptional<z.ZodString>;

  /**
   * Data grid cache timeout validation.
   * Converted to integer, defaults to 5 minutes (300000ms).
   */
  NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT: z.ZodDefault<
    z.ZodType<number, z.ZodTypeDef, unknown>
  >;

  /**
   * Default AI model validation.
   * Transformed to AiLanguageModelType, defaults to 'hifi'.
   */
  NEXT_PUBLIC_DEFAULT_AI_MODEL: z.ZodDefault<
    z.ZodEffects<z.ZodString, AiLanguageModelType, string>
  >;

  /**
   * Flagsmith API URL validation.
   * Required, must be non-empty string.
   */
  NEXT_PUBLIC_FLAGSMITH_API_URL: z.ZodString;

  /**
   * Flagsmith environment ID validation.
   * Required, must be non-empty string.
   */
  NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID: z.ZodString;

  /**
   * Application hostname validation.
   * URL format validated, trailing slash removed, defaults to localhost:3000.
   */
  NEXT_PUBLIC_HOSTNAME: z.ZodDefault<
    z.ZodEffects<z.ZodString, string, string>
  >;

  /**
   * Client log level validation.
   * Defaults to 'silly' for maximum verbosity.
   */
  NEXT_PUBLIC_LOG_LEVEL_CLIENT: z.ZodDefault<z.ZodString>;

  /**
   * MUI license key validation.
   * Defaults to empty string if not provided.
   */
  NEXT_PUBLIC_MUI_LICENSE: z.ZodDefault<z.ZodString>;
}>;

/**
 * Factory function for creating validated client environment configuration.
 *
 * This function parses and validates all client environment variables using
 * the Zod schema, ensuring type safety and providing sensible defaults.
 * It should be called once during application initialization.
 *
 * @returns {ClientEnvType} Validated and typed client environment variables
 *
 * @throws {z.ZodError} When required environment variables are missing or have invalid values
 *
 * @example
 * ```typescript
 * // In your app initialization or config module
 * export const clientConfig = clientEnvFactory();
 *
 * // Use throughout your application
 * import { clientConfig } from '@/config';
 *
 * function MyComponent() {
 *   const apiUrl = clientConfig.NEXT_PUBLIC_HOSTNAME;
 *   const logLevel = clientConfig.NEXT_PUBLIC_LOG_LEVEL_CLIENT;
 *   // Full type safety and IntelliSense support
 * }
 * ```
 *
 * @remarks
 * - This function reads from `process.env` which is replaced at build time
 * - Values are frozen after validation and cannot be changed at runtime
 * - Validation errors will prevent the application from starting
 * - Safe to call on both client and server (values are identical)
 */
export declare function clientEnvFactory(): ClientEnvType;
