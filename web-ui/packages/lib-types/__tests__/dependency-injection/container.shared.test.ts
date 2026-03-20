import {
    createContainerApi,
    InjectionMode,
    Lifetime,
} from '../../src/dependency-injection/container.shared';

const CONTAINER_SYMBOL = Symbol.for(
    '@compliance-theater/types/dependency-injection/container'
);

type MockContainer = {
    register: jest.Mock;
    resolve: jest.Mock;
};

type TestGlobal = typeof globalThis & {
    [CONTAINER_SYMBOL]?: unknown;
};

const clearRuntimeContainer = (): void => {
    const g = globalThis as TestGlobal;
    delete g[CONTAINER_SYMBOL];
};

const createApi = () => {
    const container: MockContainer = {
        register: jest.fn(),
        resolve: jest.fn((name: string | number | symbol) => `resolved:${String(name)}`),
    };
    const runtime = {
        createContainer: jest.fn(() => container),
        asClass: jest.fn((...args: unknown[]) => ({ kind: 'class', args })),
        asFunction: jest.fn((...args: unknown[]) => ({ kind: 'function', args })),
        asValue: jest.fn((...args: unknown[]) => ({ kind: 'value', args })),
    };

    return {
        api: createContainerApi(runtime),
        container,
        runtime,
    };
};

describe('container.shared', () => {
    beforeEach(() => {
        clearRuntimeContainer();
    });

    afterEach(() => {
        clearRuntimeContainer();
    });

    it('memoizes and resets the shared service container', () => {
        const { api, runtime, container } = createApi();

        const first = api.getServiceContainer();
        const second = api.getServiceContainer();

        expect(first).toBe(container);
        expect(second).toBe(container);
        expect(runtime.createContainer).toHaveBeenCalledTimes(1);

        api.resetRuntime();

        const third = api.getServiceContainer();
        expect(third).toBe(container);
        expect(runtime.createContainer).toHaveBeenCalledTimes(2);
    });

    it('registers services by single key and registration map', () => {
        const { api, container } = createApi();
        const resolver = { resolve: jest.fn() };
        const symbolKey = Symbol('shared-service');

        api.registerServices('alpha', resolver as never);
        api.registerServices(42 as never, resolver as never);
        api.registerServices(symbolKey as never, resolver as never);
        api.registerServices({
            bravo: resolver as never,
            charlie: resolver as never,
        });

        expect(container.register).toHaveBeenNthCalledWith(1, 'alpha', resolver);
        expect(container.register).toHaveBeenNthCalledWith(2, '42', resolver);
        expect(container.register).toHaveBeenNthCalledWith(3, 'Symbol(shared-service)', resolver);
        expect(container.register).toHaveBeenNthCalledWith(4, {
            bravo: resolver,
            charlie: resolver,
        });
    });

    it('throws when registering a single service without a resolver', () => {
        const { api } = createApi();

        expect(() => api.registerServices('missing-resolver')).toThrow(
            'Resolver must be provided when registering a single service.'
        );
    });

    it('resolves services and delegates helper factories to the runtime', () => {
        const { api, container, runtime } = createApi();

        expect(api.resolveService('alpha')).toBe('resolved:alpha');
        expect(container.resolve).toHaveBeenCalledWith('alpha');

        expect(api.asClass(class Example { }, { scoped: true })).toEqual({
            kind: 'class',
            args: [expect.any(Function), { scoped: true }],
        });
        expect(api.asFunction(() => 'ok')).toEqual({
            kind: 'function',
            args: [expect.any(Function)],
        });
        expect(api.asValue('ready')).toEqual({
            kind: 'value',
            args: ['ready'],
        });

        expect(runtime.asClass).toHaveBeenCalledTimes(1);
        expect(runtime.asFunction).toHaveBeenCalledTimes(1);
        expect(runtime.asValue).toHaveBeenCalledTimes(1);
    });

    it('exports stable lifetime and injection mode constants', () => {
        expect(Lifetime).toEqual({
            SINGLETON: 'SINGLETON',
            SCOPED: 'SCOPED',
            TRANSIENT: 'TRANSIENT',
        });
        expect(InjectionMode).toEqual({
            PROXY: 'PROXY',
            CLASSIC: 'CLASSIC',
        });
    });
});