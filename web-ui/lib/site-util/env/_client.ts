import { z } from 'zod';
import { isAiLanguageModelType, AiLanguageModelType } from '@/lib/ai/client';
import { ZodProcessors } from './_common';

/**
 * The type representing the validated client environment variables.
 *
 * This type is generated from the clientEnvSchema and ensures that all
 * required and optional environment variables for the client-side application
 * are present and correctly typed.
 *
 * @doc
 */
export type ClientEnvType = ReturnType<typeof clientEnvSchema.parse>;

/**
 * An instance containing environment variables for the client-side application.
 *
 * IMPORTANT: NEXT_PUBLIC variables need to be directly accessed to avoid being
 * stripped during the build process.
 *
 * @doc
 */
export const clientRawInstance = {
  /**
   * The hostname for the public-facing application.
   * @type {string | undefined}
   */
  NEXT_PUBLIC_HOSTNAME: process.env.NEXT_PUBLIC_HOSTNAME,
  /**
   * The log level for client-side logging.
   * @type {string | undefined}
   */
  NEXT_PUBLIC_LOG_LEVEL_CLIENT:
    process.env.NEXT_PUBLIC_LOG_LEVEL_CLIENT ?? 'silly',
  /**
   * The cache timeout for client-side data grids.
   * @type {number | undefined}
   */
  NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT:
    process.env.NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT ?? 5 * 60 * 1000,
  /**
   * The license key for MUI X Pro components.
   */
  NEXT_PUBLIC_MUI_LICENSE: process.env.NEXT_PUBLIC_MUI_LICENSE,
  /**
   * The default AI model
   */
  NEXT_PUBLIC_DEFAULT_AI_MODEL: process.env.NEXT_PUBLIC_DEFAULT_AI_MODEL,
};

/**
 * Zod schema for validating and parsing client-side environment variables.
 *
 * This schema ensures that all required environment variables are present and
 * have the correct types and default values.
 *
 * @doc
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_HOSTNAME: ZodProcessors.url().default('http://localhost:3000'),
  NEXT_PUBLIC_LOG_LEVEL_CLIENT: ZodProcessors.logLevel().default('silly'),
  NEXT_PUBLIC_MUI_LICENSE: z.string().default(''),
  NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT: ZodProcessors.integer().default(
    5 * 60 * 1000,
  ),
  NEXT_PUBLIC_DEFAULT_AI_MODEL: z
    .string()
    .transform((val) => {
      return isAiLanguageModelType(val) ? val : ('hifi' as AiLanguageModelType);
    })
    .default('hifi' as AiLanguageModelType),
});

/**
 * Parses and validates the client environment variables using the schema.
 *
 * @returns {ClientEnvType} The validated and typed client environment variables.
 * @doc
 */
export const clientEnvFactory = (): ClientEnvType =>
  clientEnvSchema.parse(clientRawInstance);
