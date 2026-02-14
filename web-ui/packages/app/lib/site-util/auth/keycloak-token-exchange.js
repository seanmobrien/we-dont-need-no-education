import axios from 'axios';
import { getToken } from '@auth/core/jwt';
import { env } from '@compliance-theater/env';
import { SingletonProvider } from '@compliance-theater/typescript';
export class TokenExchangeError extends Error {
    code;
    status;
    originalError;
    constructor(message, code, status, originalError) {
        super(message);
        this.code = code;
        this.status = status;
        this.originalError = originalError;
        this.name = 'TokenExchangeError';
    }
}
export class KeycloakTokenExchange {
    config;
    tokenEndpoint;
    constructor(config) {
        this.config = {
            issuer: config?.issuer ?? env('AUTH_KEYCLOAK_ISSUER') ?? '',
            clientId: config?.clientId ?? env('AUTH_KEYCLOAK_CLIENT_ID') ?? '',
            clientSecret: config?.clientSecret ?? env('AUTH_KEYCLOAK_CLIENT_SECRET') ?? '',
        };
        this.validateConfig();
        this.tokenEndpoint = `${this.config.issuer.replace(/\/$/, '')}/protocol/openid-connect/token`;
    }
    validateConfig() {
        const missing = [];
        if (!this.config.issuer)
            missing.push('issuer');
        if (!this.config.clientId)
            missing.push('clientId');
        if (!this.config.clientSecret)
            missing.push('clientSecret');
        if (missing.length > 0) {
            throw new TokenExchangeError(`Missing required Keycloak configuration: ${missing.join(', ')}`, 'INVALID_CONFIG');
        }
    }
    async extractKeycloakToken(req) {
        try {
            const token = await getToken({
                req: req,
                secret: process.env.NEXTAUTH_SECRET,
            });
            if (!token) {
                throw new TokenExchangeError('No JWT token found in request', 'NO_JWT_TOKEN');
            }
            const keycloakToken = token.access_token;
            if (!keycloakToken || typeof keycloakToken !== 'string') {
                throw new TokenExchangeError('No Keycloak access token found in JWT', 'NO_KEYCLOAK_TOKEN');
            }
            return keycloakToken;
        }
        catch (error) {
            if (error instanceof TokenExchangeError) {
                throw error;
            }
            throw new TokenExchangeError('Failed to extract Keycloak token from request', 'TOKEN_EXTRACTION_FAILED', undefined, error);
        }
    }
    async exchangeForGoogleTokens(params) {
        const requestParams = new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            subject_token: params.subjectToken,
            subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
            requested_token_type: params.requestedTokenType ??
                'urn:ietf:params:oauth:token-type:refresh_token',
            audience: params.audience ?? 'google',
            ...(params.scope && { scope: params.scope }),
        });
        try {
            const response = await axios.post(this.tokenEndpoint, requestParams.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                timeout: 10000,
            });
            return this.extractGoogleTokens(response.data);
        }
        catch (error) {
            if (error instanceof TokenExchangeError) {
                throw error;
            }
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const errorData = error.response?.data;
                const errorMessage = errorData?.error_description || errorData?.error || error.message;
                throw new TokenExchangeError(`Keycloak token exchange failed: ${errorMessage}`, 'EXCHANGE_FAILED', status, error);
            }
            throw new TokenExchangeError('Unexpected error during token exchange', 'UNKNOWN_ERROR', undefined, error);
        }
    }
    extractGoogleTokens(response) {
        const { access_token, refresh_token } = response;
        if (!access_token || !refresh_token) {
            throw new TokenExchangeError('Invalid token response from Keycloak - missing Google tokens', 'INVALID_TOKEN_RESPONSE');
        }
        return {
            access_token,
            refresh_token,
        };
    }
    async getGoogleTokensFromRequest(req, audience) {
        const keycloakToken = await this.extractKeycloakToken(req);
        return this.exchangeForGoogleTokens({
            subjectToken: keycloakToken,
            audience,
        });
    }
}
export const keycloakTokenExchange = () => SingletonProvider.Instance.getRequired('@no-education/KeycloakTokenExchangeInstance', () => new KeycloakTokenExchange());
export const getGoogleTokensFromKeycloak = async (req) => {
    return keycloakTokenExchange().getGoogleTokensFromRequest(req);
};
//# sourceMappingURL=keycloak-token-exchange.js.map