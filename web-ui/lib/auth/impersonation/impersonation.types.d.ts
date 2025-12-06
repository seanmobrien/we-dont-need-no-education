/**
 * Impersonation type definitions
 * @module @/lib/auth/impersonation/impersonation.types
 */

declare module '@/lib/auth/impersonation/impersonation.types' {
  /**
   * Impersonation session types.
   */
  export type ImpersonationSession = {
    userId: string;
    impersonatorId: string;
    timestamp: number;
  };
}
