/**
 * Type declarations for the Service Container implementation module.
 *
 * Provides the concrete `ServiceContainer` class backed by Awilix, along with
 * convenience helpers for getting, registering, and resolving services on the
 * global root container instance.
 *
 * @module @compliance-theater/types/dependency-injection/container
 * @since 1.0.0
 */

declare module "@compliance-theater/types/dependency-injection/container" {
    import type { AwilixContainer } from 'awilix';
    import type {
        IServiceContainer,
        ServiceCradle,
        ServiceResolver,
        ServiceResolveOptions,
    } from './types';

    /**
     * A wrapper around an Awilix container implementing {@link IServiceContainer}.
     *
     * The `ServiceContainer` class manages a process-global root container
     * stored on `globalThis` via a well-known `Symbol.for()` key. This ensures
     * a single container instance survives across multiple package copies or
     * module bundles.
     *
     * Use the static `ServiceContainer.Root` accessor to get the shared root
     * instance, or call `createScope()` to create a child scope for per-request
     * or per-operation isolation.
     *
     * @example
     * ```typescript
     * import { ServiceContainer } from '@compliance-theater/types/dependency-injection';
     *
     * // Access the global root container
     * const root = ServiceContainer.Root;
     *
     * // Register a service
     * root.register('config', asValue({ port: 3000 }));
     *
     * // Create a scoped container for per-request isolation
     * const scope = root.createScope();
     * scope.register('requestId', asValue('abc-123'));
     * ```
     */
    export class ServiceContainer implements IServiceContainer {
        /**
         * The globally shared root service container.
         *
         * This is a true singleton — the instance is stored on `globalThis` using
         * a well-known `Symbol.for()` key so it survives across module copies.
         * The container is lazily created on first access with `InjectionMode.CLASSIC`
         * and strict mode enabled.
         *
         * @static
         * @returns The global root `ServiceContainer` instance.
         *
         * @example
         * ```typescript
         * const root = ServiceContainer.Root;
         * root.register('logger', asClass(ConsoleLogger));
         * ```
         */
        static get Root(): ServiceContainer;

        #private;
        private constructor(container: AwilixContainer<ServiceCradle>);

        /** @inheritdoc */
        get container(): AwilixContainer<ServiceCradle>;

        /** @inheritdoc */
        resolve<K extends keyof ServiceCradle>(
            name: K,
            options?: ServiceResolveOptions
        ): ServiceCradle[K];

        /** @inheritdoc */
        has(name: string): boolean;

        /**
         * Register services with the container.
         *
         * Accepts either a single name + resolver pair or a record of
         * name-to-resolver mappings.
         *
         * @param nameOrRegistrations - A service name string, or a record of registrations.
         * @param resolver - An Awilix resolver (required when `nameOrRegistrations` is a string).
         * @throws {TypeError} If a string name is provided without a resolver.
         *
         * @example
         * ```typescript
         * // Single service
         * container.register('config', asValue({ port: 3000 }));
         *
         * // Multiple services
         * container.register({
         *   userService: asClass(UserService),
         *   emailService: asFunction(createEmailService),
         * });
         * ```
         */
        register(
            nameOrRegistrations: string | Record<string, ServiceResolver>,
            resolver?: ServiceResolver
        ): void;

        /** @inheritdoc */
        createScope(): IServiceContainer;

        /** @inheritdoc */
        dispose(): Promise<void>;
    }

    /**
     * Returns the global root service container.
     *
     * This is the primary entry point for accessing the DI container.
     * Equivalent to `ServiceContainer.Root`.
     *
     * @returns The shared `IServiceContainer` instance.
     *
     * @example
     * ```typescript
     * import { getServiceContainer } from '@compliance-theater/types/dependency-injection';
     *
     * const container = getServiceContainer();
     * const logger = container.resolve('logger');
     * ```
     */
    export const getServiceContainer: () => IServiceContainer;

    /**
     * Register services on the global root container.
     *
     * Accepts a record of name → resolver pairs. This is the primary way
     * packages should contribute services at startup.
     *
     * @param registrations - A record mapping service names to Awilix resolvers.
     *
     * @example
     * ```typescript
     * import { registerServices, asValue, asClass, Lifetime } from '@compliance-theater/types/dependency-injection';
     *
     * registerServices({
     *   config: asValue({ port: 3000 }),
     *   userService: asClass(UserService).setLifetime(Lifetime.SINGLETON),
     * });
     * ```
     */
    export const registerServices: (
        registrations: Record<string, ServiceResolver>
    ) => void;

    /**
     * Resolve a single service from the root container by name.
     *
     * Shorthand for `getServiceContainer().resolve(name)`.
     *
     * @template K - A key of {@link ServiceCradle}.
     * @param name - The registered service name.
     * @returns The resolved service instance, typed according to the cradle.
     * @throws {AwilixResolutionError} If the service is not registered.
     *
     * @example
     * ```typescript
     * import { resolveService } from '@compliance-theater/types/dependency-injection';
     *
     * const db = resolveService('database');
     * ```
     */
    export const resolveService: <K extends keyof ServiceCradle>(
        name: K
    ) => ServiceCradle[K];

    // ── Re-exported Awilix Utilities ────────────────────────────────────────────

    /**
     * Create a resolver that instantiates a class.
     *
     * @example
     * ```typescript
     * container.register('userService', asClass(UserService).setLifetime(Lifetime.SINGLETON));
     * ```
     */
    export { asClass } from 'awilix';

    /**
     * Create a resolver that calls a factory function.
     *
     * @example
     * ```typescript
     * container.register('dbPool', asFunction(createPool).setLifetime(Lifetime.SINGLETON));
     * ```
     */
    export { asFunction } from 'awilix';

    /**
     * Create a resolver that returns a fixed value.
     *
     * @example
     * ```typescript
     * container.register('config', asValue({ port: 3000 }));
     * ```
     */
    export { asValue } from 'awilix';

    /**
     * Enum-like object defining service lifetimes:
     * - `SINGLETON` — one instance for the entire container
     * - `SCOPED` — one instance per scope
     * - `TRANSIENT` — a new instance on every resolve
     */
    export { Lifetime } from 'awilix';

    /**
     * Enum-like object defining injection modes:
     * - `CLASSIC` — resolve dependencies by constructor parameter names
     * - `PROXY` — resolve dependencies via a proxy cradle object
     */
    export { InjectionMode } from 'awilix';
}
