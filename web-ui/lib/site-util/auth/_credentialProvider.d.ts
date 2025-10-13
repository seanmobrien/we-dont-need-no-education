declare module '@/lib/site-util/auth/_credentialProvider' {
  import { ICredential, CredentialOptions } from './_types';

  /**
   * Credential factory function
   *
   * Creates and returns OAuth2 credentials for the specified provider and service.
   * This is the main entry point for obtaining authenticated credentials throughout
   * the application.
   *
   * The factory:
   * 1. Validates the user's session and authorization
   * 2. Retrieves or exchanges tokens as needed (e.g., via Keycloak token exchange)
   * 3. Configures an OAuth2 client with the appropriate credentials
   * 4. Returns a complete ICredential object ready for API calls
   *
   * Supported providers:
   * - 'google': Google OAuth2 with Gmail and other Google APIs
   *
   * Token retrieval strategy:
   * - Checks for cached tokens on the request object (performance optimization)
   * - If not cached, validates the user's session
   * - Performs Keycloak token exchange to obtain Google tokens
   * - Caches tokens on the request object for subsequent calls
   *
   * @param options - Configuration specifying provider, service, request context, and optional user ID
   * @returns Promise resolving to a complete credential set with configured OAuth2 client
   * @throws {Error} If provider is not supported
   * @throws {Error} If user is not authenticated ('Access denied')
   * @throws {Error} If user is not authorized to access the requested user's credentials
   * @throws {Error} If token exchange fails
   *
   * @example
   * ```typescript
   * // Get credentials for the current user
   * const credential = await credentialFactory({
   *   provider: 'google',
   *   service: 'email',
   *   req: request
   * });
   *
   * // Use the credential to access Gmail API
   * const gmail = google.gmail({ version: 'v1', auth: credential.client });
   * ```
   *
   * @example
   * ```typescript
   * // Admin accessing another user's credentials
   * const credential = await credentialFactory({
   *   provider: 'google',
   *   service: 'email',
   *   req: request,
   *   userId: 123
   * });
   * ```
   */
  export const credentialFactory: (
    options: CredentialOptions,
  ) => Promise<ICredential>;
}
