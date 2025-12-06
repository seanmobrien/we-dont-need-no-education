/**
 * Drizzle SQL utilities and types
 * @module @/lib/drizzle-db/drizzle-sql
 */

declare module '@/lib/drizzle-db/drizzle-sql' {
  import { SQL } from 'drizzle-orm';

  /**
   * SQL query builder type from Drizzle ORM.
   */
  export type DrizzleSqlType = typeof SQL;

  /**
   * SQL query builder instance.
   */
  export const sql: DrizzleSqlType;
}
