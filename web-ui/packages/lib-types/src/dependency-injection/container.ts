import type { AwilixContainer, Resolver } from 'awilix';
import type {
    IServiceContainer,
    ServiceCradle,
    ServiceResolver,
    ServiceResolveOptions,
} from './types';

const CONTAINER_SYMBOL = Symbol.for(
    '@compliance-theater/types/dependency-injection/container'
);

type GlobalWithContainer = typeof globalThis & {
    [CONTAINER_SYMBOL]?: IServiceContainer;
};

const BROWSER_RESOLVER_SYMBOL = Symbol.for(
    '@compliance-theater/types/dependency-injection/browser-resolver'
);

type BrowserLifetime = 'SINGLETON' | 'SCOPED' | 'TRANSIENT';

type BrowserResolverKind = 'value' | 'class' | 'function';

type BrowserResolverRecord = {
    [BROWSER_RESOLVER_SYMBOL]: true;
    kind: BrowserResolverKind;
    value?: unknown;
    ctor?: new (...args: unknown[]) => unknown;
    factory?: (cradle: ServiceCradle) => unknown;
    lifetime: BrowserLifetime;
    setLifetime: (lifetime: unknown) => BrowserResolverRecord;
    singleton: () => BrowserResolverRecord;
    scoped: () => BrowserResolverRecord;
    transient: () => BrowserResolverRecord;
    inject: (_injector: unknown) => BrowserResolverRecord;
};

type AwilixRuntime = {
    createContainer: <T extends object>(options?: {
        injectionMode?: unknown;
        strict?: boolean;
    }) => AwilixContainer<T>;
    asClass: (...args: unknown[]) => unknown;
    asFunction: (...args: unknown[]) => unknown;
    asValue: (...args: unknown[]) => unknown;
    InjectionMode: {
        CLASSIC: unknown;
    };
};

const isBrowserRuntime = (): boolean => typeof window !== 'undefined';

const isEdgeRuntime = (): boolean =>
    (process?.env?.NEXT_RUNTIME ?? '').toLowerCase() === 'edge';

const isServerRuntime = (): boolean =>
    !isBrowserRuntime() &&
    !isEdgeRuntime() &&
    ((process?.env?.NEXT_RUNTIME ?? '').toLowerCase() === 'nodejs' ||
        typeof process?.versions?.node === 'string');

const getNodeRequire = (): ((id: string) => unknown) | undefined => {
    if (!isServerRuntime()) {
        return undefined;
    }
    if (typeof require === 'function') {
        return require;
    }
    return undefined;
};

const loadAwilix = (): AwilixRuntime => {
    const nodeRequire = getNodeRequire();
    if (!nodeRequire) {
        throw new Error(
            'Awilix can only be loaded in a Node.js server runtime.'
        );
    }
    return nodeRequire('awilix') as AwilixRuntime;
};

const createNoopResolver = <T>(): ServiceResolver<T> => {
    const resolver = {
        [BROWSER_RESOLVER_SYMBOL]: true as const,
        kind: 'value' as const,
        value: undefined,
        lifetime: 'TRANSIENT' as BrowserLifetime,
        setLifetime: (lifetime: unknown) => {
            const normalized = String(lifetime).toUpperCase();
            if (
                normalized === 'SINGLETON' ||
                normalized === 'SCOPED' ||
                normalized === 'TRANSIENT'
            ) {
                resolver.lifetime = normalized;
            }
            return resolver;
        },
        singleton: () => resolver.setLifetime('SINGLETON'),
        scoped: () => resolver.setLifetime('SCOPED'),
        transient: () => resolver.setLifetime('TRANSIENT'),
        inject: () => resolver,
    };
    return resolver as unknown as ServiceResolver<T>;
};

const toBrowserResolver = (
    resolver: ServiceResolver
): BrowserResolverRecord | undefined => {
    if (
        resolver &&
        typeof resolver === 'object' &&
        (resolver as Record<PropertyKey, unknown>)[BROWSER_RESOLVER_SYMBOL] === true
    ) {
        return resolver as unknown as BrowserResolverRecord;
    }
    return undefined;
};

