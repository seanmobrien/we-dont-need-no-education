import type { ServiceCradle } from '../../src/dependency-injection/service-cradle';
import {
    asFunction,
    asValue,
    getServiceContainer,
    resolveService,
} from '../../src/dependency-injection';
import { resetRuntime } from '../../src/dependency-injection/container';
import { BrowserResolverRecord } from '../../src/dependency-injection/types';

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
        g.window = {} as Window & typeof globalThis;
        delete g[CONTAINER_SYMBOL];
    });

    afterEach(() => {
        const g = globalThis as TestGlobal;
        g.window = {} as Window & typeof globalThis;
        delete g[CONTAINER_SYMBOL];
        resetRuntime();
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
            (asFunction(() => ({ id: ++created })) as BrowserResolverRecord).singleton()
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

    it('supports resolver-aware has checks in browser runtime', () => {
        const container = getServiceContainer();
        const firstResolver = asValue({ id: 1 });
        const secondResolver = asValue({ id: 2 });

        expect(container.has('browser-has-service')).toBe(false);
        expect(container.has('browser-has-service', firstResolver)).toBe(false);

        container.register('browser-has-service', firstResolver);
        expect(container.has('browser-has-service')).toBe(true);
        expect(container.has('browser-has-service', undefined)).toBe(true);
        expect(container.has('browser-has-service', firstResolver)).toBe(true);
        expect(container.has('browser-has-service', secondResolver)).toBe(false);

        container.register('browser-has-service', secondResolver);
        expect(container.has('browser-has-service')).toBe(true);
        expect(container.has('browser-has-service', firstResolver)).toBe(false);
        expect(container.has('browser-has-service', secondResolver)).toBe(true);
    });
});
