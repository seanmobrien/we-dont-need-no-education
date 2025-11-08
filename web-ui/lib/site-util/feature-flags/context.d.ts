declare module '@/lib/site-util/feature-flags/context' {
  import {
    AllFeatureFlagsDefault,
    type KnownFeatureType,
    type FeatureFlagStatus,
  } from '@/lib/site-util/feature-flags/known-feature';

  /**
   * @module lib/site-util/feature-flags/context
   *
   * Feature Flags React Context and API
   * ====================================
   *
   * This module provides a lightweight, framework-agnostic feature flags API that
   * works seamlessly in both server-rendered and client-side React environments.
   * It's intentionally decoupled from Flagsmith's React bindings to enable:
   * - Server-side rendering with Next.js App Router
   * - Client-side hydration without re-fetching
   * - Gradual feature flag loading without blocking render
   * - Fallback to defaults when the service is unavailable
   *
   * Architecture:
   * - Uses React Context to provide flags throughout component tree
   * - Returns fallback defaults when context is unavailable (SSR, outside provider)
   * - Integrates with Flagsmith but doesn't require it
   * - Provides a consistent API regardless of loading state
   *
   * Key Components:
   * - FeatureFlagsApi: The API interface for accessing flags
   * - FeatureFlagsContext: React Context for providing flags
   * - useFeatureFlagsContext: Hook to access the context
   * - defaultFlags: Fallback values when service unavailable
   *
   * @see components/general/flags/flag-provider.tsx - Provider implementation
   * @see lib/site-util/feature-flags/index.ts - Public API exports
   */

  /**
   * Comprehensive API interface for accessing and querying feature flags.
   *
   * This interface provides multiple methods for retrieving flags with different
   * levels of granularity and information. It maintains compatibility across
   * server and client environments by always returning valid data, using defaults
   * when actual flags are unavailable.
   *
   * The API is designed to:
   * - Provide type-safe flag access with autocomplete
   * - Support both single and batch flag retrieval
   * - Include loading/error state for UI feedback
   * - Work gracefully when Flagsmith is unavailable
   * - Enable conditional rendering based on flag state
   *
   * State Properties:
   * - `isLoaded`: Whether initial flags have loaded from Flagsmith
   * - `isFetching`: Whether a fetch operation is currently in progress
   * - `error`: Any error encountered during flag retrieval
   * - `isDefault`: True if using fallback defaults (no provider/connection)
   *
   * @example
   * ```typescript
   * const flags = useFeatureFlagsContext();
   *
   * // Get a single flag with default
   * const azureEnabled = flags.getFlag('models_azure', false);
   *
   * // Check if a feature is enabled (boolean coercion)
   * if (flags.isEnabled('models_google')) {
   *   // Show Google AI options
   * }
   *
   * // Get multiple flags at once
   * const [azure, openai, google] = flags.getFlags(
   *   ['models_azure', 'models_openai', 'models_google'],
   *   [false, false, false]
   * );
   *
   * // Get all flags as an object
   * const allFlags = flags.getAllFlags();
   * console.log(allFlags.models_azure); // boolean
   *
   * // Get detailed flag state with loading info
   * const { value, isLoading, error } = flags.getFlagState('mcp_cache_tools');
   *
   * // Check loading state for UI feedback
   * if (flags.isFetching) {
   *   return <Spinner />;
   * }
   * ```
   *
   * @interface FeatureFlagsApi
   */
  export type FeatureFlagsApi = {
    /**
     * Retrieve a single feature flag value by key.
     *
     * Returns the current value of the specified flag, falling back to the
     * provided default value if the flag is not found, and ultimately to the
     * system default if no explicit default is provided.
     *
     * Fallback Priority:
     * 1. Current flag value from Flagsmith
     * 2. Provided `defaultValue` parameter
     * 3. System default from `AllFeatureFlagsDefault`
     *
     * @param key - The feature flag key to retrieve (must be a valid KnownFeatureType)
     * @param defaultValue - Optional default value if flag not found
     * @returns The feature flag value (boolean, number, string, or complex object)
     *
     * @example
     * ```typescript
     * // Simple boolean flag
     * const azureEnabled = flags.getFlag('models_azure', false);
     *
     * // With explicit default
     * const cacheEnabled = flags.getFlag('mcp_cache_tools', true);
     *
     * // Complex object flag
     * const modelDefaults = flags.getFlag('models_defaults');
     * if (typeof modelDefaults === 'object' && 'enabled' in modelDefaults) {
     *   console.log(modelDefaults.value);
     * }
     * ```
     */
    getFlag: (
      key: KnownFeatureType,
      defaultValue?: FeatureFlagStatus,
    ) => FeatureFlagStatus;

    /**
     * Retrieve multiple feature flags in a single call.
     *
     * Efficiently fetches multiple flags at once, returning them as an array in
     * the same order as the requested keys. Useful for batch operations or when
     * multiple flags control a single feature.
     *
     * Each flag falls back to:
     * 1. Current flag value from Flagsmith
     * 2. Corresponding value in `defaults` array (by index)
     * 3. System default from `AllFeatureFlagsDefault`
     *
     * @param keys - Array of feature flag keys to retrieve
     * @param defaults - Optional array of default values (matched by index)
     * @returns Array of feature flag values in same order as keys
     *
     * @example
     * ```typescript
     * // Get multiple model provider flags
     * const [azure, openai, google] = flags.getFlags(
     *   ['models_azure', 'models_openai', 'models_google']
     * );
     *
     * // With custom defaults for each
     * const [cache, tools] = flags.getFlags(
     *   ['mcp_cache_client', 'mcp_cache_tools'],
     *   [true, false]
     * );
     *
     * // Use for conditional rendering
     * const enabledProviders = flags.getFlags([
     *   'models_azure',
     *   'models_openai',
     *   'models_google'
     * ]).filter(Boolean).length;
     * ```
     */
    getFlags: (
      keys: KnownFeatureType[],
      defaults?: FeatureFlagStatus[],
    ) => FeatureFlagStatus[];

    /**
     * Retrieve all feature flags as a single object.
     *
     * Returns a complete mapping of all known feature flags to their current
     * values. Useful for:
     * - Passing entire flag state to child components
     * - Serializing flags for client hydration
     * - Debugging flag state
     * - Bulk flag operations
     *
     * The returned object is a partial record (some keys may be missing) to
     * handle cases where not all flags have been configured or loaded yet.
     *
     * @returns Object mapping all flag keys to their values
     *
     * @example
     * ```typescript
     * // Get all flags
     * const allFlags = flags.getAllFlags();
     *
     * // Pass to child components
     * <ModelSelector flags={allFlags} />
     *
     * // Check multiple flags
     * const anyProviderEnabled =
     *   allFlags.models_azure ||
     *   allFlags.models_openai ||
     *   allFlags.models_google;
     *
     * // Serialize for logging
     * console.log('Current flags:', JSON.stringify(allFlags));
     * ```
     */
    getAllFlags: () => Partial<Record<KnownFeatureType, FeatureFlagStatus>>;

    /**
     * Check if a feature flag is enabled (boolean coercion).
     *
     * Provides a simple boolean check for whether a flag is "truthy". This is
     * the most common way to check flags since most features are simply on/off.
     *
     * Coercion Rules:
     * - Boolean flags: returned as-is
     * - Number flags: 0 is false, non-zero is true
     * - String flags: empty string is false, non-empty is true
     * - Object flags: checks the `enabled` property if present
     *
     * Accepts both known feature types and arbitrary strings, making it flexible
     * for dynamic flag checks or when integrating with external systems.
     *
     * @param key - Feature flag key (known type or arbitrary string)
     * @returns Boolean indicating if the flag is enabled/truthy
     *
     * @example
     * ```typescript
     * // Simple enable/disable check
     * if (flags.isEnabled('models_azure')) {
     *   // Show Azure model options
     * }
     *
     * // Use in JSX
     * {flags.isEnabled('mcp_cache_tools') && <CacheTools />}
     *
     * // Multiple checks
     * const hasAnyProvider =
     *   flags.isEnabled('models_azure') ||
     *   flags.isEnabled('models_openai') ||
     *   flags.isEnabled('models_google');
     *
     * // Dynamic flag check
     * const provider = 'azure';
     * if (flags.isEnabled(`models_${provider}`)) {
     *   // Provider is available
     * }
     * ```
     */
    isEnabled: (key: KnownFeatureType | string) => boolean;

    /**
     * Get detailed state information for a specific flag.
     *
     * Returns a comprehensive state object including the flag value and metadata
     * about the loading process. Unlike `getFlag`, this method provides insight
     * into whether the value is final or may change after loading completes.
     *
     * Useful for:
     * - Showing loading indicators while flags load
     * - Displaying error states to users
     * - Distinguishing between "disabled" and "not yet loaded"
     * - Providing detailed flag information in debug UIs
     *
     * Note: The returned object always has `isLoading: false` and `error: null`
     * in the current implementation, with loading state tracked at the API level.
     *
     * @param key - Feature flag key to query (known type or arbitrary string)
     * @returns Object with flag value and state metadata
     * @returns {FeatureFlagStatus | undefined} returns.value - The flag value, or undefined if not found
     * @returns {boolean} returns.isLoading - Whether this specific flag is loading (always false currently)
     * @returns {null} returns.error - Any error for this flag (always null currently)
     *
     * @example
     * ```typescript
     * const { value, isLoading, error } = flags.getFlagState('models_defaults');
     *
     * if (isLoading) {
     *   return <Spinner />;
     * }
     *
     * if (error) {
     *   return <ErrorMessage error={error} />;
     * }
     *
     * if (value && typeof value === 'object' && 'value' in value) {
     *   // Use the complex flag value
     *   const modelName = value.value.google;
     * }
     * ```
     */
    getFlagState: (key: KnownFeatureType | string) => {
      value: FeatureFlagStatus | undefined;
      isLoading: boolean;
      error: null;
    };

    /**
     * Indicates whether the initial flag data has been loaded from Flagsmith.
     *
     * This property helps distinguish between:
     * - Initial state before any flags have loaded
     * - Final state after flags have successfully loaded
     *
     * Note: Even when `isLoaded` is false, the API returns default values so
     * components can render immediately. Use this flag only when you need to
     * show different UI during initial load (e.g., skeleton screens).
     *
     * @readonly
     * @example
     * ```typescript
     * if (!flags.isLoaded) {
     *   return <Skeleton />;
     * }
     * ```
     */
    readonly isLoaded: boolean;

    /**
     * Any error encountered during flag retrieval from Flagsmith.
     *
     * When the Flagsmith service is unavailable or returns an error, this
     * property contains the error object. The API continues to function with
     * default values even when an error occurs.
     *
     * Use this to:
     * - Display error notifications to users
     * - Log errors for monitoring
     * - Show degraded functionality warnings
     * - Trigger retry mechanisms
     *
     * @readonly
     * @example
     * ```typescript
     * if (flags.error) {
     *   console.error('Feature flags error:', flags.error);
     *   toast.warning('Using default feature configuration');
     * }
     * ```
     */
    readonly error?: Error | null;

    /**
     * Indicates whether a flag fetch operation is currently in progress.
     *
     * This property is updated by the FlagProvider and reflects the real-time
     * loading state from Flagsmith's React hooks. Unlike `isLoaded`, this
     * property can be true multiple times as flags are refreshed or refetched.
     *
     * Use this to:
     * - Show loading indicators during refresh
     * - Disable UI elements during updates
     * - Provide visual feedback for background updates
     *
     * @readonly
     * @example
     * ```typescript
     * <RefreshButton
     *   loading={flags.isFetching}
     *   onClick={refreshFlags}
     * />
     * ```
     */
    readonly isFetching: boolean;

    /**
     * Indicates that the API is using fallback defaults (no provider available).
     *
     * This property is set to `true` when `useFeatureFlagsContext` is called
     * outside of a `FlagProvider`, meaning no actual flag data is available.
     * The hook returns a working API backed by `AllFeatureFlagsDefault`.
     *
     * Use this to:
     * - Detect when running without a provider (development/testing)
     * - Show warnings about using defaults
     * - Conditionally enable debug features
     * - Verify provider setup
     *
     * @readonly
     * @example
     * ```typescript
     * if (flags.isDefault) {
     *   console.warn('No FlagProvider found, using defaults');
     * }
     * ```
     */
    readonly isDefault?: true;
  };

  /**
   * Export of `AllFeatureFlagsDefault` as a mutable Record type.
   *
   * This constant provides the same default flag values as `AllFeatureFlagsDefault`
   * but cast to a mutable `Record` type for compatibility with APIs that don't
   * expect readonly objects.
   *
   * Used internally by:
   * - `useFeatureFlagsContext` hook when returning fallback API
   * - `FlagProvider` component for merging with fetched flags
   * - Test utilities for setting up flag state
   *
   * The values are identical to `AllFeatureFlagsDefault` but the type signature
   * allows mutation (though the object itself should still be treated as readonly
   * in practice).
   *
   * @constant
   * @see AllFeatureFlagsDefault - Original readonly defaults
   *
   * @example
   * ```typescript
   * // Access default values
   * const azureDefault = defaultFlags.models_azure; // true
   *
   * // Use in fallback logic
   * const value = fetchedFlags[key] ?? defaultFlags[key];
   * ```
   */
  export const defaultFlags: typeof AllFeatureFlagsDefault;

  /**
   * React Context for providing feature flags throughout the component tree.
   *
   * This context holds the `FeatureFlagsApi` implementation and is populated by
   * the `FlagProvider` component. Components can access this context via the
   * `useFeatureFlagsContext` hook.
   *
   * Architecture:
   * - Created with `createContext<FeatureFlagsApi | undefined>(undefined)`
   * - Populated by `FlagProvider` at app/route root
   * - Accessed via `useFeatureFlagsContext` hook
   * - Returns fallback defaults when undefined
   *
   * You typically won't interact with this context directly; instead use the
   * provided hook or the higher-level hooks from the main feature-flags module.
   *
   * @constant
   * @see FlagProvider - Provider component implementation
   * @see useFeatureFlagsContext - Hook for accessing context
   *
   * @example
   * ```typescript
   * // Typically used via FlagProvider
   * <FlagProvider>
   *   <App />
   * </FlagProvider>
   *
   * // Or accessed via hook
   * const flags = useFeatureFlagsContext();
   * ```
   */
  export const FeatureFlagsContext: FeatureFlagsApi;

  /**
   * React hook to access the feature flags context.
   *
   * This is the primary way to access feature flags in React components. It
   * automatically handles the case where no provider exists by returning a
   * working API backed by default values.
   *
   * Behavior:
   * - Inside `FlagProvider`: Returns the live flags API with Flagsmith data
   * - Outside `FlagProvider`: Returns fallback API with defaults (`isDefault: true`)
   * - Server-side: Always returns fallback API (no React Context in SSR)
   *
   * The hook ensures components never fail due to missing flags; they gracefully
   * degrade to defaults. This makes components resilient and enables gradual
   * feature flag adoption.
   *
   * For most use cases, prefer the higher-level hooks from the main module:
   * - `useFeatureFlag(key, default)` - Get a single flag
   * - `useFeatureFlags()` - Get the full API
   * - `useAIFeatureFlags()` - Get all flags formatted for AI features
   *
   * @returns {FeatureFlagsApi} Feature flags API (always defined, never null)
   *
   * @example
   * ```typescript
   * function MyComponent() {
   *   const flags = useFeatureFlagsContext();
   *
   *   const azureEnabled = flags.getFlag('models_azure', false);
   *
   *   if (!flags.isLoaded) {
   *     return <Skeleton />;
   *   }
   *
   *   return (
   *     <div>
   *       {azureEnabled && <AzureModelSelector />}
   *     </div>
   *   );
   * }
   *
   * // Check if using defaults (no provider)
   * function DebugPanel() {
   *   const flags = useFeatureFlagsContext();
   *
   *   if (flags.isDefault) {
   *     return <Warning>No flag provider configured</Warning>;
   *   }
   *
   *   return <FlagsList flags={flags.getAllFlags()} />;
   * }
   * ```
   */
  export function useFeatureFlagsContext(): FeatureFlagsApi;

  /**
   * Default export of `FeatureFlagsContext` for convenience.
   *
   * Allows importing the context using default import syntax, though named
   * import is preferred for consistency.
   *
   * @example
   * ```typescript
   * import FeatureFlagsContext from '@/lib/site-util/feature-flags/context';
   * ```
   */
  export default FeatureFlagsContext;
}
