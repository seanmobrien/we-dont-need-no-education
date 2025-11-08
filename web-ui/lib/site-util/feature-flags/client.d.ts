import type { IFlagsmith } from 'flagsmith';
import {
  AllFeatureFlagsDefault,
  type KnownFeatureType,
  type FeatureFlagStatus,
} from './known-feature';

/**
 * @module lib/site-util/feature-flags/client
 *
 * Client-Side Feature Flag Functions
 * ===================================
 *
 * This module provides client-side functions for retrieving feature flags from
 * the Flagsmith service in browser environments (Client Components in Next.js).
 * These functions integrate with Flagsmith's isomorphic client SDK and handle:
 * - User identification and personalization
 * - Flag retrieval with type safety
 * - Automatic fallback to defaults on error
 * - Background flag refresh every 5 minutes
 *
 * Key Differences from Server Module:
 * - Uses `NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID` (client-safe env var)
 * - Runs in browser context (client components, effects, handlers)
 * - No singleton caching (new instance per call for simplicity)
 * - User identity defaults to 'anonymous' when not provided
 *
 * Architecture:
 * - Creates Flagsmith instances on-demand with automatic refresh
 * - Identifies users to Flagsmith for personalized flag values
 * - Returns typed flag values with intelligent defaults
 * - Logs errors but never throws (graceful degradation)
 *
 * Common Usage:
 * - Primarily used by FlagProvider to populate React Context
 * - Can be called directly in client components for immediate flag access
 * - Useful for dynamic flag checks in event handlers or effects
 *
 * Performance Considerations:
 * - Each call creates a new Flagsmith instance (consider using FlagProvider/hooks)
 * - Flags are cached within the instance and refresh every 5 minutes
 * - User identification triggers a Flagsmith API call
 *
 * @see components/general/flags/flag-provider.tsx - Primary consumer
 * @see lib/site-util/feature-flags/server.ts - Server-side equivalent
 * @see lib/site-util/feature-flags/context.ts - React Context integration
 */
declare module '@/lib/site-util/feature-flags/client' {
  /**
   * Creates and initializes a Flagsmith client instance for browser environments.
   *
   * This function creates a new Flagsmith SDK instance configured for client-side
   * use with public environment credentials. The instance is initialized with the
   * Flagsmith API and automatically starts listening for flag updates with a
   * 5-minute refresh interval.
   *
   * Behavior:
   * - Creates a fresh instance on each call (no caching)
   * - Initializes with `NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID`
   * - Connects to Flagsmith API at `NEXT_PUBLIC_FLAGSMITH_API_URL`
   * - Starts background polling to refresh flags every 5 minutes
   * - Returns null if initialization fails (network error, invalid credentials)
   *
   * The created instance:
   * - Maintains an in-memory cache of flag values
   * - Automatically refreshes flags on the specified interval
   * - Supports user identification for personalized flags
   * - Provides methods for flag retrieval and state queries
   *
   * Performance Note:
   * This function creates a new instance each time it's called. For most use
   * cases, prefer using the FlagProvider + React hooks pattern which manages
   * a single instance. Call this directly only when you need an independent
   * instance for special scenarios (testing, isolated components, etc.).
   *
   * @async
   * @returns {Promise<IFlagsmith<string, string> | null>} Initialized Flagsmith client, or null on error
   *
   * @example
   * ```typescript
   * // Create and use a client instance
   * const client = await flagsmithClient();
   * if (client) {
   *   await client.identify('user-123');
   *   const azureFlag = client.getValue('models_azure', { json: true });
   *   console.log('Azure enabled:', azureFlag);
   * }
   *
   * // Handle initialization failure
   * const client = await flagsmithClient();
   * if (!client) {
   *   console.error('Failed to initialize Flagsmith');
   *   // Fall back to defaults
   * }
   * ```
   *
   * @see {@link https://docs.flagsmith.com/clients/javascript | Flagsmith JavaScript SDK}
   */
  export function flagsmithClient(): Promise<IFlagsmith<string, string> | null>;

