import type {
    IServiceContainer,
    ServiceResolver,
    IServiceRegistrarOverload,
    ContainerRuntime,
} from './types';
import type { ServiceCradle } from './service-cradle';

const CONTAINER_SYMBOL = Symbol.for(
    '@compliance-theater/types/dependency-injection/container',
);

type GlobalWithContainer = typeof globalThis & {
    [CONTAINER_SYMBOL]?: IServiceContainer;
};

export type ContainerApi = {
    getServiceContainer: () => IServiceContainer;
    registerServices: IServiceRegistrarOverload;
    resolveService: {
        (name: keyof ServiceCradle): ServiceCradle[keyof ServiceCradle];
        <T = unknown>(name: string | symbol | number): T;
    };
    asClass: <T>(...args: unknown[]) => ServiceResolver<T>;
    asFunction: <T>(...args: unknown[]) => ServiceResolver<T>;
    asValue: <T>(...args: unknown[]) => ServiceResolver<T>;
    resetRuntime: () => void;
};

interface IResolveServiceOverload {
    (name: keyof ServiceCradle): ServiceCradle[typeof name];
    <T = unknown>(name: string | symbol | number): T;
}

export const createContainerApi = (runtime: ContainerRuntime): ContainerApi => {
    const getServiceContainer = (): IServiceContainer => {
        const g = globalThis as GlobalWithContainer;
        if (!g[CONTAINER_SYMBOL]) {
            g[CONTAINER_SYMBOL] = runtime.createContainer();
        }
        return g[CONTAINER_SYMBOL]!;
    };

    const resetRuntime = (): void => {
        const g = globalThis as GlobalWithContainer;
        delete g[CONTAINER_SYMBOL];
    };

    const registerServices: IServiceRegistrarOverload = <T>(
        nameOrRegistrations:
            | string
            | number
            | symbol
            | Record<string, ServiceResolver<T>>,
        resolverOrFactory?: ServiceResolver<T> | ((state: unknown) => T),
    ): void =>
        typeof nameOrRegistrations === 'string' ||
            typeof nameOrRegistrations === 'number' ||
            typeof nameOrRegistrations === 'symbol'
            ? resolverOrFactory
                ? getServiceContainer().register(
                    String(nameOrRegistrations),
                    resolverOrFactory as ServiceResolver<T>,
                )
                : (() => {
                    throw new Error(
                        'Resolver must be provided when registering a single service.',
                    );
                })()
            : getServiceContainer().register(
                nameOrRegistrations as Record<string, ServiceResolver<T>>,
            );

    const resolveService: IResolveServiceOverload = <T>(
        name: T extends keyof ServiceCradle ? T : string | symbol | number,
    ): typeof name extends keyof ServiceCradle
        ? ServiceCradle[typeof name]
        : T =>
        getServiceContainer().resolve<
            typeof name extends keyof ServiceCradle
            ? ServiceCradle[typeof name]
            : T
        >(name);

    const asClass = <T>(...args: unknown[]): ServiceResolver<T> =>
        runtime.asClass(...args) as ServiceResolver<T>;

    const asFunction = <T>(...args: unknown[]): ServiceResolver<T> =>
        runtime.asFunction(...args) as ServiceResolver<T>;

    const asValue = <T>(...args: unknown[]): ServiceResolver<T> =>
        runtime.asValue(...args) as ServiceResolver<T>;

    return {
        getServiceContainer,
        registerServices,
        resolveService,
        asClass,
        asFunction,
        asValue,
        resetRuntime,
    };
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
