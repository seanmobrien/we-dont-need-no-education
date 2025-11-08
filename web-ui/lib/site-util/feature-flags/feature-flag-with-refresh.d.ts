/**
 * @fileoverview Auto-refreshing feature flag system with lifecycle management
 *
 * This module provides a robust auto-refreshing feature flag implementation that
 * stays synchronized with Flagsmith. It includes proper lifecycle management,
 * error tracking, concurrent request handling, and resource cleanup.
 *
 * ## Key Features
 *
 * - **Auto-refresh**: Automatically refreshes stale values in the background
 * - **Lifecycle Management**: Proper construction, usage, and disposal patterns
 * - **Error Tracking**: Comprehensive error handling with lastError tracking
 * - **Concurrency Control**: Prevents duplicate simultaneous refreshes
 * - **Resource Cleanup**: AbortController integration for proper cancellation
 * - **Type Safety**: Full TypeScript generic support for flag types
 *
 * ## Usage Pattern
 *
 * ```typescript
 * // Create instance
 * const flag = await createAutoRefreshFeatureFlag({
 *   key: 'models_azure',
 *   userId: 'user-123',
 *   ttl: 5 * 60 * 1000
 * });
 *
 * // Use value (auto-refreshes when stale)
 * const enabled = flag.value;
 *
 * // Check status
 * if (flag.isStale) {
 *   await flag.forceRefresh();
 * }
 *
 * // Cleanup
 * flag.dispose();
 * ```
 *
 * @module site-util/feature-flags/feature-flag-with-refresh
 */

import { FeatureFlagValueType, KnownFeatureType } from './known-feature';

