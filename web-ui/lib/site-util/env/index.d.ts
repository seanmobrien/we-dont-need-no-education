declare module '@/lib/site-util/env' {
  import { ServerEnvType } from './_server';
  import { ClientEnvType } from './_client';

  /**
   * This module provides utilities for managing environment variables in a TypeScript application.
   * It includes functions and types for handling both server and client environment variables,
   * as well as determining the runtime environment (client or server).
   *
   * The main export is the `env` function, which allows for retrieving environment variables
   * based on the current runtime context. The module also exports types and utility functions
   * for working with environment variables.
   *
   * @module env
   *
   * @remarks
   * The `env` function is overloaded to support different use cases:
   * - Retrieving a specific server or client environment variable by key.
   * - Returning all environment variables for the current runtime context.
   *
   * The module also provides types for server and client environment variables, as well as
   * utility functions to determine the runtime environment.
   *
   * @example
   * ```typescript
   * import { env, isRunningOnClient, isRunningOnServer } from './env';
   *
   * if (isRunningOnClient()) {
   *   const apiUrl = env('NEXT_PUBLIC_HOSTNAME'); // Retrieve client environment variable
   * }
   *
   * if (isRunningOnServer()) {
   *   const dbHost = env('DB_HOST'); // Retrieve server environment variable
   * }
   * ```
   */

  /**
   * Determines the current runtime environment
   */
  export const runtime: 'client' | 'server' | 'edge';

  /**
   * Checks if code is running on the client (browser)
   */
  export const isRunningOnClient: () => boolean;

  /**
   * Checks if code is running on the server (Node.js)
   */
  export const isRunningOnServer: () => boolean;

  /**
   * Checks if code is running on the edge runtime
   */
  export const isRunningOnEdge: () => boolean;

  export type { ServerEnvType, ClientEnvType };

  /**
   * Key values for server-supported environment variables.
   */
  export type ServerEnvKey = keyof ServerEnvType;

  /**
   * Key values for client-supported environment variables.
   */
  export type ClientEnvKey = keyof ClientEnvType;

  /**
   * Environment variables typed according to whether the code is running on the server or client.
   * Note as far as I can tell this always returns the client variables, so not 100% we're adding value,
   * but kind of neat that we can do this.
   */
  export type EnvType = typeof window extends 'undefined'
    ? ServerEnvType
    : typeof window extends undefined
      ? ServerEnvType
      : ClientEnvType;

  /**
   * Interface for the overloaded `env` function.
   */
  interface EnvOverloads {
    /**
     * Get the value of a server environment variable by key.
     * @param key - The key of the server environment variable.
     * @returns The value of the server environment variable.
     */
    <TKey extends ServerEnvKey>(key: TKey): Pick<ServerEnvType, TKey>[TKey];

    /**
     * Get the value of a client environment variable by key.
     * @param key - The key of the client environment variable.
     * @returns The value of the client environment variable.
     */
    <TKey extends ClientEnvKey>(key: TKey): Pick<ClientEnvType, TKey>[TKey];

    /**
     * Returns environment variables typed appropriately given the generic key.
     */
    <TKey extends ClientEnvKey | ServerEnvKey>(): TKey extends ClientEnvKey
      ? ClientEnvType
      : TKey extends ServerEnvKey
        ? ServerEnvType
        : never;

    /**
     * Returns a union type of all available environment variables.
     * @returns The environment variables.
     */
    (): ClientEnvType | ServerEnvType;
  }

  /**
   * Function to get environment variables.
   * @param key - The key of the environment variable.
   * @returns The value of the environment variable.
   */
  export const env: EnvOverloads;
}
