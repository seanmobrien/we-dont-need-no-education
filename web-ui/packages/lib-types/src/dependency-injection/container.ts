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
        setLifetime: () => resolver,
        singleton: () => resolver,
        scoped: () => resolver,
        transient: () => resolver,
        inject: () => resolver,
    };
    return resolver as unknown as ServiceResolver<T>;
};

class NoopServiceContainer implements IServiceContainer {
    get container(): AwilixContainer<ServiceCradle> {
        return {} as AwilixContainer<ServiceCradle>;
    }

    resolve<K extends keyof ServiceCradle>(
        _name: K,
        _options?: ServiceResolveOptions
    ): ServiceCradle[K] {
        return undefined as ServiceCradle[K];
    }

    has(_name: string): boolean {
        return false;
    }

    register(
        _nameOrRegistrations: string | Record<string, ServiceResolver>,
        _resolver?: ServiceResolver
    ): void {
        // no-op in browser/edge
    }

    createScope(): IServiceContainer {
        return this;
    }

    async dispose(): Promise<void> {
        // no-op in browser/edge
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
                g[CONTAINER_SYMBOL] = new NoopServiceContainer();
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
        return createNoopResolver<T>();
    }
    return loadAwilix().asClass(...args) as ServiceResolver<T>;
};

export const asFunction = <T>(...args: unknown[]): ServiceResolver<T> => {
    if (!isServerRuntime()) {
        return createNoopResolver<T>();
    }
    return loadAwilix().asFunction(...args) as ServiceResolver<T>;
};

export const asValue = <T>(...args: unknown[]): ServiceResolver<T> => {
    if (!isServerRuntime()) {
        return createNoopResolver<T>();
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
