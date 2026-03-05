import type { IAfterManager, IAppStartupManager, StartupAccessorCallbackRegistration } from "@compliance-theater/types/after";
import type { IAccessTokenService, IAuthSessionService, IImpersonationService, ITokenExchangeService } from "@compliance-theater/types/lib/auth/services";
import type { IFetchService } from "@compliance-theater/types/lib/fetch";
import { ISingletonProvider } from "@compliance-theater/types/lib/logger/singleton-provider";

//import { withJestTestExtensions } from './../../__tests__/shared/jest.test-extensions';

const withJestTestExtensions = () => {
    const EXTENSION_SYMBOL = Symbol.for('@compliance-theater/lib-auth/jest-test-extensions');
    const globalWithExtensions = globalThis as typeof globalThis & {
        [EXTENSION_SYMBOL]?: {
            mockServices: Record<string, unknown>;
            mockSingletons: Map<string | number | symbol, unknown>;
        };
    };
    if (!globalWithExtensions[EXTENSION_SYMBOL]) {
        globalWithExtensions[EXTENSION_SYMBOL] = {
            mockServices: {},
            mockSingletons: new Map<string | number | symbol, unknown>(),
        };
    }
    return globalWithExtensions[EXTENSION_SYMBOL]!;
};


export interface ServiceCradle extends Record<string | number | symbol, unknown> {
    fetch: IFetchService;
    session: IAuthSessionService;
    impersonation: IImpersonationService;
    accessTokens: IAccessTokenService;
    exchangeTokens: ITokenExchangeService;
    startup: IAppStartupManager;
    after: IAfterManager;
    singleton: ISingletonProvider;
}

const makeResponse = () =>
    Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        text: () => Promise.resolve('{ "status": "ok" }'),
        json: () => Promise.resolve({ status: 'ok' }),
        body: Buffer.from('{ "status": "ok" }'),
    } as unknown as ReturnType<IFetchService['fetch']>);


const mockFetchServiceFactory = (): IFetchService => ({
    fetch: jest.fn(() => makeResponse()),
});
const mockAuthSessionServiceFactory = (): IAuthSessionService => ({
    sessionNodejs: jest.fn(async () => ({} as Parameters<IAuthSessionService['sessionNodejs']>[0]['session'])),
    sessionEdge: jest.fn(async () => ({} as Parameters<IAuthSessionService['sessionEdge']>[0]['session'])),
});
const mockImpersonationServiceFactory = (): IImpersonationService => ({
    fromRequest: jest.fn(async () => undefined),
    fromUserId: jest.fn(async () => undefined),
    forAdmin: jest.fn(async () => undefined),
});
const mockAccessTokenServiceFactory = (): IAccessTokenService => ({
    withRequestTokens: jest.fn((_req, value) => value),
    withRequestAccessToken: jest.fn((req, value) => value?.access_token ?? req),
    withRequestProviderAccountId: jest.fn(() => undefined),
    getRequestTokens: jest.fn(async () => undefined),
    getAccessToken: jest.fn(async () => undefined),
    getProviderAccountId: jest.fn(async () => undefined),
    getValidatedAccessToken: jest.fn(async () => ({ token: 'mock-access-token' })),
    normalizedAccessToken: jest.fn(async () => undefined),
    refreshAccessToken: jest.fn(async (token) => token),
});
const mockTokenExchangeServiceFactory = (): ITokenExchangeService => ({
    extractKeycloakToken: jest.fn(async () => 'mock-keycloak-token'),
    exchangeForGoogleTokens: jest.fn(async () => ({
        access_token: 'mock-google-access-token',
        refresh_token: 'mock-google-refresh-token',
    })),
    getGoogleTokensFromRequest: jest.fn(async () => ({
        access_token: 'mock-google-access-token',
        refresh_token: 'mock-google-refresh-token',
    })),
    getGoogleTokensFromKeycloak: jest.fn(async () => ({
        access_token: 'mock-google-access-token',
        refresh_token: 'mock-google-refresh-token',
    })),
});
const mockAppStartupManagerFactory = (): IAppStartupManager => ({
    getStartupState: jest.fn(() => Promise.resolve('ready')),
    registerStartupAccessorCallback: jest.fn((
        _registerAccessor: StartupAccessorCallbackRegistration,
    ) => { }),
});
const mockAfterManagerFactory = (): IAfterManager => ({
    add: jest.fn(() => true),
    remove: jest.fn(() => true),
    queue: jest.fn((queueName: string, create?: boolean) => []),
    signal: jest.fn((signalName: string) => Promise.resolve()),
});

