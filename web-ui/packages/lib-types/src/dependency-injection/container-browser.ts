import type {
    IServiceContainer,
    ServiceResolveOptions,
    ServiceResolver,
    BrowserResolverRecord,
    BrowserLifetime,
} from './types';
import { ServiceCradle } from './service-cradle';

const BROWSER_RESOLVER_SYMBOL = Symbol.for(
    '@compliance-theater/types/dependency-injection/browser-resolver'
);

export const isBrowserResolver = (
    resolver: unknown
): resolver is (ServiceResolver & BrowserResolverRecord) => (
    !!resolver &&
    typeof resolver === 'object' &&
    BROWSER_RESOLVER_SYMBOL in resolver &&
    resolver[BROWSER_RESOLVER_SYMBOL] === true
);


const createBrowserResolver = <T = unknown>({
    matches,
    resolve
}: {
    matches: ((x: BrowserResolverRecord<T>) => boolean);
    resolve: (<TCradle extends Record<string | symbol | number, unknown>>(container: TCradle) => T);
}): BrowserResolverRecord<T> => {
    const resolver = {
        resolve,
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
        is: (check: unknown): boolean =>
            isBrowserResolver(check) && matches(check as BrowserResolverRecord<T>),
    };
    return resolver;
};

export const asClass = <T>(...args: unknown[]): ServiceResolver<T> => {
    const ctor = (args[0] as new (...args: unknown[]) => T);
    const resolver = createBrowserResolver<T>({
        matches: _c => _c.tag === ctor,
        resolve: c => new ctor()
    });
    resolver.kind = 'class';
    resolver.tag = ctor;
    return resolver;
};

export const asFunction = <T>(...args: unknown[]): ServiceResolver<T> => {
    const resolve = args[0] as <TCradle extends Record<string | symbol | number, unknown>>(cradle: TCradle) => T;
    const resolver = createBrowserResolver<T>({
        matches: _c => _c.tag === resolve,
        resolve
    });
    resolver.kind = 'function';
    return resolver;
};

export const asValue = <T>(...args: unknown[]): ServiceResolver<T> => {
    const value = args[0] as T;
    const resolver = createBrowserResolver({
        matches: _c => _c.tag === value,
        resolve: () => value
    });
    resolver.kind = 'value';
    resolver.tag = value;
    return resolver;
};

export class BrowserServiceContainer implements IServiceContainer {
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

    resolve<TCradle extends Record<string | number | symbol, any>, K extends keyof TCradle>(
        name: K,
        _options?: ServiceResolveOptions
    ): TCradle[K] {
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
            return this.#singletonCache.get(cacheKey) as TCradle[K];
        }

        if (registration.lifetime === 'SCOPED') {
            if (!this.#scopedCache.has(cacheKey)) {
                this.#scopedCache.set(cacheKey, this.#materialize(registration));
            }
            return this.#scopedCache.get(cacheKey) as TCradle[K];
        }

        return this.#materialize(registration) as TCradle[K];
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
        return registration.resolve(this.#createCradle());
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

    has<Y>(name: string, resolver?: ServiceResolver<Y>): boolean {
        const registration = this.#getRegistration(name);
        return !!(resolver
            ? registration?.is(resolver)
            : registration);
    }

    register<T>(
        nameOrRegistrations: (string | number | symbol) | Record<string, ServiceResolver<T>>,
        resolverOrFactory?: ServiceResolver<T> | ((state: unknown) => T)
    ): void {
        if (typeof nameOrRegistrations === 'string') {
            if (!resolverOrFactory) {
                throw new TypeError(
                    `ServiceContainer.register: resolver is required when registering by name ("${nameOrRegistrations}").`
                );
            }
            if (typeof resolverOrFactory === 'function') {
                this.register<T>(nameOrRegistrations, asFunction(resolverOrFactory));
            } else {
                if (!isBrowserResolver(resolverOrFactory)) {
                    throw new TypeError(
                        `ServiceContainer.register: unsupported resolver for "${nameOrRegistrations}" in browser/edge runtime. Use asValue/asClass/asFunction from this module.`
                    );
                }
                this.#registrations.set(nameOrRegistrations, resolverOrFactory);
            }
            return;
        }

        for (const [name, nextResolver] of Object.entries(nameOrRegistrations)) {
            this.register(name, nextResolver);
        }
    }

    createScope(): IServiceContainer {
        return new BrowserServiceContainer(this, this.#singletonCache);
    }

    async [Symbol.asyncDispose](): Promise<void> {
        this.#registrations.clear();
        this.#scopedCache.clear();
    }
}
export const createContainer = (): BrowserServiceContainer => new BrowserServiceContainer();
