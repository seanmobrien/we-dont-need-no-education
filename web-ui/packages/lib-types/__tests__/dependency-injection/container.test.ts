type MockContainer = {
    register: jest.Mock;
    resolve: jest.Mock;
};

type MockRuntime = {
    createContainer: jest.Mock;
    asClass: jest.Mock;
    asFunction: jest.Mock;
    asValue: jest.Mock;
};

const CONTAINER_SYMBOL = Symbol.for(
    '@compliance-theater/types/dependency-injection/container'
);

type TestGlobals = typeof globalThis & {
    [CONTAINER_SYMBOL]?: unknown;
};

const cleanupRuntimeSymbols = (): void => {
    const g = globalThis as TestGlobals;
    delete g[CONTAINER_SYMBOL];
};

const loadContainerModule = ({
    isServer,
}: {
    isServer: boolean;
}): {
    module: typeof import('../../src/dependency-injection/container');
    runtime: MockRuntime;
    browserRuntime: MockRuntime;
    container: MockContainer;
} => {
    const container: MockContainer = {
        register: jest.fn(),
        resolve: jest.fn((name: string) => `resolved:${name}`),
    };
    const runtime: MockRuntime = {
        createContainer: jest.fn(() => container),
        asClass: jest.fn((...args: unknown[]) => ({ type: 'class', args })),
        asFunction: jest.fn((...args: unknown[]) => ({ type: 'function', args })),
        asValue: jest.fn((...args: unknown[]) => ({ type: 'value', args })),
    };
    const browserRuntime: MockRuntime = {
        createContainer: jest.fn(() => container),
        asClass: jest.fn((...args: unknown[]) => ({ type: 'browser-class', args })),
        asFunction: jest.fn((...args: unknown[]) => ({ type: 'browser-function', args })),
        asValue: jest.fn((...args: unknown[]) => ({ type: 'browser-value', args })),
    };

    let imported: typeof import('../../src/dependency-injection/container');
    jest.isolateModules(() => {
        jest.doMock('../../src/is-running-on', () => ({
            isRunningOnServer: jest.fn(() => isServer),
        }));
        jest.doMock('../../src/dependency-injection/container-server', () => runtime);
        jest.doMock('../../src/dependency-injection/container-browser', () => browserRuntime);
        imported = require('../../src/dependency-injection/container') as typeof import('../../src/dependency-injection/container');
    });

    return {
        module: imported!,
        runtime,
        browserRuntime,
        container,
    };
};

describe('dependency-injection/container', () => {
    beforeEach(() => {
        cleanupRuntimeSymbols();
        jest.resetModules();
    });

    afterEach(() => {
        cleanupRuntimeSymbols();
    });

    it('loads browser runtime via container shim and memoizes container', () => {
        const { module, runtime, browserRuntime, container } = loadContainerModule({ isServer: true });

        const first = module.getServiceContainer();
        const second = module.getServiceContainer();

        expect(first).toBe(container);
        expect(second).toBe(container);
        expect(browserRuntime.createContainer).toHaveBeenCalledTimes(1);
        expect(runtime.createContainer).not.toHaveBeenCalled();
    });

    it('loads browser runtime when not running on server', () => {
        const { module, runtime, browserRuntime } = loadContainerModule({ isServer: false });

        module.getServiceContainer();

        expect(browserRuntime.createContainer).toHaveBeenCalledTimes(1);
        expect(runtime.createContainer).not.toHaveBeenCalled();
    });

    it('resets container cache using resetRuntime', () => {
        const { module } = loadContainerModule({ isServer: true });

        module.getServiceContainer();
        expect((globalThis as TestGlobals)[CONTAINER_SYMBOL]).toBeDefined();

        module.resetRuntime();
        expect((globalThis as TestGlobals)[CONTAINER_SYMBOL]).toBeUndefined();
    });

    it('registers services by name and map and resolves named services', () => {
        const { module, container } = loadContainerModule({ isServer: true });
        const resolver = { resolve: () => 'x' };
        const symbolKey = Symbol('symbol-service');

        module.registerServices('single-service', resolver as never);
        module.registerServices(42 as never, resolver as never);
        module.registerServices(symbolKey as never, resolver as never);
        module.registerServices({
            one: resolver as never,
            two: resolver as never,
        });
        const resolved = module.resolveService('single-service' as never);

        expect(container.register).toHaveBeenNthCalledWith(1, 'single-service', resolver);
        expect(container.register).toHaveBeenNthCalledWith(2, '42', resolver);
        expect(container.register).toHaveBeenNthCalledWith(3, 'Symbol(symbol-service)', resolver);
        expect(container.register).toHaveBeenNthCalledWith(4, {
            one: resolver,
            two: resolver,
        });
        expect(resolved).toBe('resolved:single-service');
    });

    it('throws when registering a single service without resolver', () => {
        const { module } = loadContainerModule({ isServer: true });

        expect(() => module.registerServices('missing-resolver')).toThrow(
            'Resolver must be provided when registering a single service.'
        );
    });

    it('delegates asClass/asFunction/asValue to active runtime', () => {
        const { module, runtime } = loadContainerModule({ isServer: true });

        const classResult = module.asClass(class Example { }, { a: 1 });
        const functionResult = module.asFunction(() => 1);
        const valueResult = module.asValue('ok');

        expect(classResult).toEqual({ type: 'browser-class', args: [expect.any(Function), { a: 1 }] });
        expect(functionResult).toEqual({ type: 'browser-function', args: [expect.any(Function)] });
        expect(valueResult).toEqual({ type: 'browser-value', args: ['ok'] });

        expect(runtime.asClass).not.toHaveBeenCalled();
        expect(runtime.asFunction).not.toHaveBeenCalled();
        expect(runtime.asValue).not.toHaveBeenCalled();
    });

    it('delegates asClass/asFunction/asValue to browser runtime when server is false', () => {
        const { module, browserRuntime } = loadContainerModule({ isServer: false });

        const classResult = module.asClass(class Example { }, { b: 2 });
        const functionResult = module.asFunction(() => 2);
        const valueResult = module.asValue('browser-ok');

        expect(classResult).toEqual({ type: 'browser-class', args: [expect.any(Function), { b: 2 }] });
        expect(functionResult).toEqual({ type: 'browser-function', args: [expect.any(Function)] });
        expect(valueResult).toEqual({ type: 'browser-value', args: ['browser-ok'] });

        expect(browserRuntime.asClass).toHaveBeenCalledTimes(1);
        expect(browserRuntime.asFunction).toHaveBeenCalledTimes(1);
        expect(browserRuntime.asValue).toHaveBeenCalledTimes(1);
    });

    it('exports stable lifetime and injection mode constants', () => {
        const { module } = loadContainerModule({ isServer: true });

        expect(module.Lifetime).toEqual({
            SINGLETON: 'SINGLETON',
            SCOPED: 'SCOPED',
            TRANSIENT: 'TRANSIENT',
        });
        expect(module.InjectionMode).toEqual({
            PROXY: 'PROXY',
            CLASSIC: 'CLASSIC',
        });
    });
});