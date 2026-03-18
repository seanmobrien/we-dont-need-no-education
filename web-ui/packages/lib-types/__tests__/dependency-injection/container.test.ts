type MockContainer = {
    register: jest.Mock;
    resolve: jest.Mock;
};

type MockRuntime = {
    createContainer: jest.Mock;
    getServiceContainer: jest.Mock;
    registerServices: jest.Mock;
    resolveService: jest.Mock;
    asClass: jest.Mock;
    asFunction: jest.Mock;
    asValue: jest.Mock;
    resetRuntime: jest.Mock;
    Lifetime: {
        SINGLETON: 'SINGLETON';
        SCOPED: 'SCOPED';
        TRANSIENT: 'TRANSIENT';
    };
    InjectionMode: {
        PROXY: 'PROXY';
        CLASSIC: 'CLASSIC';
    };
};

const CONTAINER_SYMBOL = Symbol.for(
    '@compliance-theater/types/dependency-injection/container'
);

type TestGlobals = typeof globalThis & {
    [CONTAINER_SYMBOL]?: unknown;
    window?: unknown;
    self?: unknown;
    EdgeRuntime?: unknown;
};

const cleanupRuntimeSymbols = (): void => {
    const g = globalThis as TestGlobals;
    delete g[CONTAINER_SYMBOL];
};

const createMockRuntimeModule = ({
    container,
    classType,
    functionType,
    valueType,
}: {
    container: MockContainer;
    classType: string;
    functionType: string;
    valueType: string;
}): MockRuntime => {
    const createContainer = jest.fn(() => container);
    const getServiceContainer = jest.fn(() => {
        const g = globalThis as TestGlobals;
        if (!g[CONTAINER_SYMBOL]) {
            g[CONTAINER_SYMBOL] = createContainer();
        }
        return g[CONTAINER_SYMBOL] as MockContainer;
    });
    const registerServices = jest.fn((
        nameOrRegistrations: string | number | symbol | Record<string, unknown>,
        resolver?: unknown,
    ) => {
        if (
            typeof nameOrRegistrations === 'string'
            || typeof nameOrRegistrations === 'number'
            || typeof nameOrRegistrations === 'symbol'
        ) {
            if (resolver === undefined) {
                throw new Error('Resolver must be provided when registering a single service.');
            }
            getServiceContainer().register(String(nameOrRegistrations), resolver);
            return;
        }

        getServiceContainer().register(nameOrRegistrations);
    });
    const resolveService = jest.fn((name: string | number | symbol) =>
        getServiceContainer().resolve(String(name))
    );

    return {
        createContainer,
        getServiceContainer,
        registerServices,
        resolveService,
        asClass: jest.fn((...args: unknown[]) => ({ type: classType, args })),
        asFunction: jest.fn((...args: unknown[]) => ({ type: functionType, args })),
        asValue: jest.fn((...args: unknown[]) => ({ type: valueType, args })),
        resetRuntime: jest.fn(() => cleanupRuntimeSymbols()),
        Lifetime: {
            SINGLETON: 'SINGLETON',
            SCOPED: 'SCOPED',
            TRANSIENT: 'TRANSIENT',
        },
        InjectionMode: {
            PROXY: 'PROXY',
            CLASSIC: 'CLASSIC',
        },
    };
};

const configureRuntimeGlobals = (runtime: 'node' | 'browser'): (() => void) => {
    const g = globalThis as TestGlobals;
    const previousWindow = g.window;
    const previousSelf = g.self;
    const previousEdgeRuntime = g.EdgeRuntime;

    if (runtime === 'browser') {
        g.window = {};
    } else {
        delete g.window;
    }

    delete g.self;
    delete g.EdgeRuntime;

    return () => {
        if (previousWindow === undefined) {
            delete g.window;
        } else {
            g.window = previousWindow;
        }

        if (previousSelf === undefined) {
            delete g.self;
        } else {
            g.self = previousSelf;
        }

        if (previousEdgeRuntime === undefined) {
            delete g.EdgeRuntime;
        } else {
            g.EdgeRuntime = previousEdgeRuntime;
        }
    };
};

