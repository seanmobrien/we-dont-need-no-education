/**
 * Database not ready error type
 * @module @/lib/drizzle-db/not-ready-error
 */

declare module '@/lib/drizzle-db/not-ready-error' {
  /**
   * Error thrown when database is not ready for operations.
   */
  export class NotReadyError extends Error {
    constructor(message: string);
  }
}