  /**
   * Retrieve a single feature flag value from Flagsmith with type-safe defaults.
   *
   * This is the primary function for accessing individual feature flags in client
   * components. It handles the full lifecycle of flag retrieval:
   * 1. Creates/gets a Flagsmith client instance
   * 2. Identifies the user (or uses 'anonymous')
   * 3. Retrieves the flag value from Flagsmith
   * 4. Falls back to provided default or system default on error
   *
   * Type Safety:
   * - Generic type parameter `T` ensures return type matches the flag key
   * - Return type is inferred from `AllFeatureFlagsDefault[T]`
   * - TypeScript autocomplete works for flag keys and default values
   *
   * Fallback Priority (on successful fetch):
   * 1. Value from Flagsmith for the identified user
   * 2. Provided `defaultValue` parameter
   * 3. System default from `AllFeatureFlagsDefault[flagKey]`
   *
   * Error Handling:
   * - Catches and logs all errors (network, initialization, invalid flags)
   * - Returns `defaultValue` on error (or undefined if not provided)
   * - Never throws - always returns a usable value
   *
   * User Identification:
   * - `userId` parameter identifies the user to Flagsmith for personalization
   * - Omitting `userId` uses 'anonymous' (shared flag values)
   * - User ID affects which flag values are returned (A/B tests, targeting)
   *
   * Performance:
   * - Creates a new Flagsmith instance on each call
   * - For frequent flag checks, prefer React hooks (useFeatureFlag)
   * - Consider FlagProvider + context for multiple flags
   *
   * @template T - The feature flag key type (extends KnownFeatureType)
   * @async
   * @param {T} flagKey - The feature flag key to retrieve (type-safe)
   * @param {string} [userId] - Optional user ID for personalized flags (defaults to 'anonymous')
   * @param {AllFeatureFlagsDefault[T]} [defaultValue] - Optional default if flag not found
   * @returns {Promise<AllFeatureFlagsDefault[T] | undefined>} The flag value with type matching the key, or undefined on error without default
   *
   * @example
   * ```typescript
   * // Basic usage with default
   * const azureEnabled = await getFeatureFlag('models_azure', undefined, false);
   * if (azureEnabled) {
   *   // Show Azure model options
   * }
   *
   * // With user identification for personalization
   * const userId = '12345';
   * const cacheEnabled = await getFeatureFlag(
   *   'mcp_cache_tools',
   *   userId,
   *   false
   * );
   *
   * // Complex flag with type inference
   * const modelDefaults = await getFeatureFlag('models_defaults');
   * if (modelDefaults?.enabled) {
   *   const googleModel = modelDefaults.value.google;
   *   console.log('Default Google model:', googleModel);
   * }
   *
   * // Type-safe flag access
   * type AzureFlag = Awaited<ReturnType<
   *   typeof getFeatureFlag<'models_azure'>
   * >>;
   * // AzureFlag is: boolean | undefined
   *
   * // In a client component
   * 'use client';
   * import { getFeatureFlag } from '@/lib/site-util/feature-flags/client';
   *
   * function MyComponent() {
   *   const [azureEnabled, setAzureEnabled] = useState(false);
   *
   *   useEffect(() => {
   *     getFeatureFlag('models_azure').then(value => {
   *       setAzureEnabled(value ?? false);
   *     });
   *   }, []);
   *
   *   return azureEnabled ? <AzureFeature /> : null;
   * }
   * ```
   *
   * @see getFeatureFlag (server) - Server-side equivalent
   * @see useFeatureFlag - React hook wrapper (recommended for components)
   */
  export function getFeatureFlag<T extends KnownFeatureType>(
    flagKey: T,
    userId?: string,
    defaultValue?: (typeof AllFeatureFlagsDefault)[T],
  ): Promise<(typeof AllFeatureFlagsDefault)[T] | undefined>;

