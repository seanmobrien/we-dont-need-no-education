/**
 * Impersonation utility functions
 * @module @/lib/auth/impersonation/utility
 */
import type { AdminTokenConfig } from './impersonation.types';

declare module '@/lib/auth/impersonation/utility' {
  /**
   * Checks if the current request is an impersonation request.
   *
   * @function isImpersonating
   * @description Determines if the current request is an impersonation request by checking
   * the presence of an impersonation token in the request headers.
   *
   * @returns {boolean} True if the request is an impersonation request, false otherwise.
   *
   * @example
   * ```typescript
   * if (isImpersonating()) {
   *   // Handle impersonation-specific logic
   * }
   * ```
   */
  export function isImpersonating(): boolean;


  /**
   * Extracts Keycloak admin configuration from issuer URL
   *
   * @function adminBaseFromIssuer
   * @description Parses a Keycloak issuer URL to extract the realm name and construct
   * the corresponding admin base URL. Handles URL decoding and validates the expected
   * Keycloak URL structure with '/realms/{realm-name}' path.
   *
   * @param {string} issuer - The Keycloak issuer URL (e.g., 'https://auth.example.com/realms/master')
   * @returns {Object|undefined} Configuration object with origin, realm, and adminBase, or undefined if parsing fails
   * @returns {string} returns.origin - The base origin URL (e.g., 'https://auth.example.com')
   * @returns {string} returns.realm - The extracted realm name (e.g., 'master')
   * @returns {string} returns.adminBase - The constructed admin base URL (e.g., 'https://auth.example.com/admin/realms/master')
   *
   * @example
   * ```typescript
   * const config = adminBaseFromIssuer('https://auth.example.com/realms/my-realm');
   * // Returns: {
   * //   origin: 'https://auth.example.com',
   * //   realm: 'my-realm',
   * //   adminBase: 'https://auth.example.com/admin/realms/my-realm'
   * // }
   * ```
   *
   * @example
   * ```typescript
   * const invalid = adminBaseFromIssuer('invalid-url');
   * // Returns: undefined
   * ```
   */
  export function adminBaseFromIssuer(issuer: string): { origin: string; realm: string; adminBase: string } | undefined;
  /**
    * Extracts realm name from Keycloak issuer URL path
    *
    * @function extractRealmFromIssuer
    * @description Internal helper that parses the URL pathname to find the realm
    * name following the '/realms/' path segment. Handles URL decoding for realm
    * names that may contain special characters.
    *
    * @param {string} issuer - The Keycloak issuer URL to parse
    * @returns {string|undefined} The decoded realm name, or undefined if not found
    *
    * @example
    * ```typescript
    * const realm = extractRealmFromIssuer('https://auth.example.com/realms/my%2Drealm');
    * // Returns: 'my-realm'
    * ```
    */
  function extractRealmFromIssuer(issuer: string): string | undefined;

  /**
   * Creates AdminTokenConfig from environment variables
   *
   * @function defaultConfigFromEnv
   * @description Constructs a complete AdminTokenConfig object by reading values
   * from environment variables. Validates that all required configuration is present
   * and extracts realm/adminBase from the issuer URL.
   *
   * @returns {AdminTokenConfig} Complete configuration object for admin token acquisition
   * @throws {TypeError} When required environment variables are missing or issuer URL is invalid
   *
   * @example
   * ```typescript
   * // Environment variables:
   * // AUTH_KEYCLOAK_ISSUER=https://auth.example.com/realms/master
   * // AUTH_KEYCLOAK_CLIENT_ID=admin-cli
   * // AUTH_KEYCLOAK_CLIENT_SECRET=secret
   * // AUTH_KEYCLOAK_REDIRECT_URI=https://app.example.com/callback
   *
   * const config = defaultConfigFromEnv();
   * // Returns complete AdminTokenConfig with realm and adminBase populated
   * ```
   *
   * @see {@link AdminTokenConfig} for complete configuration structure
   */
  export function defaultConfigFromEnv(): AdminTokenConfig;

}
