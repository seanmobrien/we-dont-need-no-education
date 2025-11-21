import type { Flagsmith } from 'flagsmith-nodejs';
import {
  AllFeatureFlagsDefault,
  type KnownFeatureType,
  type FeatureFlagStatus,
} from './known-feature';

/**
 * Server-side feature flag helpers using Flagsmith.
 *
 * This module exposes utilities used by server code to fetch feature flag
 * values for a given user context. The functions are intentionally small and
 * focused so callers can await values during server rendering or API handlers.
 *
 * Implementation notes:
 * - `flagsmithServer` returns an initialized Flagsmith client. The client may
 *   be cached internally by the implementation and typically reads API keys
 *   from environment variables.
 * - `getFeatureFlag` resolves a single feature value and applies typed
 *   defaults based on `AllFeatureFlagsDefault`.
 * - `getAllFeatureFlags` returns a map of all known feature flags and their
 *   resolved statuses for a user.
 */
declare module '@/lib/site-util/feature-flags/server' {
  /**
   * Create or return a singleton Flagsmith server client.
   *
   * The returned client is connected to Flagsmith and configured for server
   * usage. It exposes the normal Flagsmith API and can be used to retrieve
   * flag values programmatically or for administration tasks.
   *
   * @returns Promise resolving to an initialized IFlagsmith client instance
   * @throws Error if initialization fails (for example, missing API key)
   *
   * @example
   * ```ts
   * const client = await flagsmithServer();
   * const isEnabled = await client.hasFeature('my-feature');
   * ```
   */
  export function flagsmithServer(): Flagsmith;

  /**
   * Resolve a single typed feature flag for a user.
   *
   * This function uses the typed flag keys defined in `KnownFeatureType` so
   * callers receive the concrete return type from `AllFeatureFlagsDefault` for
   * the requested key. When `userId` is provided the function will resolve
   * flag values for that user (for example to support per-user overrides).
   *
   * @typeParam T - A member of `KnownFeatureType` identifying the flag
   * @param flagKey - The known flag key to resolve
   * @param userId - Optional user id to resolve flags for a specific user
   * @param defaultValue - Optional default to return if the flag is not set
   * @returns Promise resolving to the typed flag value (boolean | string | number depending on flag)
   * @throws Error if Flagsmith client cannot be initialized or the request fails
   *
   * @example
   * ```ts
   * const showAi = await getFeatureFlag('ai.experimental', 'user-123', false);
   * ```
   */
  export function getFeatureFlag<T extends KnownFeatureType>(
    flagKey: T,
    userId?: string,
    defaultValue?: (typeof AllFeatureFlagsDefault)[T],
  ): Promise<(typeof AllFeatureFlagsDefault)[T]>;

  /**
   * Retrieve all known feature flags and their resolved statuses for a user.
   *
   * The return type is a record mapping every `KnownFeatureType` key to its
   * resolved `FeatureFlagStatus`. This is useful for server-side rendering or
   * building a flags payload to send to the client.
   *
   * @param userId - Optional user id to resolve flags for a specific user
   * @returns Promise resolving to a record of flags keyed by KnownFeatureType
   * @throws Error if Flagsmith client cannot be initialized or the request fails
   *
   * @example
   * ```ts
   * const flags = await getAllFeatureFlags('user-123');
   * console.log(flags['ai.experimental']);
   * ```
   */
  export function getAllFeatureFlags(
    userId?: string,
  ): Promise<Record<KnownFeatureType, FeatureFlagStatus>>;
}