class BrowserServiceContainer implements IServiceContainer {
    readonly #registrations = new Map<string, BrowserResolverRecord>();
    readonly #singletonCache: Map<string, unknown>;
    readonly #scopedCache = new Map<string, unknown>();
    readonly #parent?: BrowserServiceContainer;

    constructor(
        parent?: BrowserServiceContainer,
        singletonCache?: Map<string, unknown>
    ) {
        this.#parent = parent;
        this.#singletonCache = singletonCache ?? new Map<string, unknown>();
    }

    get container(): AwilixContainer<ServiceCradle> {
        return {} as AwilixContainer<ServiceCradle>;
    }

    resolve<K extends keyof ServiceCradle>(
        name: K,
        _options?: ServiceResolveOptions
    ): ServiceCradle[K] {
        const registration = this.#getRegistration(name as string);
        if (!registration) {
            throw new Error(
                `ServiceContainer.resolve: service "${String(name)}" is not registered.`
            );
        }

        const cacheKey = String(name);

        if (registration.lifetime === 'SINGLETON') {
            if (!this.#singletonCache.has(cacheKey)) {
                this.#singletonCache.set(
                    cacheKey,
                    this.#materialize(registration)
                );
            }
            return this.#singletonCache.get(cacheKey) as ServiceCradle[K];
        }

        if (registration.lifetime === 'SCOPED') {
            if (!this.#scopedCache.has(cacheKey)) {
                this.#scopedCache.set(cacheKey, this.#materialize(registration));
            }
            return this.#scopedCache.get(cacheKey) as ServiceCradle[K];
        }

        return this.#materialize(registration) as ServiceCradle[K];
    }

    #getRegistration(name: string): BrowserResolverRecord | undefined {
        if (this.#registrations.has(name)) {
            return this.#registrations.get(name);
        }
        if (!this.#parent) {
            return undefined;
        }
        return this.#parent.#getRegistration(name);
    }

    #materialize(registration: BrowserResolverRecord): unknown {
        if (registration.kind === 'value') {
            return registration.value;
        }

        if (registration.kind === 'class') {
            return new (registration.ctor as new (...args: unknown[]) => unknown)(
                this.#createCradle()
            );
        }

        return registration.factory?.(this.#createCradle());
    }

    #createCradle(): ServiceCradle {
        return new Proxy(
            {},
            {
                get: (_target, prop) => {
                    if (typeof prop !== 'string') {
                        return undefined;
                    }
                    return this.resolve(prop as keyof ServiceCradle);
                },
            }
        ) as ServiceCradle;
    }

    has(name: string): boolean {
        return !!this.#getRegistration(name);
    }

    register(
        nameOrRegistrations: string | Record<string, ServiceResolver>,
        resolver?: ServiceResolver
    ): void {
        if (typeof nameOrRegistrations === 'string') {
            if (!resolver) {
                throw new TypeError(
                    `ServiceContainer.register: resolver is required when registering by name ("${nameOrRegistrations}").`
                );
            }
            const browserResolver = toBrowserResolver(resolver);
            if (!browserResolver) {
                throw new TypeError(
                    `ServiceContainer.register: unsupported resolver for "${nameOrRegistrations}" in browser/edge runtime. Use asValue/asClass/asFunction from this module.`
                );
            }
            this.#registrations.set(nameOrRegistrations, browserResolver);
            return;
        }

        for (const [name, nextResolver] of Object.entries(nameOrRegistrations)) {
            this.register(name, nextResolver);
        }
    }

    createScope(): IServiceContainer {
        return new BrowserServiceContainer(this, this.#singletonCache);
    }

    async dispose(): Promise<void> {
        this.#registrations.clear();
        this.#scopedCache.clear();
    }
}

export class ServiceContainer implements IServiceContainer {
    readonly #container: AwilixContainer<ServiceCradle>;

