import z from 'zod';

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
    z
      .string()
      .url()
      .transform((val) => val.replace(/\/+$/, '')),

  /**
   * Processor for log level strings.
   * Provides a default value of 'info' if not specified.
   *
   * @returns {ZodString} A Zod string schema for log levels.
   */
  logLevel: (): z.ZodDefault<z.ZodString> => z.string().default('info'),

  /**
   * Processor for integer values.
   * Ensures the value is a valid integer and provides a default value of 0 if not specified.
   *
   * @returns {ZodNumber} A Zod number schema for integers.
   */
  integer: (): z.ZodDefault<z.ZodNumber> => z.number().int().default(0),

  /**
   * Processor for boolean values.
   * Ensures the value is a valid boolean and provides a default value of false if not specified.
   *
   * @returns {ZodBoolean} A Zod boolean schema.
   */
  boolean: (): z.ZodDefault<z.ZodBoolean> => z.boolean().default(false),

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
};