const mockSingletonProviderFactory = (): ISingletonProvider => {

    const map = (
        key?: string | number | symbol,
        value?: unknown,
    ): Map<string | number | symbol, unknown> | unknown | undefined => {
        const actual = withJestTestExtensions().mockSingletons;
        if (typeof key === 'undefined') {
            return actual;
        }
        if (typeof value === 'undefined') {
            return actual.get(key);
        }
        actual.set(key, value);
    };

    const getOrCreate = <T, S extends string | symbol = string>(
        symbol: S,
        factory: () => T | undefined,
        _config?: unknown
    ): T | undefined => {
        let value = map(symbol) as T | undefined;
        if (typeof value === 'undefined') {
            value = factory();
            if (typeof value !== 'undefined') {
                map(symbol, value);
            }
        }
        return value as T;
    };

    const provider = {
        get: jest.fn(<T = any, S extends string | symbol = string>(symbol: S): T | undefined => map(symbol) as T | undefined),
        getOrCreate: jest.fn(getOrCreate),
        getRequired: jest.fn(<T, S extends string | symbol = string>(
            symbol: S,
            factory: () => T | undefined,
            config?: unknown
        ) => {
            const ret = getOrCreate(symbol, factory, config);
            if (!ret) throw new Error(`Factory for required service ${String(symbol)} returned undefined`);
            return ret;
        }),
        getOrCreateAsync: jest.fn(async <T, S extends string | symbol = string>(
            symbol: S,
            factory: () => Promise<T | undefined>,
            config?: unknown
        ) => {
            return await getOrCreate(symbol, factory, config);
        }),
        getRequiredAsync: jest.fn(async <T, S extends string | symbol = string>(
            symbol: S,
            factory: () => Promise<T | undefined>,
            config?: unknown
        ) => {
            const ret = await getOrCreate(symbol, factory, config);
            if (!ret) throw new Error(`Factory for required service ${String(symbol)} returned undefined`);
            return ret;
        }),
        has: jest.fn(<S extends string | symbol = string>(symbol: S) => (map() as Map<S, unknown>).has(symbol)),
        set: jest.fn(<T, S extends string | symbol = string>(
            symbol: S,
            value: T,
            config?: unknown
        ) => {
            map(symbol, value);
        }),
        clear: jest.fn(() => {
            (map() as Map<string | number | symbol, unknown>).clear();
        }),
        delete: jest.fn(<S>(symbol: S) => {
            (map() as Map<S, unknown>).delete(symbol);
        }),
    } satisfies ISingletonProvider;
    return provider;
};

const ServiceFactoryMap: Record<string, () => unknown> = {
    fetch: mockFetchServiceFactory,
    session: mockAuthSessionServiceFactory,
    impersonation: mockImpersonationServiceFactory,
    accessTokens: mockAccessTokenServiceFactory,
    exchangeTokens: mockTokenExchangeServiceFactory,
    startup: mockAppStartupManagerFactory,
    after: mockAfterManagerFactory,
    singleton: mockSingletonProviderFactory
};


const getOrCreateMockService = (serviceName: string): unknown => {
    const testState = withJestTestExtensions();
    if (!testState.mockServices) {
        testState.mockServices = {};
    }
    if (!testState.mockServices[serviceName]) {
        const factory = ServiceFactoryMap[serviceName];
        if (factory) {
            testState.mockServices[serviceName] = factory();
        } else {
            console.log('WARNING: no default factory for service', serviceName);
            testState.mockServices[serviceName] = {};
        }
    }
    return testState.mockServices[serviceName];
};

export const createMockServiceCradle = (): ServiceCradle =>
    new Proxy(
        {} as Record<keyof ServiceCradle, ServiceCradle[keyof ServiceCradle]>,
        {
            get: (_target, prop) => {
                if (typeof prop !== 'string') {
                    return undefined;
                }
                if (!_target[prop]) {
                    _target[prop] = getOrCreateMockService(prop);
                }
                return _target[prop];
            },
        }
    ) as ServiceCradle;
