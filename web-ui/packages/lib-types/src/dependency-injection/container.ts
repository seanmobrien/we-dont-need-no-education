import type {
    IServiceContainer,
    ServiceResolver,
    ContainerRuntime,
    IServiceRegistrarOverload,
} from './types';
import { ServiceCradle } from './service-cradle';
import { isRunningOnServer } from '../is-running-on';

const CONTAINER_SYMBOL = Symbol.for(
    '@compliance-theater/types/dependency-injection/container'
);

type GlobalWithContainer = typeof globalThis & {
    [CONTAINER_SYMBOL]?: IServiceContainer;
};

const getNodeRequire = (): ((id: string) => ContainerRuntime) | undefined => {
    if (!isRunningOnServer()) {
        return undefined;
    }
    if (typeof require === 'function') {
        return require;
    }
    return undefined;
};
const getBrowserRequire = (): ((id: string) => ContainerRuntime) | undefined => {
    if (isRunningOnServer()) {
        return undefined;
    }
    if (typeof require === 'function') {
        return require;
    }
    return undefined;
}

const loadForServer = (): ContainerRuntime => {
    const nodeRequire = getNodeRequire();
    if (!nodeRequire) {
        throw new Error(
            'Awilix can only be loaded in a Node.js server runtime.'
        );
    }
    return nodeRequire('./container-server');
};
const loadForBrowser = (): ContainerRuntime => {
    const browserRequire = getBrowserRequire();
    if (!browserRequire) {
        throw new Error(
            'Awilix can only be loaded in a browser runtime.'
        );
    }
    return browserRequire('./container-browser');
}


const DI_RUNTIME = Symbol.for('@compliance-theater/types/dependency-injection/runtime');
type GlobalWithRuntime = typeof globalThis & {
    [DI_RUNTIME]?: ContainerRuntime;
};

const loadRuntime = (): ContainerRuntime => {
    const globalWithGlobal = globalThis as GlobalWithRuntime;
    if (!globalWithGlobal[DI_RUNTIME]) {
        globalWithGlobal[DI_RUNTIME] = isRunningOnServer() ? loadForServer() : loadForBrowser();
    }
    return globalWithGlobal[DI_RUNTIME]!;
};
export const resetRuntime = (): void => {
    const globalWithGlobal = globalThis as GlobalWithRuntime;
    delete globalWithGlobal[DI_RUNTIME];
}

export const getServiceContainer = (): IServiceContainer => {
    const g = globalThis as GlobalWithContainer;
    if (!g[CONTAINER_SYMBOL]) {
        g[CONTAINER_SYMBOL] = loadRuntime().createContainer();
    }
    return g[CONTAINER_SYMBOL]!;
};

export const registerServices: IServiceRegistrarOverload = <T>(
    nameOrRegistrations: (string | number | symbol) | Record<string, ServiceResolver<T>>,
    resolverOrFactory?: ServiceResolver<T> | ((state: unknown) => T)
): void =>
    typeof nameOrRegistrations === 'string' ||
        typeof nameOrRegistrations === 'number' ||
        typeof nameOrRegistrations === 'symbol' ?
        resolverOrFactory
            ? getServiceContainer().register(String(nameOrRegistrations), resolverOrFactory as ServiceResolver<T>)
            : (() => { throw new Error('Resolver must be provided when registering a single service.'); })()
        : getServiceContainer().register(nameOrRegistrations as Record<string, ServiceResolver<T>>);

export const Lifetime = {
    SINGLETON: 'SINGLETON',
    SCOPED: 'SCOPED',
    TRANSIENT: 'TRANSIENT',
} as const;

export const InjectionMode = {
    PROXY: 'PROXY',
    CLASSIC: 'CLASSIC',
} as const;

export const resolveService = <K extends keyof ServiceCradle>(
    name: K
): ServiceCradle[K] => getServiceContainer().resolve<ServiceCradle[K]>(name);

export const asClass = <T>(...args: unknown[]): ServiceResolver<T> =>
    loadRuntime().asClass(...args) as ServiceResolver<T>;

export const asFunction = <T>(...args: unknown[]): ServiceResolver<T> =>
    loadRuntime().asFunction(...args) as ServiceResolver<T>;

export const asValue = <T>(...args: unknown[]): ServiceResolver<T> =>
    loadRuntime().asValue(...args) as ServiceResolver<T>;



