import {
    decodeJwt,
    jwtVerify,
    createRemoteJWKSet,
    type JWTPayload,
} from 'jose';
import { env } from '@compliance-theater/env';
import { LRUCache } from 'lru-cache';


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
        issuer = process.env.AUTH_KEYCLOAK_ISSUER || env('AUTH_KEYCLOAK_ISSUER'),
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