const loadContainerModule = ({
    runtimeName,
}: {
    runtimeName: 'node' | 'browser';
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
    const runtime = createMockRuntimeModule({
        container,
        classType: 'class',
        functionType: 'function',
        valueType: 'value',
    });
    const browserRuntime = createMockRuntimeModule({
        container,
        classType: 'browser-class',
        functionType: 'browser-function',
        valueType: 'browser-value',
    });

    let imported: typeof import('../../src/dependency-injection/container');
    const restoreGlobals = configureRuntimeGlobals(runtimeName);
    try {
        jest.isolateModules(() => {
            jest.doMock('../../src/dependency-injection/container.node', () => runtime);
            jest.doMock('../../src/dependency-injection/container.browser', () => browserRuntime);
            imported = require('../../src/dependency-injection/container') as typeof import('../../src/dependency-injection/container');
        });
    } finally {
        restoreGlobals();
    }

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

    it('loads node runtime via container shim and memoizes container', () => {
        const { module, runtime, browserRuntime, container } = loadContainerModule({ runtimeName: 'node' });

        const first = module.getServiceContainer();
        const second = module.getServiceContainer();

        expect(first).toBe(container);
        expect(second).toBe(container);
        expect(runtime.createContainer).toHaveBeenCalledTimes(1);
        expect(browserRuntime.createContainer).not.toHaveBeenCalled();
    });

    it('loads browser runtime when window is available', () => {
        const { module, runtime, browserRuntime } = loadContainerModule({ runtimeName: 'browser' });

        module.getServiceContainer();

        expect(browserRuntime.createContainer).toHaveBeenCalledTimes(1);
        expect(runtime.createContainer).not.toHaveBeenCalled();
    });

    it('resets container cache using resetRuntime', () => {
        const { module, runtime } = loadContainerModule({ runtimeName: 'node' });

        module.getServiceContainer();
        expect((globalThis as TestGlobals)[CONTAINER_SYMBOL]).toBeDefined();

        module.resetRuntime();
        expect(runtime.resetRuntime).toHaveBeenCalledTimes(1);
        expect((globalThis as TestGlobals)[CONTAINER_SYMBOL]).toBeUndefined();
    });

    it('registers services by name and map and resolves named services', () => {
        const { module, container } = loadContainerModule({ runtimeName: 'node' });
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
        const { module } = loadContainerModule({ runtimeName: 'node' });

        expect(() => module.registerServices('missing-resolver')).toThrow(
            'Resolver must be provided when registering a single service.'
        );
    });

    it('delegates asClass/asFunction/asValue to node runtime', () => {
        const { module, runtime, browserRuntime } = loadContainerModule({ runtimeName: 'node' });

        const classResult = module.asClass(class Example { }, { a: 1 });
        const functionResult = module.asFunction(() => 1);
        const valueResult = module.asValue('ok');

        expect(classResult).toEqual({ type: 'class', args: [expect.any(Function), { a: 1 }] });
        expect(functionResult).toEqual({ type: 'function', args: [expect.any(Function)] });
        expect(valueResult).toEqual({ type: 'value', args: ['ok'] });

        expect(runtime.asClass).toHaveBeenCalledTimes(1);
        expect(runtime.asFunction).toHaveBeenCalledTimes(1);
        expect(runtime.asValue).toHaveBeenCalledTimes(1);
        expect(browserRuntime.asClass).not.toHaveBeenCalled();
        expect(browserRuntime.asFunction).not.toHaveBeenCalled();
        expect(browserRuntime.asValue).not.toHaveBeenCalled();
    });

    it('delegates asClass/asFunction/asValue to browser runtime when window is available', () => {
        const { module, browserRuntime, runtime } = loadContainerModule({ runtimeName: 'browser' });

        const classResult = module.asClass(class Example { }, { b: 2 });
        const functionResult = module.asFunction(() => 2);
        const valueResult = module.asValue('browser-ok');

        expect(classResult).toEqual({ type: 'browser-class', args: [expect.any(Function), { b: 2 }] });
        expect(functionResult).toEqual({ type: 'browser-function', args: [expect.any(Function)] });
        expect(valueResult).toEqual({ type: 'browser-value', args: ['browser-ok'] });

        expect(browserRuntime.asClass).toHaveBeenCalledTimes(1);
        expect(browserRuntime.asFunction).toHaveBeenCalledTimes(1);
        expect(browserRuntime.asValue).toHaveBeenCalledTimes(1);
        expect(runtime.asClass).not.toHaveBeenCalled();
        expect(runtime.asFunction).not.toHaveBeenCalled();
        expect(runtime.asValue).not.toHaveBeenCalled();
    });

    it('exports stable lifetime and injection mode constants', () => {
        const { module } = loadContainerModule({ runtimeName: 'node' });

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