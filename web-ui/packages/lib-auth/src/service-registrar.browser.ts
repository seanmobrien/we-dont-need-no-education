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
} from '@compliance-theater/types';

import { session as sessionEdge } from './lib/session/session-edge';

const serverOnly = (serviceName: string): Error =>
    new Error(`${serviceName} is only available in the node runtime.`);

const unsupportedAsync = async <T>(serviceName: string): Promise<T> => {
    throw serverOnly(serviceName);
};

const unsupportedSync = <T>(serviceName: string): T => {
    throw serverOnly(serviceName);
};

export const authSessionService: IAuthSessionService = {
    sessionEdge,
    sessionNodejs: sessionEdge,
};

export const impersonationService: IImpersonationService = {
    forAdmin: () => unsupportedAsync('impersonation'),
    fromRequest: () => unsupportedAsync('impersonation'),
    fromUserId: () => unsupportedAsync('impersonation'),
};

export const accessTokenService: IAccessTokenService = {
    withRequestTokens: () => unsupportedSync('accessTokens'),
    withRequestAccessToken: () => unsupportedSync('accessTokens'),
    withRequestProviderAccountId: () => unsupportedSync('accessTokens'),
    getRequestTokens: () => unsupportedAsync('accessTokens'),
    getAccessToken: () => unsupportedAsync('accessTokens'),
    getProviderAccountId: () => unsupportedAsync('accessTokens'),
    getValidatedAccessToken: () => unsupportedAsync('accessTokens'),
    normalizedAccessToken: () => unsupportedAsync('accessTokens'),
    refreshAccessToken: () => unsupportedAsync('accessTokens'),
};

export const tokenExchangeService: ITokenExchangeService = {
    extractKeycloakToken: () => unsupportedAsync('exchangeTokens'),
    exchangeForGoogleTokens: () => unsupportedAsync('exchangeTokens'),
    getGoogleTokensFromRequest: () => unsupportedAsync('exchangeTokens'),
    getGoogleTokensFromKeycloak: () => unsupportedAsync('exchangeTokens'),
};

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
    }
}

export default ServiceRegistrar;