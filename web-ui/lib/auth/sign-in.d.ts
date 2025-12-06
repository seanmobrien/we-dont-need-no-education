/**
 * Sign-in utilities
 * @module @/lib/auth/sign-in
 */

declare module '@/lib/auth/sign-in' {
  /**
   * Initiates sign-in flow.
   */
  export function signIn(provider?: string): Promise<void>;
}
