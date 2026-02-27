import type { ServiceCradle } from '../../src/dependency-injection';
import {
    asFunction,
    asValue,
    getServiceContainer,
    resolveService,
} from '../../src/dependency-injection';

const CONTAINER_SYMBOL = Symbol.for(
    '@compliance-theater/types/dependency-injection/container'
);

type TestGlobal = typeof globalThis & {
    [CONTAINER_SYMBOL]?: unknown;
    window?: unknown;
};

describe('browser container', () => {
    beforeEach(() => {
        const g = globalThis as TestGlobal;
        g.window = {};
        delete g[CONTAINER_SYMBOL];
    });

    afterEach(() => {
        const g = globalThis as TestGlobal;
        delete g.window;
        delete g[CONTAINER_SYMBOL];
    });

    it('resolves fetch-service via browser registrations', () => {
        const container = getServiceContainer();
        const fetchService = {
            fetch: jest.fn(),
        };

        container.register('fetch-service', asValue(fetchService));

        const resolved = resolveService('fetch-service');
        expect(resolved).toBe(fetchService);
    });

    it('creates singleton services in browser runtime', () => {
        const container = getServiceContainer();
        let created = 0;

        container.register(
            'browser-singleton',
            asFunction(() => ({ id: ++created })).singleton()
        );

        const first = container.resolve(
            'browser-singleton' as keyof ServiceCradle
        ) as { id: number };
        const second = container.resolve(
            'browser-singleton' as keyof ServiceCradle
        ) as { id: number };
        const scoped = container.createScope();
        const third = scoped.resolve(
            'browser-singleton' as keyof ServiceCradle
        ) as { id: number };

        expect(first).toBe(second);
        expect(second).toBe(third);
        expect(created).toBe(1);
    });
});
