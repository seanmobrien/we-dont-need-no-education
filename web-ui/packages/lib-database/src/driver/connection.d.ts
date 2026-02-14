import type { PostgresSql } from './postgres';

/**
 * PostgreSQL database driver connection manager
 * @module @compliance-theater/database/driver/connection
 */

declare module '@compliance-theater/database/driver/connection' {
  /**
   * Singleton database driver for managing PostgreSQL connections via the Neon serverless driver.
   *
   * This class implements a global singleton pattern to ensure a single database connection pool
   * is shared across the application. It provides both synchronous and asynchronous access to
   * the database connection, with automatic initialization and teardown lifecycle management.
   *
   * **Key Features:**
   * - Global singleton pattern prevents connection pool exhaustion
   * - Lazy initialization - connection established on first use
   * - Automatic cleanup via AfterManager lifecycle hooks
   * - Type-safe query interface via generic type parameter
   * - SSL verification and connection pooling (max 3 connections)
   * - Debug mode enabled for query logging
   *
   * **Lifecycle Management:**
   * The driver automatically registers a teardown handler that:
   * - Closes the connection pool during shutdown
   * - Has a 6-second timeout to prevent hanging
   * - Cleans up the global registry
   *
   * **Usage Patterns:**
   * ```typescript
   * // Asynchronous initialization (recommended)
   * const sql = await pgDbWithInit<User>();
   * const users = await sql`SELECT * FROM users`;
   *
   * // Synchronous access (throws if not initialized)
   * const sql = pgDb<User>();
   * const users = await sql`SELECT * FROM users WHERE id = ${id}`;
   * ```
   *
   * @template TQueryRecord - The default record type for database queries
   *
   * @example
   * ```typescript
   * // Type-safe database queries
   * type User = { id: number; email: string; name: string };
   * const db = await pgDbWithInit<User>();
   *
   * // Execute queries with full type safety
   * const users = await db`SELECT * FROM users WHERE active = ${true}`;
   * // users is typed as PostgresRowList<User[]>
   * ```
   *
   * @example
   * ```typescript
   * // Manual teardown (usually automatic)
   * import { PgDbDriver } from '@/lib/neondb/connection';
   * await PgDbDriver.teardown();
   * ```
   */
  export class PgDbDriver<TQueryRecord> {
    /**
     * Returns the global singleton instance of the database driver.
     *
     * Creates a new instance on first call and stores it in the global registry.
     * Subsequent calls return the same instance, ensuring connection pool sharing.
     *
     * @template TRecord - The record type for database operations
     * @returns The singleton PgDbDriver instance
     */
    static Instance<TRecord>(): PgDbDriver<TRecord>;

    /**
     * Tears down the global database connection and cleans up resources.
     *
     * This method:
     * - Ends the underlying postgres.js connection pool
     * - Times out after 6 seconds to prevent hanging
     * - Removes the instance from the global registry
     * - Unregisters the AfterManager cleanup hook
     *
     * @returns Promise that resolves when teardown is complete
     */
    static teardown(): Promise<void>;

    /**
     * Asynchronously retrieves the initialized database connection.
     *
     * This method waits for the connection to be fully initialized before returning.
     * Use this method when you need guaranteed database availability.
     *
     * **When to use:**
     * - During application startup
     * - In async initialization flows
     * - When you can't guarantee prior initialization
     *
     * @returns Promise resolving to the PostgreSQL connection
     * @throws {LoggedError} If database initialization fails
     */
    public getDb(): Promise<PostgresSql<TQueryRecord>>;

    /**
     * Synchronously retrieves the database connection.
     *
     * **⚠️ Warning:** Throws an error if the connection hasn't been initialized yet.
     * Only use this method when you're certain the database is already initialized.
     *
     * **When to use:**
     * - In route handlers after initial app startup
     * - In callbacks where initialization is guaranteed
     * - When you need immediate synchronous access
     *
     * @returns The PostgreSQL connection
     * @throws {Error} If the database is not initialized
     */
    public db(): PostgresSql<TQueryRecord>;
  }

  /**
   * Asynchronously initializes and returns a type-safe PostgreSQL connection.
   *
   * This is the recommended way to access the database connection, as it ensures
   * the connection is fully initialized before returning. The connection is cached
   * globally, so subsequent calls return the same connection instantly.
   *
   * **Features:**
   * - Automatic initialization on first call
   * - Type-safe query interface
   * - Global connection pooling
   * - SSL verification enabled
   * - Max 3 concurrent connections
   *
   * @template TRecord - The default record type for query results
   * @returns Promise resolving to a PostgreSQL connection interface
   * @throws {LoggedError} If connection initialization fails
   *
   * @example
   * ```typescript
   * // Basic usage
   * const db = await pgDbWithInit();
   * const rows = await db`SELECT * FROM users`;
   *
   * // With type safety
   * type User = { id: number; email: string };
   * const db = await pgDbWithInit<User>();
   * const users = await db`SELECT * FROM users`;
   * // users is typed as PostgresRowList<User[]>
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function pgDbWithInit<TRecord = any>(): Promise<PostgresSql<TRecord>>;

  /**
   * Synchronously returns a type-safe PostgreSQL connection.
   *
   * **⚠️ Warning:** This function throws an error if called before the database
   * is initialized. Only use when you're certain initialization has already occurred.
   *
   * **Recommended:** Use {@link pgDbWithInit} instead for safer async initialization.
   *
   * @template TRecord - The default record type for query results
   * @returns A PostgreSQL connection interface
   * @throws {Error} If the database has not been initialized yet
   *
   * @example
   * ```typescript
   * // Only use after ensuring initialization
   * export const GET = wrapRouteRequest(async (req) => {
   *   // Safe because route handlers run after app initialization
   *   const db = pgDb<User>();
   *   const user = await db`SELECT * FROM users WHERE id = ${userId}`;
   *   return Response.json(user);
   * });
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function pgDb<TRecord = any>(): PostgresSql<TRecord>;
}
