/* @jest-environment node */

const CONTAINER_SYMBOL = Symbol.for(
    '@compliance-theater/types/dependency-injection/container'
);

type RuntimeGlobal = typeof globalThis & {
    window?: unknown;
    [CONTAINER_SYMBOL]?: unknown;
};

describe('fetch-service DI registration in browser runtime', () => {
    const originalWindowDescriptor = Object.getOwnPropertyDescriptor(
        globalThis,
        'window'
    );

    beforeEach(() => {
        const g = globalThis as RuntimeGlobal;
        Object.defineProperty(g, 'window', {
            configurable: true,
            writable: true,
            value: {},
        });
        delete g[CONTAINER_SYMBOL];
        jest.resetModules();
    });

    afterEach(() => {
        const g = globalThis as RuntimeGlobal;
        delete g[CONTAINER_SYMBOL];
        if (originalWindowDescriptor) {
            Object.defineProperty(g, 'window', originalWindowDescriptor);
        } else {
            delete g.window;
        }
        jest.resetModules();
    });

    it('registers fetch-service and resolves it from container', async () => {
        const { fetchService } = await import('../src/index');
        const { resolveService } = await import(
            '@compliance-theater/types/dependency-injection'
        );

        const resolved = resolveService('fetch-service');

        expect(resolved).toBe(fetchService);
        expect(typeof resolved.fetch).toBe('function');
    });
});
