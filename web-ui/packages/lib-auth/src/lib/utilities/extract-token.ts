/* global Request, console, URL */

import { getToken, type JWT } from '@compliance-theater/types/next-auth/jwt';
import { env } from '@compliance-theater/env';

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
type RequestWithToken = RequestHeadersOnly & {
    [REQUEST_DECODED_TOKEN]?: JWT;
};

export const SessionTokenKey = (): string => {
    const url = new URL(env('NEXT_PUBLIC_HOSTNAME'));
    return (
        (url.protocol === 'https:' ? '__Secure-' : '') + 'authjs.session-token'
    );
};

export const extractToken = async (req: RequestHeadersOnly): Promise<JWT | null> => {
    const check = (req as RequestWithToken)?.[REQUEST_DECODED_TOKEN];
    if (check) {
        return check;
    }
    const sessionTokenKey = SessionTokenKey();
    try {
        const shh = env('AUTH_SECRET');
        const ret =
            check ??
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
            const LoggedError = await import('@compliance-theater/logger').then((m) => m.LoggedError);
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
