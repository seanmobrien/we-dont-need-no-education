import {
    type Resolver,
    AwilixContainer,
    createContainer as createAwilixContainer,
    asClass,
    asFunction,
    asValue,
    InjectionMode,
} from 'awilix';

import {
    ServiceResolveOptions,
    ServiceResolver,
    type IServiceContainer
} from './types';

import {
    type ServiceCradle
} from './service-cradle';

const CREATE_CONTAINER = Symbol.for('@compliance-theater/types/dependency-injection/create-container');


export class ServiceContainerServer implements IServiceContainer {
    readonly #container: AwilixContainer<ServiceCradle>;
    static [CREATE_CONTAINER] = (): ServiceContainerServer =>
        new ServiceContainerServer();


    private constructor(container?: AwilixContainer<ServiceCradle>) {
        this.#container = container ?? createAwilixContainer<ServiceCradle>({
            injectionMode: InjectionMode.CLASSIC,
            strict: true,
        });
    }

    get container(): AwilixContainer<ServiceCradle> {
        return this.#container;
    }

    resolve<TCradle extends Record<string | number | symbol, any>, K extends keyof TCradle>(
        name: K,
        options?: ServiceResolveOptions
    ): TCradle[K] {
        return this.#container.resolve(name as string, options) as TCradle[K];
    }

    has(name: string | number | symbol, resolver?: unknown): boolean {
        if (!this.#container.hasRegistration(String(name))) {
            return false;
        }
        return this.#container.registrations[name] === resolver;
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
            const resolver = typeof resolverOrFactory === 'function'
                ? {
                    resolve: resolverOrFactory,
                }
                : resolverOrFactory as ServiceResolver<T>;
            this.#container.register(
                nameOrRegistrations,
                resolver
            );
        } else {
            this.#container.register(
                nameOrRegistrations as Record<string, Resolver<unknown>>
            );
        }
    }

    createScope(): IServiceContainer {
        const scoped = this.#container.createScope();
        return new ServiceContainerServer(scoped as AwilixContainer<ServiceCradle>);
    }

    async [Symbol.asyncDispose](): Promise<void> {
        await this.#container.dispose();
    }
}

export const createContainer = (): ServiceContainerServer =>
    ServiceContainerServer[CREATE_CONTAINER]();
export {
    asClass,
    asFunction,
    asValue,
};

