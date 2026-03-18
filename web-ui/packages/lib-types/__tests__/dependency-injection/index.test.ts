type MockRuntimeModule = {
    getServiceContainer: jest.Mock;
    registerServices: jest.Mock;
    resolveService: jest.Mock;
    resetRuntime: jest.Mock;
    asClass: jest.Mock;
    asFunction: jest.Mock;
    asValue: jest.Mock;
    Lifetime: {
        SINGLETON: 'SINGLETON';
        SCOPED: 'SCOPED';
        TRANSIENT: 'TRANSIENT';
    };
};

type TestGlobal = typeof globalThis & {
    window?: unknown;
    self?: unknown;
    EdgeRuntime?: unknown;
};

const configureRuntimeGlobals = (runtime: 'node' | 'browser'): (() => void) => {
    const g = globalThis as TestGlobal;
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

const createMockRuntimeModule = (prefix: string): MockRuntimeModule => ({
    getServiceContainer: jest.fn(() => `${prefix}:container`),
    registerServices: jest.fn((...args: unknown[]) => args),
    resolveService: jest.fn((name: unknown) => `${prefix}:resolved:${String(name)}`),
    resetRuntime: jest.fn(() => undefined),
    asClass: jest.fn((...args: unknown[]) => ({ type: `${prefix}:class`, args })),
    asFunction: jest.fn((...args: unknown[]) => ({ type: `${prefix}:function`, args })),
    asValue: jest.fn((...args: unknown[]) => ({ type: `${prefix}:value`, args })),
    Lifetime: {
        SINGLETON: 'SINGLETON',
        SCOPED: 'SCOPED',
        TRANSIENT: 'TRANSIENT',
    },
});

const loadIndexModule = (runtime: 'node' | 'browser') => {
    const nodeRuntime = createMockRuntimeModule('node');
    const browserRuntime = createMockRuntimeModule('browser');

    let imported: typeof import('../../src/dependency-injection');
    const restoreGlobals = configureRuntimeGlobals(runtime);

    try {
        jest.isolateModules(() => {
            jest.doMock('../../src/dependency-injection/index.node', () => nodeRuntime);
            jest.doMock('../../src/dependency-injection/index.browser', () => browserRuntime);
            imported = require('../../src/dependency-injection') as typeof import('../../src/dependency-injection');
        });
    } finally {
        restoreGlobals();
    }

    return {
        module: imported!,
        nodeRuntime,
        browserRuntime,
    };
};

describe('dependency-injection/index', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    it('selects the node runtime when window is unavailable', () => {
        const { module, nodeRuntime, browserRuntime } = loadIndexModule('node');

        expect(module.getServiceContainer()).toBe('node:container');
        expect(module.resolveService('alpha')).toBe('node:resolved:alpha');
        module.registerServices('alpha' as never, { resolve: () => 'ok' } as never);
        module.resetRuntime();
        expect(module.asClass(class Example { })).toEqual({
            type: 'node:class',
            args: [expect.any(Function)],
        });
        expect(module.asFunction(() => 'ok')).toEqual({
            type: 'node:function',
            args: [expect.any(Function)],
        });
        expect(module.asValue('ready')).toEqual({
            type: 'node:value',
            args: ['ready'],
        });
        expect(module.Lifetime).toEqual(nodeRuntime.Lifetime);

        expect(nodeRuntime.getServiceContainer).toHaveBeenCalledTimes(1);
        expect(nodeRuntime.resolveService).toHaveBeenCalledWith('alpha');
        expect(nodeRuntime.registerServices).toHaveBeenCalledTimes(1);
        expect(nodeRuntime.resetRuntime).toHaveBeenCalledTimes(1);
        expect(browserRuntime.getServiceContainer).not.toHaveBeenCalled();
    });

    it('selects the browser runtime when window is available', () => {
        const { module, nodeRuntime, browserRuntime } = loadIndexModule('browser');

        expect(module.getServiceContainer()).toBe('browser:container');
        expect(module.resolveService('beta')).toBe('browser:resolved:beta');
        module.registerServices({ beta: { resolve: () => 'ok' } } as never);
        module.resetRuntime();
        expect(module.asClass(class Example { }, { browser: true })).toEqual({
            type: 'browser:class',
            args: [expect.any(Function), { browser: true }],
        });
        expect(module.asFunction(() => 'ok')).toEqual({
            type: 'browser:function',
            args: [expect.any(Function)],
        });
        expect(module.asValue('ready')).toEqual({
            type: 'browser:value',
            args: ['ready'],
        });
        expect(module.Lifetime).toEqual(browserRuntime.Lifetime);

        expect(browserRuntime.getServiceContainer).toHaveBeenCalledTimes(1);
        expect(browserRuntime.resolveService).toHaveBeenCalledWith('beta');
        expect(browserRuntime.registerServices).toHaveBeenCalledTimes(1);
        expect(browserRuntime.resetRuntime).toHaveBeenCalledTimes(1);
        expect(nodeRuntime.getServiceContainer).not.toHaveBeenCalled();
    });
});