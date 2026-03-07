import type {
    IAccessTokenService,
    IAuthSessionService,
    IImpersonationService,
    ITokenExchangeService,
} from '../lib/auth';
import type { IFetchService } from '../lib/fetch';

/**
 * @module @compliance-theater/types/dependency-injection
 * Defines types for the dependency injection container and service registration.
 * This module provides the `IServiceContainer` interface and related types for
 * registering and resolving services across the application.
 * The `ServiceCradle` interface represents the shape of the resolved services,
 * and should be extended via module augmentation to declare application-specific
 * services.
 * @since 1.0.0
 * @see {@link IServiceContainer} for the main container interface.
 * @see {@link ServiceCradle} for the shape of resolved services.
 */


/**
 * A record mapping service names to their resolved types.
 *
 * Extend this interface via module augmentation to get type-safe resolution
 * across the application. Each package can declare its own services by
 * augmenting this interface.
 *
 * @property fetch - The fetch service for making HTTP requests
 * @property session - The authentication session service
 * @property impersonation - The impersonation service for user impersonation
 * @property accessTokens - The access token service for managing tokens
 * @property exchangeTokens - The token exchange service for exchanging tokens
 * @property startup - The app startup manager for managing application startup state
 * @property after - The After manager for managing After lifecycle events
 * @property singleton - The singleton provider for managing singleton instances 
 * 
 * @example
 * ```typescript
 * // In your package's types file:
 * declare module '@compliance-theater/types/dependency-injection' {
 *   interface ServiceCradle {
 *     logger: Logger;
 *     database: Database;
 *     config: AppConfig;
 *   }
 * }
 *
 * // Now resolution is type-safe:
 * const logger = resolveService('logger'); // typed as Logger
 * ```
 */
export interface ServiceCradle extends Record<string, unknown> {
  fetch: IFetchService;
  session: IAuthSessionService;
  impersonation: IImpersonationService;
  accessTokens: IAccessTokenService;
  exchangeTokens: ITokenExchangeService;
  startup: IAppStartupManager;
  after: IAfterManager;
  singleton: ISingletonProvider;
}
