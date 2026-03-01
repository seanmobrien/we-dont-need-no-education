import type { IAfterManager, IAppStartupManager } from "@compliance-theater/types/after";
import type { IAccessTokenService, IAuthSessionService, IImpersonationService, ITokenExchangeService } from "@compliance-theater/types/lib/auth/services";
import type { IFetchService } from "@compliance-theater/types/lib/fetch";

export interface ServiceCradle extends Record<string | number | symbol, unknown> {
    'fetch-service': IFetchService;
    'auth-session-service': IAuthSessionService;
    'impersonation-service': IImpersonationService;
    'access-token-service': IAccessTokenService;
    'token-exchange-service': ITokenExchangeService;
    'app-startup': IAppStartupManager;
    'after': IAfterManager;
}

export const createMockServiceCradle = (): ServiceCradle =>
    new Proxy(
        {} as Record<keyof ServiceCradle, ServiceCradle[keyof ServiceCradle]>,
        {
            get: (_target, prop) => {
                if (typeof prop !== 'string') {
                    return undefined;
                }
                if (!_target[prop]) {
                    _target[prop] = jest.fn<ServiceCradle[typeof prop], []>()();
                }
                return _target[prop];
            },
        }
    ) as ServiceCradle;
