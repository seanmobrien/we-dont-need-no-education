/**
 * Authorization utilities
 * @module @/lib/auth/authorized
 */

declare module '@/lib/auth/authorized' {
  /**
   * Checks if the current user is authorized.
   */
  export function isAuthorized(): Promise<boolean>;

  /**
   * Gets the current user's session.
   */
  export function getSession(): Promise<unknown>;
}
