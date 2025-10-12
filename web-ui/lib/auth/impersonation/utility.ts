import { env } from '@/lib/site-util/env';
import type { AdminTokenConfig } from './impersonation.types';
import { log } from '@/lib/logger';

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
export const adminBaseFromIssuer = (
  issuer: string,
): { origin: string; realm: string; adminBase: string } | undefined => {
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
  const extractRealmFromIssuer = (issuer: string): string | undefined => {
    try {
      const u = new URL(issuer);
      const parts = u.pathname.split('/').filter(Boolean);
      const idx = parts.findIndex((p) => p === 'realms');
      if (idx >= 0 && parts[idx + 1]) return decodeURIComponent(parts[idx + 1]);
      return undefined;
    } catch {
      return undefined;
    }
  };
  try {
    const u = new URL(issuer);
    const realm = extractRealmFromIssuer(issuer);
    if (!realm) return undefined;
    return {
      origin: u.origin,
      realm,
      adminBase: `${u.origin}/admin/realms/${encodeURIComponent(realm)}`,
    };
  } catch {
    return undefined;
  }
};
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
export const defaultConfigFromEnv = (): AdminTokenConfig => {
  const config = {
    issuer: env('AUTH_KEYCLOAK_ISSUER') || '',
    clientId: env('AUTH_KEYCLOAK_CLIENT_ID') || '',
    clientSecret: env('AUTH_KEYCLOAK_CLIENT_SECRET') || '',
    redirectUri: env('AUTH_KEYCLOAK_REDIRECT_URI') || '',
    impersonatorUsername:
      env('AUTH_KEYCLOAK_IMPERSONATOR_USERNAME') || undefined,
    impersonatorPassword:
      env('AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD') || undefined,
    impersonatorOfflineToken:
      env('AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN') || undefined,
  };

  // Basic validation - detailed validation happens in constructor
  if (
    !config.issuer ||
    !config.clientId ||
    !config.clientSecret ||
    !config.redirectUri
  ) {
    log((l) =>
      l.warn('SystemTokenStore: incomplete environment configuration'),
    );
    throw new TypeError(
      'SystemTokenStore: Required environment variables are missing',
    );
  }

  const { realm, adminBase } = adminBaseFromIssuer(config.issuer) || {};
  if (!realm || !adminBase) {
    log((l) =>
      l.warn(
        'SystemTokenStore: Unable to extract realm or admin base from issuer',
      ),
    );
    throw new TypeError('SystemTokenStore: Invalid issuer URL format');
  }
  return {
    ...config,
    adminBase,
    realm,
  };
};
