import {
    asClass,
    asFunction,
    asValue,
    BrowserServiceContainer,
    createContainer,
    isBrowserResolver,
} from '../../src/dependency-injection/container-browser';
import type { BrowserResolverRecord } from '../../src/dependency-injection/types';

describe('container-browser', () => {
    it('identifies browser resolver records', () => {
        const resolver = asValue({ id: 1 });

        expect(isBrowserResolver(resolver)).toBe(true);
        expect(isBrowserResolver(null)).toBe(false);
        expect(isBrowserResolver(undefined)).toBe(false);
        expect(isBrowserResolver(() => 1)).toBe(false);
        expect(isBrowserResolver({})).toBe(false);
    });

    it('creates class/function/value resolvers with expected metadata', () => {
        class Example {
            readonly value = 7;
        }

        const classResolver = asClass(Example) as BrowserResolverRecord<Example> & {
            kind: string;
            tag?: unknown;
        };
        const functionResolver = asFunction((cradle: { prefix: string }) => `${cradle.prefix}-ok`) as BrowserResolverRecord<string> & {
            kind: string;
        };
        const valueResolver = asValue('ready') as BrowserResolverRecord<string> & {
            kind: string;
            tag?: unknown;
        };

        expect(classResolver.kind).toBe('class');
        expect(classResolver.tag).toBe(Example);
        expect(classResolver.resolve({})).toBeInstanceOf(Example);

        expect(functionResolver.kind).toBe('function');
        expect(functionResolver.resolve({ prefix: 'test' })).toBe('test-ok');

        expect(valueResolver.kind).toBe('value');
        expect(valueResolver.tag).toBe('ready');
        expect(valueResolver.resolve({})).toBe('ready');
    });

    it('supports lifetime transitions and ignores invalid lifetime values', () => {
        const resolver = asValue(1) as BrowserResolverRecord<number>;

        expect(resolver.lifetime).toBe('TRANSIENT');
        resolver.singleton();
        expect(resolver.lifetime).toBe('SINGLETON');
        resolver.scoped();
        expect(resolver.lifetime).toBe('SCOPED');
        resolver.transient();
        expect(resolver.lifetime).toBe('TRANSIENT');

        resolver.setLifetime('INVALID');
        expect(resolver.lifetime).toBe('TRANSIENT');
        expect(resolver.inject({})).toBe(resolver);
        expect(resolver.is(resolver)).toBe(true);
    });

    it('throws when resolving a non-registered service', () => {
        const container = createContainer();

        expect(() => container.resolve('missing')).toThrow(
            'ServiceContainer.resolve: service "missing" is not registered.'
        );
    });

    it('registers and resolves by name and registration map', () => {
        const container = createContainer();

        container.register('alpha', asValue(1));
        container.register({
            bravo: asValue(2),
            charlie: asFunction(() => 3),
        });

        expect(container.resolve('alpha')).toBe(1);
        expect(container.resolve('bravo')).toBe(2);
        expect(container.resolve('charlie')).toBe(3);
    });

    it('throws when registering by name without resolver', () => {
        const container = createContainer();

        expect(() => container.register('missing-resolver')).toThrow(
            'ServiceContainer.register: resolver is required when registering by name ("missing-resolver").'
        );
    });

    it('wraps plain function registrations as function resolvers', () => {
        const container = createContainer();
        const factory = () => ({ marker: Math.random() });

        container.register('factory', factory);

        const first = container.resolve('factory') as { marker: number };
        const second = container.resolve('factory') as { marker: number };
        expect(first.marker).not.toBe(second.marker);
    });

    it('throws for unsupported non-browser resolver values', () => {
        const container = createContainer();
        const unsupported = { resolve: () => 1 };

        expect(() =>
            container.register('unsupported', unsupported as unknown as ReturnType<typeof asValue>)
        ).toThrow(
            'ServiceContainer.register: unsupported resolver for "unsupported" in browser/edge runtime. Use asValue/asClass/asFunction from this module.'
        );
    });

    it('supports has checks with and without resolver identity', () => {
        const container = createContainer();
        const first = asValue({ id: 1 });
        const second = asValue({ id: 2 });

        expect(container.has('value')).toBe(false);
        container.register('value', first);
        expect(container.has('value')).toBe(true);
        expect(container.has('value', first)).toBe(true);
        expect(container.has('value', second)).toBe(false);
    });

    it('applies transient/scoped/singleton lifetimes across scopes', () => {
        const root = createContainer();

        let singletonCreated = 0;
        let scopedCreated = 0;
        let transientCreated = 0;

        root.register(
            'singleton',
            (asFunction(() => ({ id: ++singletonCreated })) as BrowserResolverRecord).singleton()
        );
        root.register(
            'scoped',
            (asFunction(() => ({ id: ++scopedCreated })) as BrowserResolverRecord).scoped()
        );
        root.register(
            'transient',
            (asFunction(() => ({ id: ++transientCreated })) as BrowserResolverRecord).transient()
        );

        const scopeA = root.createScope() as BrowserServiceContainer;
        const scopeB = root.createScope() as BrowserServiceContainer;

        const singletonRoot = root.resolve('singleton') as { id: number };
        const singletonA = scopeA.resolve('singleton') as { id: number };
        const singletonB = scopeB.resolve('singleton') as { id: number };
        expect(singletonRoot).toBe(singletonA);
        expect(singletonA).toBe(singletonB);

        const scopedRoot1 = root.resolve('scoped') as { id: number };
        const scopedRoot2 = root.resolve('scoped') as { id: number };
        const scopedA = scopeA.resolve('scoped') as { id: number };
        const scopedB = scopeB.resolve('scoped') as { id: number };
        expect(scopedRoot1).toBe(scopedRoot2);
        expect(scopedRoot1).not.toBe(scopedA);
        expect(scopedA).not.toBe(scopedB);

        const transient1 = root.resolve('transient') as { id: number };
        const transient2 = root.resolve('transient') as { id: number };
        expect(transient1).not.toBe(transient2);
    });

    it('disposes registrations and scoped cache on async dispose', async () => {
        const container = createContainer();
        container.register('disposable', asValue('ok'));
        expect(container.resolve('disposable')).toBe('ok');

        await container[Symbol.asyncDispose]();

        expect(() => container.resolve('disposable')).toThrow(
            'ServiceContainer.resolve: service "disposable" is not registered.'
        );
    });
});