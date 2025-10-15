/**
 * Email ID resolution utilities
 * @module @/lib/email/email-id-resolver
 */

declare module '@/lib/email/email-id-resolver' {
  /**
   * Resolves an email ID from either a UUID or document unit ID, with automatic redirects.
   *
   * This function handles both UUID-based email IDs and numeric document unit IDs.
   * When a document unit ID is provided, it looks up the associated email ID and
   * redirects to the email ID URL. If the ID is invalid or not found, returns 404.
   *
   * @param emailIdParam - The route parameter that could be either an email ID (UUID) or document unit ID (number)
   * @param currentPath - The current path to redirect to with the resolved email ID
   * @returns The resolved email ID if valid, otherwise triggers redirect or 404
   * @throws {RedirectError} When document ID is resolved and redirect is needed
   * @throws {NotFoundError} When ID is invalid or not found
   */
  export function resolveEmailIdWithRedirect(
    emailIdParam: string,
    currentPath: string,
  ): Promise<string>;

  /**
   * Resolves an email ID from either a UUID or document unit ID, without redirects.
   * Used for cases where you just need the email ID value.
   *
   * @param emailIdParam - The route parameter that could be either an email ID (UUID) or document unit ID (number)
   * @returns The resolved email ID if valid, otherwise null
   */
  export function resolveEmailId(emailIdParam: string): Promise<string | null>;
}
