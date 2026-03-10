import { asClass, asFunction, asValue, createContainer } from './container-browser';
import {
    createContainerApi,
    InjectionMode,
    Lifetime,
} from './container.shared';
import type { ContainerRuntime } from './types';

const api = createContainerApi({
    createContainer,
    asClass: asClass as ContainerRuntime['asClass'],
    asFunction: asFunction as ContainerRuntime['asFunction'],
    asValue: asValue as ContainerRuntime['asValue'],
});

export const {
    getServiceContainer,
    registerServices,
    resolveService,
    resetRuntime,
} = api;

export { asClass, asFunction, asValue, Lifetime, InjectionMode };
