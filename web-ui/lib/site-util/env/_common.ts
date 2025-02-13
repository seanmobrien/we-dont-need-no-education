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

export const ZodProcessors = {
  url: () =>
    z
      .string()
      .url()
      .transform((val) => val.replace(/\/+$/, '')),
  logLevel: () => z.string().default('info'),
};
