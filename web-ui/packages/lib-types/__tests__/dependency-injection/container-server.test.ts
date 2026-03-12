type MockContainer = {
    registrations: Record<string, unknown>;
    resolve: jest.Mock;
    hasRegistration: jest.Mock;
    register: jest.Mock;
    createScope: jest.Mock;
    dispose: jest.Mock;
};

const mockAwilixCreateContainer = jest.fn();
const mockAwilixAsClass = jest.fn((ctor: unknown) => ({ kind: 'class', ctor }));
const mockAwilixAsFunction = jest.fn((fn: unknown) => ({ kind: 'function', fn }));
const mockAwilixAsValue = jest.fn((value: unknown) => ({ kind: 'value', value }));

const createMockContainer = (): MockContainer => {
    const registrations: Record<string, unknown> = {};
    const instance: MockContainer = {
        registrations,
        resolve: jest.fn((name: string) => {
            const registration = registrations[name] as { resolve?: (state: unknown) => unknown; value?: unknown } | undefined;
            if (registration?.resolve) {
                return registration.resolve({});
            }
            if ('value' in (registration ?? {})) {
                return registration?.value;
            }
            return registration;
        }),
        hasRegistration: jest.fn((name: string) => Object.prototype.hasOwnProperty.call(registrations, name)),
        register: jest.fn((nameOrRegistrations: string | Record<string, unknown>, resolver?: unknown) => {
            if (typeof nameOrRegistrations === 'string') {
                registrations[nameOrRegistrations] = resolver;
                return;
            }
            Object.assign(registrations, nameOrRegistrations);
        }),
        createScope: jest.fn(() => createMockContainer()),
        dispose: jest.fn(async () => undefined),
    };
    return instance;
};

jest.mock('awilix', () => ({
    InjectionMode: {
        CLASSIC: 'CLASSIC',
    },
    AwilixContainer: class { },
    createContainer: (...args: unknown[]) => mockAwilixCreateContainer(...args),
    asClass: (...args: unknown[]) => mockAwilixAsClass(...args),
    asFunction: (...args: unknown[]) => mockAwilixAsFunction(...args),
    asValue: (...args: unknown[]) => mockAwilixAsValue(...args),
}));

import {
    asClass,
    asFunction,
    asValue,
    createContainer,
} from '../../src/dependency-injection/container-server';

describe('container-server', () => {
    beforeEach(() => {
        mockAwilixCreateContainer.mockReset();
        mockAwilixAsClass.mockClear();
        mockAwilixAsFunction.mockClear();
        mockAwilixAsValue.mockClear();
        mockAwilixCreateContainer.mockImplementation(() => createMockContainer());
    });

    it('creates awilix container with expected options', () => {
        createContainer();

        expect(mockAwilixCreateContainer).toHaveBeenCalledWith({
            injectionMode: 'CLASSIC',
            strict: true,
        });
    });

    it('registers by name with resolver object and resolves value', () => {
        const container = createContainer();
        const resolver = { resolve: () => 'ready' };

        container.register('service', resolver);

        expect(container.resolve('service')).toBe('ready');
        expect(container.has('service', resolver)).toBe(true);
    });

    it('wraps plain function registration into resolver object', () => {
        const container = createContainer();
        const factory = () => 42;

        container.register('answer', factory);

        const registration = (container.container.registrations.answer as { resolve: () => unknown });
        expect(typeof registration.resolve).toBe('function');
        expect(registration.resolve()).toBe(42);
        expect(container.resolve('answer')).toBe(42);
    });

    it('registers maps and delegates resolve options', () => {
        const container = createContainer();
        const resolver = { resolve: () => 'bulk' };

        container.register({ bulk: resolver });
        const options = { allowUnregistered: true };
        container.resolve('bulk', options);

        expect(container.container.resolve).toHaveBeenCalledWith('bulk', options);
        expect(container.resolve('bulk')).toBe('bulk');
    });

    it('throws when registering by name without resolver', () => {
        const container = createContainer();

        expect(() => container.register('missing')).toThrow(
            'ServiceContainer.register: resolver is required when registering by name ("missing").'
        );
    });

    it('supports has checks for missing and mismatched resolver', () => {
        const container = createContainer();
        const first = { resolve: () => 1 };
        const second = { resolve: () => 2 };

        expect(container.has('value')).toBe(false);
        container.register('value', first);
        expect(container.has('value', second)).toBe(false);
        expect(container.has('value', first)).toBe(true);
    });

    it('creates scopes backed by awilix createScope and supports async dispose', async () => {
        const container = createContainer();
        const scope = container.createScope();

        expect(container.container.createScope).toHaveBeenCalledTimes(1);
        expect(scope).toBeDefined();

        await container[Symbol.asyncDispose]();
        expect(container.container.dispose).toHaveBeenCalledTimes(1);
    });

    it('re-exports awilix resolver helpers', () => {
        const classCtor = class Example { };
        const functionFactory = () => 'ok';
        const value = { id: 1 };

        expect(asClass(classCtor)).toEqual({ kind: 'class', ctor: classCtor });
        expect(asFunction(functionFactory)).toEqual({ kind: 'function', fn: functionFactory });
        expect(asValue(value)).toEqual({ kind: 'value', value });

        expect(mockAwilixAsClass).toHaveBeenCalledWith(classCtor);
        expect(mockAwilixAsFunction).toHaveBeenCalledWith(functionFactory);
        expect(mockAwilixAsValue).toHaveBeenCalledWith(value);
    });
});