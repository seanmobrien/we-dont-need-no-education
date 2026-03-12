import {
    isRunningOnClient,
    isRunningOnEdge,
    isRunningOnServer,
} from '../src/is-running-on';

describe('is-running-on', () => {
    const originalNextRuntime = process.env.NEXT_RUNTIME;
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

    const setWindow = (value: unknown): void => {
        Object.defineProperty(globalThis, 'window', {
            configurable: true,
            writable: true,
            value,
        });
    };

    const restoreWindow = (): void => {
        if (originalWindow) {
            Object.defineProperty(globalThis, 'window', originalWindow);
            return;
        }
        delete (globalThis as { window?: unknown }).window;
    };

    beforeEach(() => {
        delete (globalThis as { window?: unknown }).window;
        delete process.env.NEXT_RUNTIME;
    });

    afterAll(() => {
        if (originalNextRuntime === undefined) {
            delete process.env.NEXT_RUNTIME;
        } else {
            process.env.NEXT_RUNTIME = originalNextRuntime;
        }
        restoreWindow();
    });

    it('detects nodejs runtime as server', () => {
        process.env.NEXT_RUNTIME = 'nodejs';

        expect(isRunningOnServer()).toBe(true);
        expect(isRunningOnEdge()).toBe(false);
    });

    it('detects edge runtime as edge', () => {
        process.env.NEXT_RUNTIME = 'edge';

        expect(isRunningOnEdge()).toBe(true);
        expect(isRunningOnServer()).toBe(false);
    });

    it('detects client when window exists and runtime is not edge', () => {
        process.env.NEXT_RUNTIME = 'nodejs';
        setWindow({});

        expect(isRunningOnClient()).toBe(true);
    });

    it('returns false for client when window is missing', () => {
        process.env.NEXT_RUNTIME = 'nodejs';
        delete (globalThis as { window?: unknown }).window;

        expect(isRunningOnClient()).toBe(false);
    });

    it('returns false for client in edge runtime even when window exists', () => {
        process.env.NEXT_RUNTIME = 'edge';
        setWindow({});

        expect(isRunningOnClient()).toBe(false);
    });
});