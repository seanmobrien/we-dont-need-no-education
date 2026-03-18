import {
    IServiceRegistrar,
    type IServiceContainer,
    asValue,
} from '@compliance-theater/types/dependency-injection';
import type {
    IAccessTokenService,
    IAuthSessionService,
    IImpersonationService,
    ITokenExchangeService,
    IUserSigningKeysService,
} from '@compliance-theater/types';

import { session as sessionEdge } from './lib/session/session-edge';
import { session as sessionNodejs } from './lib/session/session-nodejs';
import {
    getAccessToken,
    getProviderAccountId,
    getRequestTokens,
    getValidatedAccessToken,
    normalizedAccessToken,
    withRequestAccessToken,
    withRequestProviderAccountId,
    withRequestTokens,
} from './lib/access-token';
import { refreshAccessToken } from './lib/refresh-token';
import {
    forAdmin,
    fromRequest,
    fromUserId,
} from './lib/impersonation/impersonation-factory';
import {
    getGoogleTokensFromKeycloak,
    keycloakTokenExchange,
} from './lib/utilities/keycloak-token-exchange';
import { userSigningKeysService } from './lib/server/user-signing-keys-service';
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

export const signingKeysService: IUserSigningKeysService = userSigningKeysService;

export class ServiceRegistrar implements IServiceRegistrar {
    register(container: IServiceContainer): void {
        if (!container.has('session')) {
            container.register('session', asValue(authSessionService));
        }
        if (!container.has('impersonation')) {
            container.register('impersonation', asValue(impersonationService));
        }
        if (!container.has('accessTokens')) {
            container.register('accessTokens', asValue(accessTokenService));
        }
        if (!container.has('exchangeTokens')) {
            container.register('exchangeTokens', asValue(tokenExchangeService));
        }
        if (!container.has('userSigningKeys')) {
            container.register('userSigningKeys', asValue(signingKeysService));
        }
    }
}

export default ServiceRegistrar;