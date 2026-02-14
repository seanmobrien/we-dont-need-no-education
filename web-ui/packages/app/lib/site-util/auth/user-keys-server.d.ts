import type { DatabaseType } from '@compliance-theater/database/orm';

declare module '@/lib/site-util/auth/user-keys-server' {
  /**
   * Returns all public keys for a user that were active at a given date.
   *
   * This function queries the user_public_keys table to find all keys that:
   * 1. Belong to the specified user
   * 2. Have an effectiveDate on or before the specified date
   * 3. Either have no expirationDate (never expire) OR have an expirationDate after the specified date
   *
   * This allows for key rotation and time-based validity checking. For example,
   * when verifying a signature on a document, you can check if the key was valid
   * at the time the document was signed.
   *
   * Authentication:
   * - If userId is not provided, the function will use the current session user
   * - Throws an error if the user is not authenticated
   *
   * @param params - Configuration object
   * @param params.userId - The user's ID (number). If not provided, uses current session user
   * @param params.effectiveDate - ISO string or Date for the point in time to check. Defaults to current date/time
   * @param params.db - Drizzle database instance. If not provided, creates a new instance
   * @returns Promise resolving to an array of base64-encoded public key strings
   * @throws {Error} If user is not authenticated (when userId not provided)
   * @throws {Error} If user ID format is invalid
   *
   * @example
   * ```typescript
   * // Get current user's active public keys
   * const keys = await getActiveUserPublicKeys({
   *   userId: 123
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Get keys that were valid on a specific date
   * const historicalKeys = await getActiveUserPublicKeys({
   *   userId: 123,
   *   effectiveDate: '2024-01-15T00:00:00Z'
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Use with existing database connection
   * const db = await drizDbWithInit();
   * const keys = await getActiveUserPublicKeys({
   *   userId: 123,
   *   db
   * });
   * ```
   */
  export const getActiveUserPublicKeys: (params: {
    userId?: number;
    effectiveDate?: string | Date;
    db?: DatabaseType;
  }) => Promise<string[]>;
}
