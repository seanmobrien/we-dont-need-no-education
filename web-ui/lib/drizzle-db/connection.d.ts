/**
 * Drizzle DB connection helpers
 *
 * This module lazily initializes a Drizzle ORM DbDatabaseType instance using
 * a pg driver. The initialized instance is cached globally for sharing across the process.
 *
 * @module @/lib/drizzle-db/connection
 */

import type { DbDatabaseType } from './schema';

declare module '@/lib/drizzle-db/connection' {
  /**
   * Ensure the Drizzle DB is initialized and optionally run a callback with the db.
   *
   * When called without a callback the function resolves to the initialized DbDatabaseType.
   * When called with a callback the callback will be invoked once the db is available.
   *
   * @returns Promise resolving to the initialized database instance
   *
   * @example
   * ```typescript
   * // Without callback
   * const db = await drizDbWithInit();
   * const users = await db.query.users.findMany();
   *
   * // With callback
   * const result = await drizDbWithInit(db =>
   *   db.query.users.findMany()
   * );
   * ```
   */
  export const drizDbWithInit: {
    (): Promise<DbDatabaseType>;
    <T>(
      then: (db: DbDatabaseType) => T,
    ): T extends Promise<infer R> ? Promise<R> : Promise<T>;
  };

  /**
   * Synchronous accessor for the Drizzle DB instance.
   *
   * If the DB is already initialized the function returns the instance or, when
   * a callback is provided, invokes the callback with the db. When the DB is not
   * yet initialized this function will throw.
   *
   * @throws {Error} When database is still initializing
   *
   * @example
   * ```typescript
   * // Direct access
   * const db = drizDb();
   * const users = await db.query.users.findMany();
   *
   * // With callback
   * const result = await drizDb(db =>
   *   db.query.users.findMany()
   * );
   * ```
   */
  export const drizDb: {
    (): DbDatabaseType;
    <T>(
      fn: (driz: DbDatabaseType) => T,
    ): T extends Promise<infer R> ? Promise<R> : Promise<T>;
  };
}