  /**
   * Retrieve all feature flags at once from Flagsmith.
   *
   * This function fetches the complete set of feature flags in a single operation,
   * returning them as a structured object mapping each known flag key to its value.
   * It's optimized for scenarios where multiple flags are needed simultaneously.
   *
   * Primary Use Case:
   * - Called by FlagProvider on mount to populate React Context
   * - Enables efficient batch loading of all flags
   * - Reduces API calls compared to individual flag requests
   *
   * Behavior:
   * 1. Creates/gets Flagsmith client instance
   * 2. Identifies user (or uses 'anonymous')
   * 3. Fetches all flags from Flagsmith in one API call
   * 4. Transforms Flagsmith response to typed FeatureFlagStatus format
   * 5. Falls back to AllFeatureFlagsDefault on error
   *
   * Value Transformation:
   * - Boolean flags: returned as-is
   * - Non-boolean flags: wrapped in `{ enabled: true, value: <flag-value> }`
   * - Missing flags: filled from AllFeatureFlagsDefault
   *
   * User Identification:
   * - Providing `userId` returns personalized flag values for that user
   * - Omitting `userId` uses 'anonymous' for shared/default flag values
   * - User ID affects targeting, segmentation, and A/B test assignments
   *
   * Error Handling:
   * - Catches all errors (network, initialization, parsing)
   * - Logs errors via LoggedError utility
   * - Returns complete AllFeatureFlagsDefault object on error
   * - Never throws - always returns a complete flag set
   *
   * Performance:
   * - Single API call for all flags (efficient)
   * - Creates new Flagsmith instance (not cached)
   * - Results should be stored/memoized if used repeatedly
   * - FlagProvider handles caching and state management
   *
   * Return Type:
   * - Returns `Record<KnownFeatureType, FeatureFlagStatus>`
   * - All known flag keys are present in the returned object
   * - Values are typed according to their default types
   *
   * @async
   * @param {string} [userId] - Optional user ID for personalized flag values (defaults to 'anonymous')
   * @returns {Promise<Record<KnownFeatureType, FeatureFlagStatus>>} Complete mapping of all feature flags
   *
   * @example
   * ```typescript
   * // Get all flags without user context
   * const flags = await getAllFeatureFlags();
   * console.log('Azure enabled:', flags.models_azure);
   * console.log('OpenAI enabled:', flags.models_openai);
   * console.log('Google enabled:', flags.models_google);
   *
   * // Get personalized flags for a user
   * const userFlags = await getAllFeatureFlags('user-123');
   * if (userFlags.models_defaults.enabled) {
   *   const defaults = userFlags.models_defaults.value;
   *   console.log('User default models:', defaults);
   * }
   *
   * // Use in FlagProvider (actual implementation)
   * useEffect(() => {
   *   let isSubscribed = true;
   *
   *   const loadFlags = async () => {
   *     try {
   *       const allFlags = await getAllFeatureFlags();
   *       if (isSubscribed) {
   *         setFlags(allFlags);
   *       }
   *     } catch (error) {
   *       console.error('Failed to load flags:', error);
   *     }
   *   };
   *
   *   loadFlags();
   *   return () => { isSubscribed = false; };
   * }, []);
   *
   * // Check multiple providers at once
   * const flags = await getAllFeatureFlags();
   * const enabledProviders = [
   *   flags.models_azure && 'azure',
   *   flags.models_openai && 'openai',
   *   flags.models_google && 'google',
   * ].filter(Boolean);
   * console.log('Enabled providers:', enabledProviders);
   *
   * // Serialize for debugging
   * const flags = await getAllFeatureFlags();
   * console.log('All flags:', JSON.stringify(flags, null, 2));
   * ```
   *
   * @see getAllFeatureFlags (server) - Server-side equivalent
   * @see useAIFeatureFlags - React hook wrapper (recommended for components)
   * @see FlagProvider - Primary consumer of this function
   */
  export function getAllFeatureFlags(
    userId?: string,
  ): Promise<Record<KnownFeatureType, FeatureFlagStatus>>;
}
