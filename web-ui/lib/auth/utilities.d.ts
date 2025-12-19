/**
 * Auth utilities module declaration
 * @module @/lib/auth/utilities
 */
import type { JWT } from '@auth/core/jwt';
import type { JWTPayload } from 'jose';
import type { LRUCache } from 'lru-cache';
import type { createRemoteJWKSet } from 'jose';
declare module '@/lib/auth/utilities' {
  /**
   * Constant array of known permission scopes.
   * Values: 'mcp-tool:read', 'mcp-tool'
   */
  export const KnownScopeValues: readonly ['mcp-tool:read', 'mcp-tool'];

  /**
   * Type representing one of the known scopes.
   */
  export type KnownScope = (typeof KnownScopeValues)[number];

  /**
   * Index mapping for known scopes to their hierarchy/level.
   */
  export const KnownScopeIndex: {
    readonly ToolRead: 0;
    readonly ToolReadWrite: 1;
  };

  /**
   * Generates the session token cookie key based on the environment.
   *
   * @function SessionTokenKey
   * @description Determines the cookie name for the session token.
   * Prefixes with `__Secure-` if the NEXT_PUBLIC_HOSTNAME protocol is https.
   *
   * @returns {string} The computed session token cookie key.
   *
   * @example
   * ```typescript
   * // If NEXT_PUBLIC_HOSTNAME is https://example.com
   * SessionTokenKey(); // returns "__Secure-authjs.session-token"
   *
   * // If NEXT_PUBLIC_HOSTNAME is http://localhost:3000
   * SessionTokenKey(); // returns "authjs.session-token"
   * ```
   */
  export function SessionTokenKey(): string;

  /**
   * Extracts the decoded JWT from a request.
   *
   * @function extractToken
   * @description Attempts to retrieve the JWT from the request.
   * First checks if the token is already attached to the request symbol.
   * If not, attempts to retrieve it using `getToken` with the session secret and salt,
   * or a fallback 'bearer-token' salt.
   * Caches the result on the request object for future access.
   *
   * @param {Request} req - The incoming request object.
   * @returns {Promise<JWT | null>} The decoded JWT if found and verified, otherwise null.
   */
  export function extractToken(req: Request): Promise<JWT | null>;

  /**
   * Cache for JWKS remote key sets to avoid repeated fetches.
   * Keys: issuer URL
   * Values: jose RemoteJWKSet instances
   */
  const jwksCache: LRUCache<string, ReturnType<typeof createRemoteJWKSet>>;

  /**
   * Decodes a JWT token with optional signature verification.
   *
   * @function decodeToken
   * @description Decodes a JWT string. Can optionally verify the signature against
   * a remote JWKS (JSON Web Key Set).
   *
   * @param {Object} options - Configuration options
   * @param {string} options.token - The JWT token string to decode
   * @param {boolean} [options.verify=false] - Whether to verify the token signature (default: false)
   * @param {string} [options.issuer] - Optional issuer URL override. If not provided and verify=true,
   *                         uses AUTH_KEYCLOAK_ISSUER environment variable
   *
   * @returns {Promise<JWTPayload>} The decoded JWT payload
   *
   * @throws {Error} If token is invalid, signature verification fails, or JWKS fetch fails,
   *                 or if verify=true but no issuer is provided/configured.
   *
   * @example
   * ```typescript
   * // Simple decode without verification
   * const payload = await decodeToken({ token: myToken, verify: false });
   * ```
   *
   * @example
   * ```typescript
   * // Decode with signature verification using default issuer
   * const payload = await decodeToken({ token: myToken, verify: true });
   * ```
   *
   * @example
   * ```typescript
   * // Decode with custom issuer
   * const payload = await decodeToken({
   *   token: myToken,
   *   verify: true,
   *   issuer: 'https://custom-auth.example.com/realms/my-realm'
   * });
   * ```
   */
  export function decodeToken(options: {
    token: string;
    verify?: boolean;
    issuer?: string;
  }): Promise<JWTPayload>;
}
