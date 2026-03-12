/* @jest-environment node */

describe('runtime fetch dispatch', () => {
    const originalWindowDescriptor = Object.getOwnPropertyDescriptor(
        globalThis,
        'window',
    );

    afterEach(() => {
        jest.resetModules();

        if (originalWindowDescriptor) {
            Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
            return;
        }

        const runtimeGlobal = globalThis as object & {
            window?: unknown;
        };
        delete runtimeGlobal.window;
    });

    it('uses server fetch in node runtime', async () => {
        const serverFetch = jest.fn(async () => new Response('server'));
        const browserFetch = jest.fn(async () => new Response('browser'));

        jest.doMock('@compliance-theater/types/dependency-injection', () => ({
            asFunction: (factory: unknown) => factory,
            registerServices: jest.fn(),
            resolveService: jest.fn(() => ({
                getOrCreate: () => serverFetch,
            })),
        }));
        jest.doMock('../src/server/fetch', () => ({ fetch: serverFetch }));
        jest.doMock('../src/fetch', () => ({ fetch: browserFetch }));

        const mod = await import('../src/index');
        const response = await mod.fetch('https://example.com');

        expect(await response.text()).toBe('server');
        expect(serverFetch).toHaveBeenCalledTimes(1);
        expect(browserFetch).not.toHaveBeenCalled();
    });

    it('uses browser/edge fetch when window is defined', async () => {
        Object.defineProperty(globalThis, 'window', {
            configurable: true,
            writable: true,
            value: {},
        });

        const serverFetch = jest.fn(async () => new Response('server'));
        const browserFetch = jest.fn(async () => new Response('browser'));

        jest.doMock('@compliance-theater/types/dependency-injection', () => ({
            asFunction: (factory: unknown) => factory,
            registerServices: jest.fn(),
            resolveService: jest.fn(() => ({
                getOrCreate: () => browserFetch,
            })),
        }));
        jest.doMock('../src/server/fetch', () => ({ fetch: serverFetch }));
        jest.doMock('../src/fetch', () => ({ fetch: browserFetch }));

        const mod = await import('../src/index');
        const response = await mod.fetch('https://example.com');

        expect(await response.text()).toBe('browser');
        expect(browserFetch).toHaveBeenCalledTimes(1);
        expect(serverFetch).not.toHaveBeenCalled();
    });
});
