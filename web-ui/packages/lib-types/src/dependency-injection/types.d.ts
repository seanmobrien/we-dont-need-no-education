import type { IFetchService } from '@compliance-theater/types/lib/fetch';
import type {
    IAccessTokenService,
    IAuthSessionService,
    IImpersonationService,
    ITokenExchangeService,
} from '../lib/auth';
import type {
    AwilixContainer,
    Resolver,
    ResolveOptions,
    LifetimeType,
} from 'awilix';

/**
 * Type declarations for the Dependency Injection types module.
 *
 * Provides the core type contracts for working with the service container.
 * These types abstract over Awilix's implementation details, allowing
 * consumers to register and resolve services without coupling to the
 * underlying DI library.
 *
 * @module @compliance-theater/types/dependency-injection/types
 * @since 1.0.0
 */
declare module "@compliance-theater/types/dependency-injection/types" {

    /**
     * Optional resolve options.
     */
    export interface ResolveOptions {
        /**
         * If `true` and `resolve` cannot find the requested dependency,
         * returns `undefined` rather than throwing an error.
         */
        allowUnregistered?: boolean;
    }


    /**
     * Options for registering a service with the container.
     *
     * @property {LifetimeType} [lifetime] - The lifetime scope for the service.
     *   Defaults to `'SINGLETON'`. Possible values are `'SINGLETON'`, `'SCOPED'`,
     *   and `'TRANSIENT'`.
     *
     * @example
     * ```typescript
     * const options: ServiceRegistrationOptions = {
     *   lifetime: 'SCOPED',
     * };
     * ```
     */
    export type ServiceRegistrationOptions = {
        lifetime?: LifetimeType;
    };

    /**
     * A service resolver that Awilix can use to instantiate a service.
     *
     * Created via helper functions such as `asClass()`, `asFunction()`, or `asValue()`.
     *
     * @template T - The type of the resolved service instance.
     *
     * @example
     * ```typescript
     * import { asClass, asValue } from '@compliance-theater/types/dependency-injection';
     *
     * const classResolver: ServiceResolver<UserService> = asClass(UserService);
     * const valueResolver: ServiceResolver<AppConfig> = asValue({ port: 3000 });
     * ```
     */
    export type ServiceResolver<T = unknown> = Resolver<T>;

    /**
     * Options passed when resolving a service from the container.
     *
     * Wraps Awilix's `ResolveOptions` to control resolution behavior such as
     * allowing unregistered services.
     */
    export type ServiceResolveOptions = ResolveOptions;

    /**
     * The core service container interface.
     *
     * This wraps Awilix's container to provide a simplified, type-safe API for
     * registering and resolving services across the application. Packages interact
     * with this interface rather than the underlying Awilix container directly.
     *
     * @example
     * ```typescript
     * import { getServiceContainer, asClass, asValue } from '@compliance-theater/types/dependency-injection';
     *
     * const container = getServiceContainer();
     *
     * // Register services
     * container.register('config', asValue({ port: 3000 }));
     * container.register({
     *   userService: asClass(UserService),
     *   emailService: asClass(EmailService),
     * });
     *
     * // Resolve a service
     * const config = container.resolve('config');
     *
     * // Create a scoped container for per-request services
     * const scope = container.createScope();
     * ```
     */
    export interface IServiceContainer {
        /**
         * Resolve a service by name from the container.
         *
         * @template K - A key of {@link ServiceCradle}.
         * @param name - The registered service name.
         * @param options - Optional resolve options.
         * @returns The resolved service instance, typed according to the cradle.
         * @throws {AwilixResolutionError} If the service is not registered.
         *
         * @example
         * ```typescript
         * const logger = container.resolve('logger');
         * ```
         */
        resolve<TCradle extends Record<string, unknown>, K extends keyof TCradle>(
            name: K,
            options?: ServiceResolveOptions
        ): TCradle[K];

        /**
         * Check whether a service is registered in the container.
         *
         * @param name - The service name to check.
         * @returns `true` if the service is registered, `false` otherwise.
         *
         * @example
         * ```typescript
         * if (container.has('database')) {
         *   const db = container.resolve('database');
         * }
         * ```
         */
        has(name: string, resolver?: ServiceResolver): boolean;

        /**
         * Register one or more services with the container using a name-to-resolver record.
         *
         * @param registrations - A record mapping service names to Awilix resolvers.
         *
         * @example
         * ```typescript
         * container.register({
         *   config: asValue({ port: 3000 }),
         *   userService: asClass(UserService),
         * });
         * ```
         */
        register(registrations: Record<string, ServiceResolver>): void;

        /**
         * Register a single service by name with a resolver.
         *
         * @param name - The service name.
         * @param resolver - The Awilix resolver (e.g., `asClass(...)`, `asFunction(...)`, `asValue(...)`).
         *
         * @example
         * ```typescript
         * container.register('logger', asClass(ConsoleLogger).setLifetime(Lifetime.SINGLETON));
         * ```
         */
        register(name: string, resolver: ServiceResolver): void;

        /**
         * Create a scoped child container.
         *
         * Scoped containers inherit parent registrations but can override them
         * for a specific scope (e.g., per-request). Services registered with
         * `Lifetime.SCOPED` will be resolved once per scope.
         *
         * @returns A new scoped `IServiceContainer`.
         *
         * @example
         * ```typescript
         * // In a request handler:
         * const requestScope = container.createScope();
         * requestScope.register('requestId', asValue(req.id));
         * const handler = requestScope.resolve('requestHandler');
         * ```
         */
        createScope(): IServiceContainer;

        /**
         * Dispose all disposable services and clean up the container.
         *
         * Calls any registered disposers. After disposal the container should
         * not be used for further resolution.
         *
         * @returns A promise that resolves when disposal is complete.
         */
        dispose(): Promise<void>;
    }
}
