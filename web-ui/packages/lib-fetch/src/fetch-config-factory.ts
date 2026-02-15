/**
 * @fileoverview Factory management for FetchConfigManager instances
 *
 * This module provides a global factory pattern for creating FetchConfigManager
 * instances. It uses SingletonProvider to store an app-global factory function
 * that can be swapped out at runtime.
 */

import { SingletonProvider } from '@compliance-theater/typescript/singleton-provider';
import type { FetchConfigManager, FetchConfigManagerFactory } from './types';
import { SimpleFetchConfigManager } from './fetch-config';

/**
 * Key for storing the factory in SingletonProvider
 */
const FETCH_CONFIG_FACTORY_KEY = '@compliance-theater/fetch:config-factory';

/**
 * Default factory that creates SimpleFetchConfigManager instances
 */
const defaultFactory: FetchConfigManagerFactory = () => new SimpleFetchConfigManager();

/**
 * Get the current FetchConfigManager factory
 *
 * Returns the factory function that should be used to create FetchConfigManager
 * instances. If no custom factory has been set, returns the default factory.
 *
 * @returns The current factory function
 *
 * @example
 * ```typescript
 * const factory = getFetchConfigFactory();
 * const manager = factory(); // Create a new manager instance
 * ```
 */
export function getFetchConfigFactory(): FetchConfigManagerFactory {
  return (
    SingletonProvider.Instance.get<FetchConfigManagerFactory>(
      FETCH_CONFIG_FACTORY_KEY,
    ) ?? defaultFactory
  );
}

/**
 * Set a custom FetchConfigManager factory
 *
 * Replaces the current factory with a new one. Pass null or undefined to
 * revert to the default factory.
 *
 * @param factory - The factory function to use, or null/undefined to reset to default
 *
 * @example
 * ```typescript
 * // Set a custom factory
 * setFetchConfigFactory(() => new MyCustomFetchConfigManager());
 *
 * // Later, reset to default
 * setFetchConfigFactory(null);
 * ```
 */
export function setFetchConfigFactory(
  factory: FetchConfigManagerFactory | null | undefined,
): void {
  if (factory === null || factory === undefined) {
    // Revert to default factory
    SingletonProvider.Instance.delete(FETCH_CONFIG_FACTORY_KEY);
  } else {
    SingletonProvider.Instance.set(FETCH_CONFIG_FACTORY_KEY, factory);
  }
}