    private constructor(container: AwilixContainer<ServiceCradle>) {
        this.#container = container;
    }

    static get Root(): IServiceContainer {
        const g = globalThis as GlobalWithContainer;
        if (!g[CONTAINER_SYMBOL]) {
            if (!isServerRuntime()) {
                g[CONTAINER_SYMBOL] = new BrowserServiceContainer();
            } else {
                const awilix = loadAwilix();
                const awilixContainer = awilix.createContainer<ServiceCradle>({
                    injectionMode: awilix.InjectionMode.CLASSIC,
                    strict: true,
                });
                g[CONTAINER_SYMBOL] = new ServiceContainer(awilixContainer);
            }
        }
        return g[CONTAINER_SYMBOL]!;
    }

    get container(): AwilixContainer<ServiceCradle> {
        return this.#container;
    }

    resolve<K extends keyof ServiceCradle>(
        name: K,
        options?: ServiceResolveOptions
    ): ServiceCradle[K] {
        return this.#container.resolve(name as string, options) as ServiceCradle[K];
    }

    has(name: string): boolean {
        return this.#container.hasRegistration(name);
    }

    register(
        nameOrRegistrations: string | Record<string, ServiceResolver>,
        resolver?: ServiceResolver
    ): void {
        if (typeof nameOrRegistrations === 'string') {
            if (!resolver) {
                throw new TypeError(
                    `ServiceContainer.register: resolver is required when registering by name ("${nameOrRegistrations}").`
                );
            }
            this.#container.register(
                nameOrRegistrations,
                resolver as Resolver<unknown>
            );
        } else {
            this.#container.register(
                nameOrRegistrations as Record<string, Resolver<unknown>>
            );
        }
    }

    createScope(): IServiceContainer {
        const scoped = this.#container.createScope();
        return new ServiceContainer(scoped as AwilixContainer<ServiceCradle>);
    }

    async dispose(): Promise<void> {
        await this.#container.dispose();
    }
}

export const getServiceContainer = (): IServiceContainer =>
    ServiceContainer.Root;

export const registerServices = (
    registrations: Record<string, ServiceResolver>
): void => {
    ServiceContainer.Root.register(registrations);
};

export const resolveService = <K extends keyof ServiceCradle>(
    name: K
): ServiceCradle[K] => ServiceContainer.Root.resolve(name);

export const asClass = <T>(...args: unknown[]): ServiceResolver<T> => {
    if (!isServerRuntime()) {
        const resolver = createNoopResolver<T>() as unknown as BrowserResolverRecord;
        resolver.kind = 'class';
        resolver.ctor = args[0] as new (...args: unknown[]) => T;
        resolver.value = undefined;
        return resolver as unknown as ServiceResolver<T>;
    }
    return loadAwilix().asClass(...args) as ServiceResolver<T>;
};

export const asFunction = <T>(...args: unknown[]): ServiceResolver<T> => {
    if (!isServerRuntime()) {
        const resolver = createNoopResolver<T>() as unknown as BrowserResolverRecord;
        resolver.kind = 'function';
        resolver.factory = args[0] as (cradle: ServiceCradle) => T;
        resolver.value = undefined;
        return resolver as unknown as ServiceResolver<T>;
    }
    return loadAwilix().asFunction(...args) as ServiceResolver<T>;
};

export const asValue = <T>(...args: unknown[]): ServiceResolver<T> => {
    if (!isServerRuntime()) {
        const resolver = createNoopResolver<T>() as unknown as BrowserResolverRecord;
        resolver.kind = 'value';
        resolver.value = args[0] as T;
        return resolver as unknown as ServiceResolver<T>;
    }
    return loadAwilix().asValue(...args) as ServiceResolver<T>;
};

export const Lifetime = {
    SINGLETON: 'SINGLETON',
    SCOPED: 'SCOPED',
    TRANSIENT: 'TRANSIENT',
} as const;

export const InjectionMode = {
    PROXY: 'PROXY',
    CLASSIC: 'CLASSIC',
} as const;
