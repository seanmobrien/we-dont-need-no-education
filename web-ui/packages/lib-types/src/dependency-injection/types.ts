import type {
    AwilixContainer,
    Resolver,
    ResolveOptions,
    LifetimeType,
} from 'awilix';
import type { IFetchService } from '../lib/fetch';
import type {
    IAccessTokenService,
    IAuthSessionService,
    IImpersonationService,
    ITokenExchangeService,
} from '../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServiceCradle extends Record<string, unknown> {
    'fetch-service': IFetchService;
    'auth-session-service': IAuthSessionService;
    'impersonation-service': IImpersonationService;
    'access-token-service': IAccessTokenService;
    'token-exchange-service': ITokenExchangeService;
}

export type ServiceRegistrationOptions = {
    lifetime?: LifetimeType;
};

export type ServiceResolver<T = unknown> = Resolver<T>;

export type ServiceResolveOptions = ResolveOptions;

export interface IServiceContainer {
    resolve<K extends keyof ServiceCradle>(
        name: K,
        options?: ServiceResolveOptions
    ): ServiceCradle[K];

    has(name: string): boolean;

    register(
        registrations: Record<string, ServiceResolver>
    ): void;

    register(name: string, resolver: ServiceResolver): void;

    createScope(): IServiceContainer;

    dispose(): Promise<void>;

    readonly container: AwilixContainer<ServiceCradle>;
}
