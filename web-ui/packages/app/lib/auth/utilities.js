import { getToken } from '@auth/core/jwt';
import { decodeJwt, jwtVerify, createRemoteJWKSet, } from 'jose';
import { LRUCache } from 'lru-cache';
import { env } from '@compliance-theater/env';
export const KnownScopeValues = ['mcp-tool:read', 'mcp-tool:write'];
export const KnownScopeIndex = {
    ToolRead: 0,
    ToolReadWrite: 1,
};
const REQUEST_DECODED_TOKEN = Symbol.for('@/no-education/api/auth/decoded-token');
export const SessionTokenKey = () => {
    const url = new URL(env('NEXT_PUBLIC_HOSTNAME'));
    return ((url.protocol === 'https:' ? '__Secure-' : '') + 'authjs.session-token');
};
export const extractToken = async (req) => {
    const check = req?.[REQUEST_DECODED_TOKEN];
    if (check) {
        return check;
    }
    const sessionTokenKey = SessionTokenKey();
    try {
        const shh = env('AUTH_SECRET');
        const ret = req?.[REQUEST_DECODED_TOKEN] ??
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
            req[REQUEST_DECODED_TOKEN] = ret;
        }
        return ret;
    }
    catch (error) {
        try {
            const LoggedError = await import('@compliance-theater/logger').then((m) => m.LoggedError);
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'auth-utilities::extractToken',
            });
        }
        catch (e) {
            console.info(e);
        }
        return null;
    }
};
const jwksCache = new LRUCache({
    max: 5,
    ttl: 1000 * 60 * 60,
});
export const decodeToken = async (props) => {
    if (typeof props === 'string') {
        return await decodeToken({ token: props });
    }
    const { token, verify = false, issuer = env('AUTH_KEYCLOAK_ISSUER'), } = props;
    if (!verify) {
        return decodeJwt(token);
    }
    const issuerUrl = issuer;
    if (!issuerUrl) {
        throw new Error('Issuer URL required for token verification. Provide issuer parameter or set AUTH_KEYCLOAK_ISSUER environment variable.');
    }
    let jwks = jwksCache.get(issuerUrl);
    if (!jwks) {
        const jwksUrl = new URL(issuerUrl);
        jwksUrl.pathname = `${jwksUrl.pathname.replace(/\/$/, '')}/protocol/openid-connect/certs`;
        jwks = createRemoteJWKSet(jwksUrl);
        jwksCache.set(issuerUrl, jwks);
    }
    const { payload } = await jwtVerify(token, jwks, {
        issuer: issuerUrl,
    });
    return payload;
};
//# sourceMappingURL=utilities.js.map