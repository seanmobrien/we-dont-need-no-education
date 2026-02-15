/**
 * Optional app-startup accessor for lib-nextjs.
 * 
 * This module provides access to the application startup state if configured.
 * It uses a lazy singleton pattern so that lib-nextjs can be used without
 * requiring app-startup configuration.
 */

import type { AppStartupState } from '@compliance-theater/after';

let startupAccessor: (() => Promise<AppStartupState>) | undefined;

/**
 * Configure the app-startup accessor.
 * This should be called once during application initialization.
 * 
 * @param accessor - Function that returns the current startup state
 */
export const configureAppStartupAccessor = (
  accessor: () => Promise<AppStartupState>,
) => {
  startupAccessor = accessor;
};

/**
 * Get the current app startup state, if configured.
 * Returns 'ready' if no accessor is configured.
 * 
 * @returns Promise resolving to the current startup state
 */
export const getAppStartupState = async (): Promise<AppStartupState> => {
  if (!startupAccessor) {
    // Default to 'ready' if no accessor configured
    return 'ready';
  }
  return await startupAccessor();
};

/**
 * Check if app-startup is configured.
 * 
 * @returns true if an accessor has been configured
 */
export const isAppStartupConfigured = (): boolean => {
  return startupAccessor !== undefined;
};
