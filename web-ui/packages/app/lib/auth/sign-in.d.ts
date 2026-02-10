/**
 * Sign-in utilities
 * @module @/lib/auth/sign-in
 */

declare module '@/lib/auth/sign-in' {
  /**
   * NextAuth `signIn` callback implementation.
   *
   * This callback is intended to be used as the `callbacks.signIn` handler for
   * NextAuth. It performs two responsibilities:
   *  1. Persist new OAuth tokens for supported providers (currently `keycloak`)
   *     into the local `accounts` table via `updateAccountTokens`.
   *  2. Emit a lightweight telemetry event locally (`logEvent('signIn')`) and
   *     to Application Insights when available. The AppInsights event uses only
   *     minimal, non-sensitive properties (provider and a truncated
   *     providerAccountId).
   *
   * Success criteria / Return:
   * - Must return `true` (allow sign-in) or a redirect URL (string) in case
   *   the application wants to redirect the user. This implementation always
   *   returns `true` to allow sign-in to proceed.
   *
   * Edge cases:
   * - If `account` is missing or the provider is not one of the handled
   *   providers, no token persistence is attempted. AppInsights failures are
   *   caught and logged but do not block sign-in.
   *
   * @param params.user - The user object returned/created by the adapter or
   *                     OAuth provider.
   * @param params.account - Provider account object (may be null during some
   *                        flows). When present, used to persist tokens.
   * @param params.profile - Optional OAuth profile provided by the provider.
   * @param params.email - Optional email verification metadata for email
   *                      provider flows.
   *
   * @returns Awaitable<boolean|string> - `true` to allow sign-in, or a string
   *                                      URL to redirect to.
   */
  export function signIn(provider?: string): Promise<void>;
}
