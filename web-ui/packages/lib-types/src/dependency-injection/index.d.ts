/**
 * Type declarations for the Dependency Injection module.
 *
 * Provides a shared, process-global service container backed by Awilix.
 * Packages register their services at startup and resolve them at runtime
 * without needing decorators or `reflect-metadata`.
 *
 * @module @compliance-theater/types/dependency-injection
 *
 * @example
 * ```typescript
 * import {
 *   getServiceContainer,
 *   registerServices,
 *   resolveService,
 *   asClass,
 *   asValue,
 *   Lifetime,
 * } from '@compliance-theater/types/dependency-injection';
 *
 * // Register services
 * registerServices({
 *   config: asValue({ port: 3000, dbUrl: '...' }),
 *   userService: asClass(UserService).setLifetime(Lifetime.SINGLETON),
 * });
 *
 * // Resolve a service
 * const config = resolveService('config');
 * ```
 *
 * See the `README.md` in this directory for full documentation.
 *
 * @since 1.0.0
 */


// ── Types ──────────────────────────────────────────────────────────────────
export type {
    IServiceContainer,
    ServiceCradle,
    ServiceRegistrationOptions,
    ServiceResolver,
    ServiceResolveOptions,
} from './types';

// ── Container Implementation & Helpers ─────────────────────────────────────
export {
    ServiceContainer,
    getServiceContainer,
    registerServices,
    resolveService,
} from './container';

// ── Re-exported Awilix Utilities ───────────────────────────────────────────
export {
    asClass,
    asFunction,
    asValue,
    Lifetime,
    InjectionMode,
} from './container';

