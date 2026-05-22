import { getToken } from '@compliance-theater/auth-compat/runtime';
import type { JWT } from '@compliance-theater/auth-compat';
import { env } from '@compliance-theater/env';
import { createCachedModuleLoader } from '../runtime-loader';
import { decodeToken } from './decode-token';

export const KnownScopeValues = ['mcp-tool:read', 'mcp-tool:write'] as const;
export type KnownScope = (typeof KnownScopeValues)[number];
export const KnownScopeIndex = {
    ToolRead: 0,
    ToolReadWrite: 1,
} as const;
/**
 * Simplified request type supporting only the properties needed for token extraction.
 */
type RequestHeadersOnly = Request | {
    headers: Headers | Record<string, string>
};
const REQUEST_DECODED_TOKEN: unique symbol = Symbol.for(
    '@/no-education/api/auth/decoded-token',
);
const REQUEST_TOKEN_DETAILS: unique symbol = Symbol.for(
    '@/no-education/api/auth/token-details',
);

export type ExtractedRequestToken = {
    source: 'verified-bearer' | 'authjs' | 'none';
    token: JWT | null;
    bearerToken?: string;
    verifiedBearerToken?: string;
};

type RequestWithToken = RequestHeadersOnly & {
    [REQUEST_DECODED_TOKEN]?: JWT;
    [REQUEST_TOKEN_DETAILS]?: ExtractedRequestToken;
};

const loadLoggerModule = createCachedModuleLoader(() =>
    import('@compliance-theater/logger')
);

export const SessionTokenKey = (): string => {
    const url = new URL(env('NEXT_PUBLIC_HOSTNAME'));
    return (
        (url.protocol === 'https:' ? '__Secure-' : '') + 'authjs.session-token'
    );
};

const getHeader = (
    headers: Headers | Record<string, string>,
    name: string,
): string | undefined => {
    if (headers instanceof Headers) {
        return headers.get(name) ?? undefined;
    }

    const lowerCaseName = name.toLowerCase();
    return Object.entries(headers).find(
        ([key]) => key.toLowerCase() === lowerCaseName,
    )?.[1];
};

const extractAuthorizationBearerToken = (
    req: RequestHeadersOnly,
): string | undefined => {
    const authorizationHeader = getHeader(req.headers, 'authorization')?.trim();
    if (!authorizationHeader) {
        return undefined;
    }

    const [scheme, token] = authorizationHeader.split(/\s+/, 2);
    if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
        return undefined;
    }

    return token;
};

export const extractTokenDetails = async (
    req: RequestHeadersOnly,
): Promise<ExtractedRequestToken> => {
    const cachedToken = (req as RequestWithToken)?.[REQUEST_DECODED_TOKEN];
    const cachedDetails = (req as RequestWithToken)?.[REQUEST_TOKEN_DETAILS];
    if (cachedDetails) {
        return cachedDetails;
    }
    if (cachedToken) {
        const details = {
            source: 'authjs',
            token: cachedToken,
        } as const;
        (req as RequestWithToken)[REQUEST_TOKEN_DETAILS] = details;
        return details;
    }

    const sessionTokenKey = SessionTokenKey();
    try {
        const bearerToken = extractAuthorizationBearerToken(req);
        if (bearerToken) {
            try {
                const verifiedBearerToken = await decodeToken({
                    token: bearerToken,
                    verify: true,
                });
                if (req) {
                    (req as RequestWithToken)[REQUEST_DECODED_TOKEN] =
                        verifiedBearerToken as JWT;
                    (req as RequestWithToken)[REQUEST_TOKEN_DETAILS] = {
                        source: 'verified-bearer',
                        token: verifiedBearerToken as JWT,
                        bearerToken,
                        verifiedBearerToken: bearerToken,
                    };
                }
                return {
                    source: 'verified-bearer',
                    token: verifiedBearerToken as JWT,
                    bearerToken,
                    verifiedBearerToken: bearerToken,
                };
            } catch {
                // Fall through to Auth.js token parsing to preserve support for
                // app-issued bearer/session tokens alongside external OIDC tokens.
            }
        }

        const shh = env('AUTH_SECRET');
        const ret =
            (await getToken({
                req: req as Request,
                secret: shh,
                salt: sessionTokenKey,
            })) ??
            (await getToken({
                req: req as Request,
                secret: shh,
                salt: `bearer-token`,
            }));
        if (ret && req) {
            (req as RequestWithToken)[REQUEST_DECODED_TOKEN] = ret as JWT;
            (req as RequestWithToken)[REQUEST_TOKEN_DETAILS] = {
                source: 'authjs',
                token: ret as JWT,
                bearerToken,
            };
        }
        return ret
            ? {
                source: 'authjs',
                token: ret as JWT,
                bearerToken,
            }
            : {
                source: 'none',
                token: null,
                bearerToken,
            };
    } catch (error) {
        try {
            // Delay-load loggederror to prevent circular dependency
            const { LoggedError } = await loadLoggerModule();
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'auth-utilities::extractToken',
            });
        } catch (e) {
            // Suppress / console-log only error-within-an-error
            console.info(e);
        }

        return {
            source: 'none',
            token: null,
        };
    }
};

export const extractToken = async (req: RequestHeadersOnly): Promise<JWT | null> => {
    const details = await extractTokenDetails(req);
    return details.token;
};