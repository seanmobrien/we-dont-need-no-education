/**
 * Optional app-startup accessor for lib-nextjs.
 * 
 * This module provides access to the application startup state if configured.
 * It uses a lazy singleton pattern so that lib-nextjs can be used without
 * requiring app-startup configuration.
 */

import type { AppStartupState } from '@compliance-theater/after/app-startup';
import type { IAppStartupManager } from '@compliance-theater/types/after';
import { resolveService } from '@compliance-theater/types/dependency-injection/container';
import { deprecate } from '@compliance-theater/types/deprecate';

/**
 * Configure the app-startup accessor.
 * This should be called once during application initialization.
 * 
 * @param accessor - Function that returns the current startup state
 */
export const configureAppStartupAccessor = (
  _accessor: () => Promise<AppStartupState>,
) => {
  // no-op: retained for backward compatibility while startup resolves via DI.
};

/**
 * Get the current app startup state, if configured.
 * Returns 'ready' if no accessor is configured.
 * 
 * @returns Promise resolving to the current startup state
 */
export const getAppStartupState = deprecate(
  (): Promise<AppStartupState> =>
    resolveService<IAppStartupManager>('startup').getStartupState(),
  'getAppStartupState is deprecated. Please use registered IAppStartupManager directly instead.',
  'DEP006'); 