declare module '@/lib/site-util/feature-flags/feature-flag-with-refresh' {
  /**
   * Auto-refreshing feature flag that stays synchronized with Flagsmith.
   *
   * Provides automatic background refresh when values become stale, with proper
   * lifecycle management, error tracking, and concurrent request handling.
   *
   * ## Architecture
   *
   * - **Private Constructor**: Use static `create()` factory method
   * - **Immutable Config**: Key, userId, and TTL are readonly after creation
   * - **Controlled State**: All mutable state is private with getter access
   * - **Proper Cleanup**: dispose() cancels pending operations and prevents further use
   *
   * ## Lifecycle
   *
   * 1. **Creation**: `createAutoRefreshFeatureFlag()` initializes instance
   * 2. **Usage**: Access `.value` triggers auto-refresh when stale
   * 3. **Disposal**: Call `.dispose()` to clean up resources
   * 4. **Post-disposal**: Accessing disposed instance throws error
   *
   * ## Error Handling
   *
   * - Errors are logged via LoggedError system
   * - Last error accessible via `lastError` property
   * - Failed refreshes return cached stale value
   * - Disposal state enforced on all operations
   *
   * @template T - The feature flag key type from KnownFeatureType
   *
   * @example
   * ```typescript
   * // Basic usage
   * const flag = await createAutoRefreshFeatureFlag({
   *   key: 'models_azure',
   *   userId: 'user-123',
   *   ttl: 5 * 60 * 1000 // 5 minutes
   * });
   *
   * // Access value (auto-refreshes when stale)
   * const enabled = flag.value;
   *
   * // Check staleness
   * if (flag.isStale) {
   *   console.log('Value may be outdated');
   * }
   *
   * // Manual refresh
   * await flag.forceRefresh();
   *
   * // Check for errors
   * if (flag.lastError) {
   *   console.error('Last refresh failed:', flag.lastError);
   * }
   *
   * // Cleanup when done
   * flag.dispose();
   * ```
   *
   * @example
   * ```typescript
   * // Without user ID (uses authenticated user)
   * const flag = await createAutoRefreshFeatureFlag({
   *   key: 'mcp_cache_tools',
   *   initialValue: false
   * });
   *
   * // Use in try-finally for guaranteed cleanup
   * const flag = await createAutoRefreshFeatureFlag({
   *   key: 'models_fetch_enhanced'
   * });
   * try {
   *   const value = flag.value;
   *   // ... use value
   * } finally {
   *   flag.dispose();
   * }
   * ```
   */
  export type AutoRefreshFeatureFlag<T extends KnownFeatureType> = {
    /**
     * Current feature flag value.
     *
     * Returns the cached value immediately without waiting. If the value is stale,
     * triggers an asynchronous background refresh (does not block).
     *
     * ## Behavior
     *
     * - **Fresh value**: Returns immediately
     * - **Stale value**: Returns cached value, triggers background refresh
     * - **Disposed**: Throws error
     * - **Refresh in progress**: Returns current value, doesn't trigger duplicate
     *
     * ## Performance
     *
     * This getter is designed for high-frequency access with minimal overhead.
     * Background refreshes don't block the caller, ensuring responsive applications.
     *
     * @throws {Error} If feature flag has been disposed
     *
     * @example
     * ```typescript
     * // Simple access
     * const enabled = flag.value;
     * ```
     *
     * @example
     * ```typescript
     * // High-frequency polling
     * setInterval(() => {
     *   const value = flag.value; // Non-blocking
     *   updateUI(value);
     * }, 1000);
     * ```
     *
     * @example
     * ```typescript
     * // Error handling
     * try {
     *   const value = flag.value;
     * } catch (error) {
     *   console.error('Flag disposed:', error);
     * }
     * ```
     */
    get value(): FeatureFlagValueType<T>;

    /**
     * Last error encountered during refresh, or null if no errors.
     *
     * Provides visibility into refresh failures without throwing. Useful for
     * monitoring, logging, and degraded-mode detection.
     *
     * ## Error Lifecycle
     *
     * - Set when refresh fails
     * - Cleared when next refresh succeeds
     * - Cleared at start of each refresh attempt
     * - Persists across multiple value accesses
     *
     * @example
     * ```typescript
     * const value = flag.value;
     * if (flag.lastError) {
     *   console.error('Using stale value due to:', flag.lastError.message);
     *   metrics.incrementCounter('feature_flag_error');
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Monitoring loop
     * setInterval(() => {
     *   if (flag.lastError) {
     *     alerting.send({
     *       severity: 'warning',
     *       message: `Feature flag ${flag.key} refresh failing`,
     *       error: flag.lastError
     *     });
     *   }
     * }, 60000);
     * ```
     */
    get lastError(): Error | null;

    /**
     * Unix timestamp (milliseconds) when the cached value expires.
     *
     * Represents the absolute time when the cached value becomes stale and
     * requires refresh. Useful for calculating remaining time or coordinating
     * with other time-based operations.
     *
     * @example
     * ```typescript
     * const expiresIn = flag.expiresAt - Date.now();
     * console.log(`Value expires in ${expiresIn}ms`);
     * ```
     *
     * @example
     * ```typescript
     * // Check if expires soon
     * const expiresInSeconds = (flag.expiresAt - Date.now()) / 1000;
     * if (expiresInSeconds < 30) {
     *   console.log('Value expires in less than 30 seconds');
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Format expiration time
     * const expirationDate = new Date(flag.expiresAt);
     * console.log(`Expires at: ${expirationDate.toISOString()}`);
     * ```
     */
    get expiresAt(): number;

    /**
     * Time remaining in milliseconds until the cached value becomes stale.
     *
     * Convenience getter that calculates the time until expiration. Returns 0
     * if already stale (never negative).
     *
     * ## Use Cases
     *
     * - Progress bars showing freshness
     * - Pre-emptive refresh scheduling
     * - Cache warmth metrics
     * - UI freshness indicators
     *
     * @returns Number of milliseconds until expiration (0 if already stale)
     *
     * @example
     * ```typescript
     * const remaining = flag.ttlRemaining;
     * console.log(`${remaining}ms until refresh needed`);
     * ```
     *
     * @example
     * ```typescript
     * // Pre-emptive refresh
     * if (flag.ttlRemaining < 10000) { // Less than 10 seconds
     *   await flag.forceRefresh();
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Freshness percentage
     * const ttl = 180000; // 3 minutes
     * const freshness = (flag.ttlRemaining / ttl) * 100;
     * console.log(`Cache ${freshness.toFixed(1)}% fresh`);
     * ```
     */
    get ttlRemaining(): number;

    /**
     * Whether the cached value is stale and needs refresh.
     *
     * Returns true if current time exceeds the expiration timestamp. Stale
     * values trigger background refresh on next access.
     *
     * @example
     * ```typescript
     * if (flag.isStale) {
     *   console.log('Value is outdated');
     *   await flag.forceRefresh();
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Conditional logic
     * const value = flag.value;
     * if (flag.isStale) {
     *   showWarning('Using potentially outdated configuration');
     * }
     * ```
     */
    get isStale(): boolean;

    /**
     * User ID this feature flag is evaluated for.
     *
     * Returns the resolved user ID used for Flagsmith evaluation. This is the
     * actual ID used (after resolving defaults), not the originally provided value.
     *
     * ## Possible Values
     *
     * - Explicit `userId` from create options
     * - Authenticated user's hash from session
     * - 'server' if no user context available
     *
     * @example
     * ```typescript
     * console.log(`Flag evaluated for user: ${flag.userId}`);
     * ```
     *
     * @example
     * ```typescript
     * // Logging
     * logger.info('Feature flag accessed', {
     *   key: flag.key,
     *   userId: flag.userId,
     *   value: flag.value
     * });
     * ```
     */
    get userId(): string;

    /**
     * Whether this feature flag instance has been disposed.
     *
     * Returns true after dispose() has been called. Disposed instances throw
     * errors on all operations except checking disposal status.
     *
     * ## Use Cases
     *
     * - Prevent use-after-dispose bugs
     * - Conditional cleanup in complex flows
     * - Defensive programming checks
     *
     * @example
     * ```typescript
     * if (!flag.isDisposed) {
     *   const value = flag.value;
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Cleanup verification
     * flags.forEach(flag => {
     *   if (!flag.isDisposed) {
     *     console.warn('Flag not disposed:', flag.userId);
     *     flag.dispose();
     *   }
     * });
     * ```
     */
    get isDisposed(): boolean;

    /**
     * Forces an immediate refresh of the feature flag value.
     *
     * Unlike the automatic background refresh triggered by value access, this
     * method waits for the refresh to complete before returning. Useful for
     * ensuring fresh data before critical operations.
     *
     * ## Behavior
     *
     * - Waits for completion (unlike background refresh)
     * - Returns the refreshed value
     * - Throws if disposed or fetch fails
     * - Resets expiration time on success
     * - Reuses in-flight request if refresh already pending
     *
     * ## Error Handling
     *
     * - Throws error if fetch fails
     * - Error also stored in `lastError` property
     * - Does not modify value on failure
     *
     * @returns Promise resolving to the refreshed value
     *
     * @throws {Error} If feature flag has been disposed
     * @throws {Error} If refresh fails (error also stored in lastError)
     *
     * @example
     * ```typescript
     * // Ensure fresh value
     * try {
     *   const freshValue = await flag.forceRefresh();
     *   console.log('Refreshed:', freshValue);
     * } catch (error) {
     *   console.error('Refresh failed:', error);
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Critical operation
     * await flag.forceRefresh(); // Ensure fresh
     * if (flag.value === true) {
     *   performCriticalOperation();
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Batch refresh
     * await Promise.all([
     *   flag1.forceRefresh(),
     *   flag2.forceRefresh(),
     *   flag3.forceRefresh()
     * ]);
     * ```
     */
    forceRefresh(): Promise<FeatureFlagValueType<T>>;

    /**
     * Disposes the feature flag instance and cleans up resources.
     *
     * Marks the instance as disposed, cancels any pending refresh operations,
     * and prevents further use. This method is idempotent (safe to call multiple times).
     *
     * ## Cleanup Actions
     *
     * - Aborts pending HTTP requests via AbortController
     * - Clears pending refresh promise
     * - Marks instance as disposed
     * - Logs disposal event
     *
     * ## Post-Disposal Behavior
     *
     * - Accessing `.value` throws error
     * - Calling `forceRefresh()` throws error
     * - Other getters still accessible for debugging
     * - Calling `dispose()` again is a no-op
     *
     * ## Best Practices
     *
     * - Always dispose when done with instance
     * - Use try-finally for guaranteed cleanup
     * - Dispose before application shutdown
     * - Track disposal in resource management
     *
     * @example
     * ```typescript
     * // Simple cleanup
     * const flag = await createAutoRefreshFeatureFlag({ key: 'test' });
     * const value = flag.value;
     * flag.dispose();
     * ```
     *
     * @example
     * ```typescript
     * // Guaranteed cleanup
     * const flag = await createAutoRefreshFeatureFlag({ key: 'test' });
     * try {
     *   doWork(flag.value);
     * } finally {
     *   flag.dispose();
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Resource management
     * class FeatureManager {
     *   private flags = new Map<string, AutoRefreshFeatureFlag<any>>();
     *
     *   dispose() {
     *     this.flags.forEach(flag => flag.dispose());
     *     this.flags.clear();
     *   }
     * }
     * ```
     */
    dispose(): void;
  };

