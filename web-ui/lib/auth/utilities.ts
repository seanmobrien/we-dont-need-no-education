import { getToken, type JWT } from '@auth/core/jwt';
import { env } from '@/lib/site-util/env';
import {
  decodeJwt,
  jwtVerify,
  createRemoteJWKSet,
  type JWTPayload,
} from 'jose';
import { LRUCache } from 'lru-cache';
import { LoggedError } from '@/lib/react-util/errors/logged-error';

export const KnownScopeValues = ['mcp-tool:read', 'mcp-tool'] as const;
export type KnownScope = (typeof KnownScopeValues)[number];
export const KnownScopeIndex = {
  ToolRead: 0,
  ToolReadWrite: 1,
} as const;

const REQUEST_DECODED_TOKEN: unique symbol = Symbol.for(
  '@/no-education/api/auth/decoded-token',
);
type RequestWithToken = Request & {
  [REQUEST_DECODED_TOKEN]?: JWT;
};

export const SessionTokenKey = (): string => {
  const url = new URL(env('NEXT_PUBLIC_HOSTNAME'));
  return (
    (url.protocol === 'https:' ? '__Secure-' : '') + 'authjs.session-token'
  );
};

export const extractToken = async (req: Request): Promise<JWT | null> => {
  const check = (req as RequestWithToken)?.[REQUEST_DECODED_TOKEN];
  if (check) {
    return check;
  }
  const sessionTokenKey = SessionTokenKey();
  try {
    const shh = env('AUTH_SECRET');
    const ret =
      (req as RequestWithToken)?.[REQUEST_DECODED_TOKEN] ??
      (await getToken({
        req: req,
        secret: shh,
        salt: sessionTokenKey,
      })) ??
      (await getToken({
        req: req,
        secret: shh,
        salt: `bearer-token`,
      }));
    if (ret && req) {
      (req as RequestWithToken)[REQUEST_DECODED_TOKEN] = ret;
    }
    return ret;
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'auth-utilities::extractToken',
    });
    return null;
  }
};

/**
 * Cache for JWKS remote key sets to avoid repeated fetches.
 * Keys: issuer URL
 * Values: jose RemoteJWKSet instances
 */
const jwksCache = new LRUCache<string, ReturnType<typeof createRemoteJWKSet>>({
  max: 10, // Most apps use 1-2 issuers
  ttl: 1000 * 60 * 60, // 1 hour - JWKS don't change often
});

/**
 * Decodes a JWT token with optional signature verification.
 *
 * @param options - Configuration options
 * @param options.token - The JWT token string to decode
 * @param options.verify - Whether to verify the token signature (default: false)
 * @param options.issuer - Optional issuer URL override. If not provided and verify=true,
 *                         uses AUTH_KEYCLOAK_ISSUER environment variable
 *
 * @returns The decoded JWT payload
 *
 * @throws {Error} If token is invalid, signature verification fails, or JWKS fetch fails
 *
 * @example
 * // Simple decode without verification
 * const payload = await decodeToken({ token: myToken, verify: false });
 *
 * @example
 * // Decode with signature verification using default issuer
 * const payload = await decodeToken({ token: myToken, verify: true });
 *
 * @example
 * // Decode with custom issuer
 * const payload = await decodeToken({
 *   token: myToken,
 *   verify: true,
 *   issuer: 'https://custom-auth.example.com/realms/my-realm'
 * });
 */
export const decodeToken = async ({
  token,
  verify = false,
  issuer,
}: {
  token: string;
  verify?: boolean;
  issuer?: string;
}): Promise<JWTPayload> => {
  // Simple decode without verification
  if (!verify) {
    return decodeJwt(token);
  }

  // Verification requires an issuer
  const issuerUrl = issuer || env('AUTH_KEYCLOAK_ISSUER');
  if (!issuerUrl) {
    throw new Error(
      'Issuer URL required for token verification. Provide issuer parameter or set AUTH_KEYCLOAK_ISSUER environment variable.',
    );
  }

  // Check cache for JWKS
  let jwks = jwksCache.get(issuerUrl);

  if (!jwks) {
    // Create JWKS endpoint URL
    // Keycloak format: {issuer}/protocol/openid-connect/certs
    const jwksUrl = new URL(issuerUrl);
    jwksUrl.pathname = `${jwksUrl.pathname.replace(/\/$/, '')}/protocol/openid-connect/certs`;

    // Create remote JWKS - jose will fetch and cache keys internally
    jwks = createRemoteJWKSet(jwksUrl);
    jwksCache.set(issuerUrl, jwks);
  }

  // Verify and decode the token
  const { payload } = await jwtVerify(token, jwks, {
    issuer: issuerUrl,
    // Add other validation options as needed:
    // audience: 'expected-audience',
    // algorithms: ['RS256'],
  });

  return payload;
};
