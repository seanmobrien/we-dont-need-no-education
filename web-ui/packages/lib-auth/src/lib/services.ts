import {
    asValue,
    registerServices,
} from '@compliance-theater/types/dependency-injection';
import type {
    IAccessTokenService,
    IAuthSessionService,
    IImpersonationService,
    ITokenExchangeService,
} from '@compliance-theater/types';
import { session as sessionEdge } from './session/session-edge';
import { session as sessionNodejs } from './session/session-nodejs';
import {
    getAccessToken,
    getProviderAccountId,
    getRequestTokens,
    getValidatedAccessToken,
    normalizedAccessToken,
    withRequestAccessToken,
    withRequestProviderAccountId,
    withRequestTokens,
} from './access-token';
import { refreshAccessToken } from './refresh-token';
import {
    forAdmin,
    fromRequest,
    fromUserId,
} from './impersonation/impersonation-factory';
import {
    getGoogleTokensFromKeycloak,
    keycloakTokenExchange,
} from './utilities/keycloak-token-exchange';
import type { NextApiRequest } from 'next';
import { NextRequest } from 'next/server';

export const authSessionService: IAuthSessionService = {
    sessionEdge,
    sessionNodejs,
};

export const impersonationService: IImpersonationService = {
    forAdmin,
    fromRequest,
    fromUserId,
};

export const accessTokenService: IAccessTokenService = {
    getAccessToken,
    getProviderAccountId,
    getRequestTokens,
    getValidatedAccessToken,
    normalizedAccessToken,
    refreshAccessToken,
    withRequestAccessToken: (req, value) =>
        withRequestAccessToken(req, value as never),
    withRequestProviderAccountId,
    withRequestTokens,
};

export const tokenExchangeService: ITokenExchangeService = {
    extractKeycloakToken: async (req) =>
        keycloakTokenExchange().extractKeycloakToken(
            req as NextRequest | NextApiRequest,
        ),
    exchangeForGoogleTokens: async (params) =>
        keycloakTokenExchange().exchangeForGoogleTokens(params),
    getGoogleTokensFromRequest: async (req, audience) =>
        keycloakTokenExchange().getGoogleTokensFromRequest(
            req as NextRequest | NextApiRequest,
            audience,
        ),
    getGoogleTokensFromKeycloak: async (req) =>
        getGoogleTokensFromKeycloak(req as NextRequest | NextApiRequest),
};

registerServices({
    'auth-session-service': asValue(authSessionService),
    'impersonation-service': asValue(impersonationService),
    'access-token-service': asValue(accessTokenService),
    'token-exchange-service': asValue(tokenExchangeService),
});
