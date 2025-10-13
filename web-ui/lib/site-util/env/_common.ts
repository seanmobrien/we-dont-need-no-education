import { isTruthy } from '@/lib/react-util/utility-methods';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import z from 'zod';
import { isAiModelType } from '@/lib/ai/core/guards';
import { AiModelType, AiModelTypeValues } from '@/lib/ai/core/unions';

/**
 * @module site-util/env/_common
 *
 * This module provides utilities for determining the current runtime environment.
 *
 * @typedef {('nodejs' | 'edge' | 'client' | 'static')} RuntimeConfig
 * Represents the possible runtime environments.
 *
 * - 'nodejs': Running in a Node.js environment.
 * - 'edge': Running in an Edge environment (e.g., Deno).
 * - 'client': Running in a client-side environment (e.g., browser).
 * - 'static': Running in a static environment.
 *
 * @function runtime
 * Returns the current runtime environment.
 *
 * @returns {RuntimeConfig} The current runtime environment.
 *
 * @function isRunningOnServer
 * Checks if the code is running on the server.
 *
 * @returns {boolean} `true` if running on the server, otherwise `false`.
 *
 * @function isRunningOnClient
 * Checks if the code is running on the client.
 *
 * @returns {boolean} `true` if running on the client, otherwise `false`.
 */

/**
 * Represents the possible runtime environments.
 *
 * - 'nodejs': Running in a Node.js environment.
 * - 'edge': Running in an Edge environment (e.g., Deno).
 * - 'client': Running in a client-side environment (e.g., browser).
 * - 'static': Running in a static environment.
 */
export type RuntimeConfig = 'nodejs' | 'edge' | 'client' | 'static' | 'server';

/**
 * Determines the current runtime environment.
 *
 * @returns {RuntimeConfig} The current runtime environment.
 */
const currentRuntime: RuntimeConfig = (() => {
  if (typeof window !== 'undefined') {
    // Client-side detection
    if ('Deno' in window) {
      return 'edge';
    } else if ('process' in window) {
      return 'nodejs';
    }
    return 'client';
  } else {
    // Server-side detection
    if (typeof process !== 'undefined') {
      return 'nodejs';
    }
    return 'server';
  }
  return 'static';
})();

/**
 * Returns the current runtime environment.
 *
 * @returns {RuntimeConfig} The current runtime environment.
 */
export const runtime = (): RuntimeConfig => currentRuntime;

/**
 * Checks if the code is running on the server.
 *
 * @returns {boolean} `true` if running on the server, otherwise `false`.
 */
export const isRunningOnServer = (): boolean => currentRuntime !== 'client';

/**
 * Checks if the code is running on the client.
 *
 * @returns {boolean} `true` if running on the client, otherwise `false`.
 */
export const isRunningOnClient = (): boolean => currentRuntime === 'client';

/**
 * Checks if the code is running on the edge.
 *
 * @returns {boolean} `true` if running on the edge, otherwise `false`.
 */
export const isRunningOnEdge = (): boolean =>
  process.env.NEXT_RUNTIME === 'edge';

/**
 * A collection of Zod processors for various environment variables.
 */
