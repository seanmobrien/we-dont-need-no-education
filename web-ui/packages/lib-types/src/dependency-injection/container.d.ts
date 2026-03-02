import type {
    IServiceContainer,
    ServiceResolver,
    BrowserLifetime,
    IServiceRegistrarOverload
} from './types';

import type { ServiceCradle } from './service-cradle';


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
export const registerServices: IServiceRegistrarOverload;

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
export const asClass: <T>(...args: unknown[]) => ServiceResolver<T>;

/**
 * Create a resolver that calls a factory function.
 *
 * @example
 * ```typescript
 * container.register('dbPool', asFunction(createPool).setLifetime(Lifetime.SINGLETON));
 * ```
 */
export const asFunction: <T>(...args: unknown[]) => ServiceResolver<T>;

/**
 * Create a resolver that returns a fixed value.
 *
 * @example
 * ```typescript
 * container.register('config', asValue({ port: 3000 }));
 * ```
 */
export const asValue: <T>(...args: unknown[]) => ServiceResolver<T>;

/**
 * Enum-like object defining service lifetimes:
 * - `SINGLETON` — one instance for the entire container
 * - `SCOPED` — one instance per scope
 * - `TRANSIENT` — a new instance on every resolve
 */
export const Lifetime: BrowserLifetime;

