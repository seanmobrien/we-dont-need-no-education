import { createMockServiceCradle } from '../../../__mocks__/shared/service-cradle';
import type { ServiceCradle } from '@compliance-theater/types/dependency-injection/service-cradle';
import type {
    IServiceContainer,
    ServiceResolveOptions,
    ServiceResolver,
} from '@compliance-theater/types/dependency-injection/types';

class MockServiceContainer implements IServiceContainer {
    #cradle = createMockServiceCradle();
    private registrations = new Map<string | symbol | number, ServiceResolver>();

    resolve<T>(name: string | symbol | number, options?: ServiceResolveOptions): T {
        const resolver = this.registrations.get(name);
        if (resolver) {
            if (typeof resolver === 'object' && 'resolve' in resolver && typeof resolver.resolve === 'function') {
                return resolver.resolve<ServiceCradle>(this.#cradle as any) as T;
            }
            var ret = typeof resolver === 'function'
                ? (resolver as any)(this.#cradle) : (resolver as any);
            if (!!ret) {
                return ret;
            }
        }
        return this.#cradle [name] as T;
    }
    has(name: string | symbol | number, resolver?: ServiceResolver<unknown>): boolean {
        return this.registrations.has(name);
    }
    register(registrations: Record<string | symbol | number, ServiceResolver>): void;
    register(name: string | symbol | number, resolver: ServiceResolver): void;
    register<T>(name: string | symbol | number, resolver: ServiceResolver<T>): void;
    register<T>(name: string | symbol | number, resolver: ((state: unknown) => T)): void;
    register(name: unknown, resolver?: unknown): void {
        if (typeof name === 'object' && name !== null && resolver === undefined) {
            Object.entries(name).forEach(([key, value]) => {
                this.registrations.set(key, value as ServiceResolver);
            });
        } else {
            this.registrations.set(name as string | symbol | number, resolver as ServiceResolver);
        }
    }
    createScope(): IServiceContainer {
        return new MockServiceContainer();
    }
    [Symbol.asyncDispose](): Promise<void> {
        this.registrations.clear();
        return Promise.resolve();
    }

}

let containerMock = new MockServiceContainer();

jest.mock('@compliance-theater/types/dependency-injection/container-browser', () => {
    const actual = jest.requireActual('@compliance-theater/types/dependency-injection/container-browser');
    return {
        ...actual,
        createContainer: jest.fn(() => containerMock)
    };
});
jest.mock('@compliance-theater/types/dependency-injection/container-server', () => {
    const actual = jest.requireActual('@compliance-theater/types/dependency-injection/container-server');
    const asClass = jest.fn((...args: unknown[]) => ({ type: 'browser-class', args }));
    const asFunction = jest.fn((...args: unknown[]) => ({ type: 'browser-function', args }));
    const asValue = jest.fn((...args: unknown[]) => ({ type: 'browser-value', args }));
    return {
        ...actual,
        createContainer: jest.fn(() => containerMock),
        asClass,
        asFunction,
        asValue,
    };
});

jest.mock('@compliance-theater/types/dependency-injection/container', () => {
    const actual = jest.requireActual('@compliance-theater/types/dependency-injection/container');
    const { asClass, asFunction, asValue } = jest.requireMock('@compliance-theater/types/dependency-injection/container-browser');
    return {
        ...actual,
        getServiceContainer: jest.fn(() => containerMock),
        registerServices: jest.fn((x, y) => containerMock.register(x, y)),
        resolveService: jest.fn((x) => containerMock.resolve(x)),
        asClass,
        asFunction,
        asValue,
    };
});

jest.mock('@compliance-theater/types/dependency-injection', () => {
    const actual = jest.requireActual('@compliance-theater/types/dependency-injection');
    const { getServiceContainer, registerServices, resolveService, asClass, asFunction, asValue } = jest.requireMock('@compliance-theater/types/dependency-injection/container');
    return {
        ...actual,
        getServiceContainer: jest.fn(() => containerMock),
        registerServices: jest.fn((x, y) => containerMock.register(x, y)),
        resolveService: jest.fn((x) => containerMock.resolve(x)),
        asClass,
        asFunction,
        asValue,
    };
});

import { getServiceContainer } from '@compliance-theater/types/dependency-injection';

afterEach(() => {
    containerMock = new MockServiceContainer();
});