  /**
   * Configuration options for creating an auto-refresh feature flag.
   *
   * @template T - The feature flag key type from KnownFeatureType
   */
  export interface AutoRefreshFeatureFlagOptions<T extends KnownFeatureType> {
    /**
     * Feature flag key from KnownFeatureType.
     *
     * Must be one of the predefined feature flag keys. This ensures type
     * safety and proper value typing throughout the system.
     */
    key: T;

    /**
     * User ID for flag evaluation.
     *
     * Used by Flagsmith to determine flag value based on user targeting rules.
     * Defaults to authenticated user's hash, then 'server' if unavailable.
     *
     * @default Authenticated user hash or 'server'
     */
    userId?: string | 'server';

    /**
     * Initial value to use before first fetch.
     *
     * If provided, the instance is created immediately without fetching.
     * If undefined, fetches from Flagsmith before create() returns.
     *
     * @default undefined (fetch immediately)
     */
    initialValue?: FeatureFlagValueType<T>;

    /**
     * Time-to-live in milliseconds.
     *
     * How long cached values remain fresh before requiring refresh.
     * Shorter values increase freshness but add load to Flagsmith.
     *
     * @default 180000 (3 minutes)
     */
    ttl?: number;

    /**
     * Whether to trigger an immediate fetch on creation.
     * - When an {@link initialValue} is not provided, this can be
     *  used to disable the automatic fetch that occurs.
     * - When no {@link initialValue} is provided, this can be used
     * to force an immediate refresh after creation.
     *
     * @default false
     */
    load?: boolean;
  }

