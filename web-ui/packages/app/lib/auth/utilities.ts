import { getToken, type JWT } from '@auth/core/jwt';
import {
  decodeJwt,
  jwtVerify,
  createRemoteJWKSet,
  type JWTPayload,
} from 'jose';
import { LRUCache } from 'lru-cache';
import { env } from '@repo/lib-site-util-env';

export const KnownScopeValues = ['mcp-tool:read', 'mcp-tool:write'] as const;
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
    try {
      // Delay-load loggederror to prevent circular dependency
      const LoggedError = await import('@/lib/react-util/errors/logged-error').then((m) => m.LoggedError);
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'auth-utilities::extractToken',
      });
    } catch (e) {
      // Suppress / console-log only error-within-an-error
      console.info(e);
    }

    return null;
  }
};


const jwksCache = new LRUCache<string, ReturnType<typeof createRemoteJWKSet>>({
  max: 5, // Most apps use 1-2 issuers
  ttl: 1000 * 60 * 60, // 1 hour - JWKS don't change often
});

export const decodeToken = async (props: {
  token: string;
  verify?: boolean;
  issuer?: string;
} | string): Promise<JWTPayload> => {
  if (typeof props === 'string') {
    // If we were only passed a token then loop-back with proper arguments
    return await decodeToken({ token: props });
  }
  const {
    token,
    verify = false,
    issuer = env('AUTH_KEYCLOAK_ISSUER'),
  } = props;
  // Simple decode without verification
  if (!verify) {
    return decodeJwt(token);
  }

  // Verification requires an issuer
  const issuerUrl = issuer;
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
