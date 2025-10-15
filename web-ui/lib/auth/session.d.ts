/**
 * Session management utilities
 * @module @/lib/auth/session
 */

declare module '@/lib/auth/session' {
  /**
   * Session management functions for NextAuth.
   */
  export function getSession(): Promise<unknown>;
  export function getServerSession(): Promise<unknown>;
}