  /**
   * Creates a new auto-refreshing feature flag instance.
   *
   * Factory function that delegates to createAutoRefreshFeatureFlag().
   * Provided for backwards compatibility with the original API.
   *
   * @deprecated Use createAutoRefreshFeatureFlag() instead
   *
   * This function is maintained for backwards compatibility but new code
   * should use the class method directly for better discoverability and
   * clearer intent.
   *
   * @template T - The feature flag key type
   * @param options - Configuration options
   * @returns Promise resolving to auto-refresh feature flag instance
   *
   * @example
   * ```typescript
   * // Legacy usage (still supported)
   * const flag = await createAutoRefreshFeatureFlag({
   *   key: 'models_azure',
   *   userId: 'user-123'
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Recommended usage
   * const flag = await createAutoRefreshFeatureFlag({
   *   key: 'models_azure',
   *   userId: 'user-123'
   * });
   * ```
   */
  export function createAutoRefreshFeatureFlag<T extends KnownFeatureType>(
    options: AutoRefreshFeatureFlagOptions<T>,
  ): Promise<AutoRefreshFeatureFlag<T>>;

  /**
   * Creates a new auto-refreshing feature flag instance synchronously.
   *
   * This synchronous variant creates the flag instance immediately without
   * awaiting user authentication. It's designed for environments where:
   * - User ID is explicitly provided
   * - Server-side context is acceptable ('server' default)
   * - Synchronous initialization is required (e.g., module-level initialization)
   *
   * ## Synchronous Initialization
   *
   * Unlike the async `create()` method, this function:
   * - Returns immediately without awaiting auth()
   * - Uses provided userId or defaults to 'server'
   * - Does not fetch initial value unless `load=true`
   * - Suitable for React hooks and synchronous contexts
   *
   * ## Load Behavior
   *
   * - **load=true**: Triggers background fetch immediately (non-blocking)
   * - **load=false**: No fetch until value is first accessed
   * - **initialValue provided**: Uses initial value, respects load flag
   *
   * ## Use Cases
   *
   * - React component initialization (can't await in render)
   * - Module-level flag creation
   * - Server-side rendering with explicit user context
   * - Performance-critical paths where async is problematic
   *
   * ## Caution
   *
   * This method bypasses authentication resolution. Ensure you either:
   * 1. Provide explicit userId parameter, OR
   * 2. Accept 'server' context for unauthenticated scenarios
   *
   * @template T - The feature flag key type
   * @param options - Configuration options
   * @param options.key - Feature flag key from KnownFeatureType
   * @param options.userId - User ID for flag evaluation (defaults to 'server' if not provided)
   * @param options.initialValue - Initial value to use before first fetch
   * @param options.ttl - Time-to-live in milliseconds (default: 3 minutes)
   * @param options.load - Whether to trigger immediate background fetch (default: true)
   *
   * @returns AutoRefreshFeatureFlag instance (created synchronously)
   *
   * @example
   * ```typescript
   * // React hook usage - synchronous initialization
   * function useFeatureFlag(key: KnownFeatureType) {
   *   const [flag] = useState(() =>
   *     createAutoRefreshFeatureFlagSync({
   *       key,
   *       userId: getCurrentUserId(), // Already known
   *       load: true // Start fetching immediately
   *     })
   *   );
   *
   *   useEffect(() => {
   *     return () => flag.dispose();
   *   }, [flag]);
   *
   *   return flag.value;
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Module-level initialization with explicit user
   * export const modelFlag = createAutoRefreshFeatureFlagSync({
   *   key: 'models_azure',
   *   userId: 'admin-user',
   *   initialValue: true,
   *   load: false // Don't fetch until needed
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Server context (no user authentication)
   * const serverFlag = createAutoRefreshFeatureFlagSync({
   *   key: 'mcp_cache_tools',
   *   // userId defaults to 'server'
   *   load: true
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Performance-critical path
   * function getCriticalConfig() {
   *   // Create flag without async overhead
   *   const flag = createAutoRefreshFeatureFlagSync({
   *     key: 'models_defaults',
   *     userId: 'system',
   *     initialValue: getDefaultConfig(),
   *     load: false // Use initial value immediately
   *   });
   *
   *   return flag.value;
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Comparison: Async vs Sync
   *
   * // Async - waits for auth, ensures proper user context
   * const asyncFlag = await createAutoRefreshFeatureFlag({
   *   key: 'models_azure'
   *   // Automatically resolves authenticated user
   * });
   *
   * // Sync - immediate return, explicit user context
   * const syncFlag = createAutoRefreshFeatureFlagSync({
   *   key: 'models_azure',
   *   userId: 'user-123' // Must provide explicitly
   * });
   * ```
   *
   * @see {@link createAutoRefreshFeatureFlag} for async version with authentication
   */
  export function createAutoRefreshFeatureFlagSync<T extends KnownFeatureType>(
    options: AutoRefreshFeatureFlagOptions<T> & { load?: boolean },
  ): AutoRefreshFeatureFlag<T>;
}
