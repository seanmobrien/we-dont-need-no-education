import { asValue, getServiceContainer } from '../../src/dependency-injection';
import { resetRuntime } from '../../src/dependency-injection/container';

type MockResolver = { kind: 'value'; value: unknown };

jest.mock('awilix', () => {
    const createContainer = () => {
        const registrations: Record<string, unknown> = {};
        return {
            registrations,
            resolve: (name: string) => (registrations[name] as MockResolver)?.value,
            hasRegistration: (name: string) =>
                Object.prototype.hasOwnProperty.call(registrations, name),
            register: (
                nameOrRegistrations: string | Record<string, unknown>,
                resolver?: unknown
            ) => {
                if (typeof nameOrRegistrations === 'string') {
                    registrations[nameOrRegistrations] = resolver;
                    return;
                }
                Object.assign(registrations, nameOrRegistrations);
            },
            createScope: () => createContainer(),
            dispose: async () => { },
        };
    };

    return {
        InjectionMode: {
            CLASSIC: 'CLASSIC',
        },
        createContainer,
        asValue: (value: unknown) => ({ kind: 'value', value }),
        asFunction: (factory: unknown) => factory,
        asClass: (ctor: unknown) => ctor,
    };
});

const CONTAINER_SYMBOL = Symbol.for(
    '@compliance-theater/types/dependency-injection/container'
);

type TestGlobal = typeof globalThis & {
    [CONTAINER_SYMBOL]?: unknown;
    window?: unknown;
};

describe('node container', () => {
    beforeEach(() => {
        const g = globalThis as TestGlobal;
        delete (g as { window?: unknown }).window;
        delete g[CONTAINER_SYMBOL];
    });

    afterEach(() => {
        const g = globalThis as TestGlobal;
        delete g[CONTAINER_SYMBOL];
        resetRuntime();
    });

    it('supports resolver-aware has checks in node runtime', () => {
        const container = getServiceContainer();
        const firstResolver = asValue({ id: 1 });
        const secondResolver = asValue({ id: 2 });

        expect(container.has('node-has-service')).toBe(false);
        expect(container.has('node-has-service', firstResolver)).toBe(false);

        container.register('node-has-service', firstResolver);
        expect(container.has('node-has-service')).toBe(true);
        expect(container.has('node-has-service', undefined)).toBe(true);
        expect(container.has('node-has-service', firstResolver)).toBe(true);
        expect(container.has('node-has-service', secondResolver)).toBe(false);

        container.register('node-has-service', secondResolver);
        expect(container.has('node-has-service')).toBe(true);
        expect(container.has('node-has-service', firstResolver)).toBe(false);
        expect(container.has('node-has-service', secondResolver)).toBe(true);
    });
});