export const ZodProcessors = {
  /**
   * Processor for URL strings.
   * Ensures the value is a valid URL and removes trailing slashes.
   *
   * @returns {ZodString} A Zod string schema for URLs.
   */
  url: (): z.ZodEffects<z.ZodString, string, string> =>
    z.string().transform((val, ctx) => {
      try {
        const url = new URL(val);
        // Remove trailing slash if present
        return url.href.replace(/\/$/, '');
      } catch (error: unknown) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid URL: ${val} - ${LoggedError.isTurtlesAllTheWayDownBaby(error).message}`,
        });
        return z.NEVER;
      }
    }),
  /**
   * Processor for log level strings.
   * Provides a default value of 'info' if not specified.
   *
   * @returns {ZodString} A Zod string schema for log levels.
   */
  logLevel: (level: string = 'info'): z.ZodDefault<z.ZodString> =>
    z.string().default(level ?? 'info'),

  aiModelType: (
    defaultValue: AiModelType,
  ): z.ZodDefault<z.ZodType<AiModelType, z.ZodTypeDef, unknown>> =>
    z
      .preprocess((val, ctx) => {
        if (isAiModelType(val)) {
          return val;
        }
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid AI model type: ${val}`,
          path: ctx.path,
        });
        return z.NEVER;
      }, z.enum(AiModelTypeValues))
      .default(defaultValue),
  /**
   * Processor for integer values.
   * Ensures the value is a valid integer and provides a default value of 120 if not specified.
   *
   * @returns {ZodType<number, ZodTypeDef, unknown>} A Zod schema for integers.
   */
  integer: (): z.ZodType<number, z.ZodTypeDef, unknown> =>
    z.preprocess((val) => {
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
      return val;
    }, z.number().int()),

  /**
   * Processor for boolean values.
   * Ensures the value is a valid boolean and provides a default value of false if not specified.
   *
   * @returns {ZodBoolean} A Zod boolean schema.
   */
  boolean: (): z.ZodDefault<z.ZodBoolean> => z.boolean().default(false),

  /**
   * Processor for truthy boolean values.
   * Ensures the value is a valid boolean and provides a default value if not specified.
   *
   * @returns {ZodBoolean} A Zod boolean schema.
   */
  truthy: (
    defaultValue = false,
  ): z.ZodType<boolean, z.ZodEffectsDef<z.ZodBoolean>, unknown> =>
    z.preprocess(
      (val: unknown) => {
        return typeof val === undefined ||
          val === null ||
          (typeof val === 'string' && val.trim() === '')
          ? !!defaultValue
          : isTruthy(val);
      },
      z.boolean(),
      z.boolean(),
    ),

  /**
   * Processor for array values.
   * Ensures the value is a valid array and provides a default value of an empty array if not specified.
   *
   * @returns {ZodArray} A Zod array schema.
   */
  array: (): z.ZodDefault<z.ZodArray<z.ZodUnknown>> =>
    z.array(z.unknown()).default([]),

  /**
   * Processor for object values.
   * Ensures the value is a valid object and provides a default value of an empty object if not specified.
   *
   * @returns {ZodObject} A Zod object schema.
   */
  object: (): z.ZodDefault<z.ZodObject<z.ZodRawShape>> =>
    z.object({}).default({}),

  /**
   * Trimmed nullable string processor
   * @returns
   */
  nullableString: (): z.ZodEffects<
    z.ZodNullable<z.ZodString>,
    string | null,
    string | null
  > =>
    z
      .string()
      .nullable()
      .transform((val) => (val ? val.trim() : null)),
};

/**
 * Retrieves environment variable values from the provided source object,
 * giving precedence to `process.env` values if they exist and are non-empty.
 * @param source The source value to read from.
 * @returns A record with keys from the source and values from either process.env or the source.
 */
export const getMappedSource = <
  TSource extends Record<string, string | number | undefined>,
>(
  source: TSource,
): Record<keyof TSource, string | number | undefined> => {
  // Handle environments where process.env does not exist (eg client)
  if (
    typeof process !== 'object' ||
    !process ||
    typeof process.env !== 'object' ||
    !process.env
  ) {
    return source;
  }
  const getRawValue = (key: keyof TSource): string | number | undefined => {
    const envValue = process.env[key as string];
    if (typeof envValue === 'string' && envValue.trim() !== '') {
      return envValue;
    }
    return source[key];
  };
  return Object.keys(source).reduce(
    (acc, key) => {
      acc[key as keyof TSource] = getRawValue(key as keyof TSource);
      return acc;
    },
    {} as Record<keyof TSource, string | number | undefined>,
  );
};
