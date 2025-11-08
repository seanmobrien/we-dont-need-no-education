/**
 * @fileoverview Singleton Provider Module
 *
 * This module provides a comprehensive singleton management system for TypeScript applications.
 * It offers both global and scoped singleton storage with configurable memory management strategies,
 * including support for WeakMap-based storage to prevent memory leaks in long-running applications.
 *
 * The module implements a two-tier singleton system:
 * 1. **Global Singletons**: Stored on the global scope using Symbol.for() keys
 * 2. **Scoped Singletons**: Managed through the SingletonProvider instance with WeakMap support
 *
 * Key features:
 * - Memory-efficient singleton storage with WeakMap support
 * - Type-safe singleton creation and retrieval
 * - Automatic cleanup and resource management
 * - Configurable storage strategies (strong vs weak references)
 * - Thread-safe operations for Node.js environments
 *
 * @example
 * ```typescript
 * import { SingletonProvider, globalSingleton } from '@/lib/typescript/singleton-provider';
 *
 * // Using the global singleton function
 * const dbConnection = globalSingleton('database', () => createDatabaseConnection());
 *
 * // Using the SingletonProvider instance for scoped singletons
 * const provider = SingletonProvider.Instance;
 *
 * // Create a singleton with weak references for better memory management
 * const cache = provider.getOrCreate('app-cache', () => new Map(), { weakRef: true });
 *
 * // Check if a singleton exists
 * if (provider.has('user-session')) {
 *   const session = provider.get('user-session');
 *   // Use existing session
 * } else {
 *   // Create new session
 *   const newSession = provider.getOrCreate('user-session', createSession);
 * }
 *
 * // Clean up when done
 * provider.clear();
 * ```
 *
 * @since 1.0.0
 * @version 1.0.0
 */

import { SingletonProvider } from './provider';
import type { IsNotNull } from '../_types';
import type { SingletonConfig } from './types';

export type { SingletonConfig, SingletonStorageStrategy } from './types';
export { SingletonProvider } from './provider';

export const globalSingleton = <T, S extends string | symbol = string>(
  symbol: S,
  factory: () => IsNotNull<T>,
  config: SingletonConfig = {},
): T => SingletonProvider.Instance.getOrCreate<T, S>(symbol, factory, config);

export const globalSingletonAsync = <T, S extends string | symbol = string>(
  symbol: S,
  factory: () => Promise<IsNotNull<T>>,
  config: SingletonConfig = {},
): Promise<T> =>
  SingletonProvider.Instance.getOrCreateAsync<T, S>(symbol, factory, config);
