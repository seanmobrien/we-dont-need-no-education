declare module '@/lib/site-util/feature-flags/known-feature' {
  /**
   * @module lib/site-util/feature-flags/known-feature
   *
   * Feature Flag Type Definitions and Constants
   * ============================================
   *
   * This module provides the type system and default values for application-wide
   * feature flags. It defines:
   * - Known feature flag identifiers (KnownFeatureValues, KnownFeature)
   * - Type-safe flag value representations (FeatureFlagStatus)
   * - Default flag configurations (AllFeatureFlagsDefault)
   * - Utility types for type-safe flag access (FeatureFlagValueType)
   *
   * Feature flags are used throughout the application to enable/disable features,
   * control model availability (Azure, OpenAI, Google), and manage feature rollouts
   * (MCP cache tools, MCP cache client).
   *
   * Usage Patterns:
   * - Server-side: Import via `@/lib/site-util/feature-flags/server` for SSR/API routes
   * - Client-side: Import via `@/lib/site-util/feature-flags/client` or React hooks
   * - Type definitions: Import types from `@/lib/site-util/feature-flags/known-feature`
   *
   * Integration:
   * - Works with Flagsmith feature flag service for remote configuration
   * - Falls back to AllFeatureFlagsDefault when service unavailable
   * - Provides type-safe access via utility types
   *
   * @see {@link https://flagsmith.com | Flagsmith Documentation}
   * @see lib/site-util/feature-flags/index.ts - Main export module
   * @see lib/site-util/feature-flags/server.ts - Server-side implementation
   * @see lib/site-util/feature-flags/client.ts - Client-side implementation
   */

  /**
   * Array of all known feature flag identifiers in the application.
   *
   * This readonly array serves as the source of truth for valid feature flag keys.
   * Each string corresponds to a specific feature or capability that can be toggled.
   *
   * Current Feature Flags:
   * - `models_azure`: Enable/disable Azure AI model providers
   * - `models_openai`: Enable/disable OpenAI model providers
   * - `models_google`: Enable/disable Google AI model providers
   * - `models_defaults`: Configure default models per provider (complex object)
   * - `mcp_cache_tools`: Enable/disable Model Context Protocol cache tooling
   * - `mcp_cache_client`: Enable/disable MCP cache client features
   *
   * @example
   * ```typescript
   * // Iterate over all known flags
   * KnownFeatureValues.forEach(key => {
   *   console.log(`Feature flag: ${key}`);
   * });
   *
   * // Check if a key is valid
   * const isValid = KnownFeatureValues.includes('models_azure'); // true
   * ```
   *
   * @readonly
   * @type {ReadonlyArray<string>}
   */
  export const KnownFeatureValues: ReadonlyArray<string>;

  /**
   * Union type of all valid feature flag keys extracted from KnownFeatureValues.
   *
   * This type provides compile-time type safety when working with feature flags,
   * ensuring only valid flag keys can be used in function parameters and return types.
   *
   * The type is derived from the KnownFeatureValues array using TypeScript's
   * indexed access types, creating a literal union type of all possible flag names.
   *
   * @example
   * ```typescript
   * // Type-safe function parameter
   * function checkFlag(key: KnownFeatureType) {
   *   // TypeScript ensures 'key' is one of the valid flag names
   * }
   *
   * checkFlag('models_azure'); // ✓ Valid
   * checkFlag('invalid_flag'); // ✗ TypeScript error
   *
   * // Use in conditional types
   * type AzureFlag = KnownFeatureType extends 'models_azure' ? true : false;
   * ```
   *
   * @typedef {('models_azure' | 'models_openai' | 'models_google' | 'models_defaults' | 'mcp_cache_tools' | 'mcp_cache_client')} KnownFeatureType
   */
  export type KnownFeatureType = (typeof KnownFeatureValues)[number];

  /**
   * Enumeration-like object mapping feature flag keys to themselves.
   *
   * Provides a convenient constant object for accessing feature flag keys by name,
   * similar to a TypeScript enum but with string literal types. This pattern enables
   * autocomplete in IDEs and prevents typos when referencing flag keys.
   *
   * Each property key matches its value, allowing usage like `KnownFeature.models_azure`
   * instead of the string literal `'models_azure'`.
   *
   * @example
   * ```typescript
   * // Use as enum-like constants
   * const azureEnabled = await getFeatureFlag(KnownFeature.models_azure);
   *
   * // Get autocomplete and type safety
   * if (flags[KnownFeature.models_openai]) {
   *   // Enable OpenAI features
   * }
   *
   * // Compare against string values
   * const flagKey = 'models_google';
   * if (flagKey === KnownFeature.models_google) {
   *   // Flag matches
   * }
   * ```
   *
   * @type {Record<KnownFeatureType, KnownFeatureType>}
   * @constant
   */
  export const KnownFeature: Record<KnownFeatureType, KnownFeatureType>;

  /**
   * Type guard to test whether a string is a known feature flag key.
   *
   * This helper is useful when validating runtime input (for example, values
   * received from environment variables, HTTP query parameters, or external
   * services) before using them with typed feature flag helpers.
   *
   * @example
   * ```typescript
   * if (isKnownFeatureType(maybeKey)) {
   *   // TypeScript now knows maybeKey is a KnownFeatureType
   *   const val: FeatureFlagValueType<typeof maybeKey> = await getFeatureFlag(maybeKey);
   * }
   * ```
   *
   * @param value - Value to test
   * @returns `true` when the value is a KnownFeatureType
   */
  export function isKnownFeatureType(value: unknown): value is KnownFeatureType;

  /**
   * Discriminated union type representing the possible states of a feature flag.
   *
   * Feature flags can have different value types depending on their purpose:
   * - Simple boolean flags: `true` | `false` (most common)
   * - Numeric flags: Numbers for quotas, limits, or percentages
   * - String flags: Text values for configuration or variant selection
   * - Complex flags: Object with `enabled` state plus optional nested `value`
   *
   * The complex object form allows flags to carry both an enabled/disabled state
   * and additional configuration data (e.g., `models_defaults` contains provider
   * model name mappings).
   *
   * @example
   * ```typescript
   * // Boolean flag
   * const azureEnabled: FeatureFlagStatus = true;
   *
   * // Numeric flag (percentage rollout)
   * const rolloutPercent: FeatureFlagStatus = 75;
   *
   * // String flag (variant name)
   * const variant: FeatureFlagStatus = 'variant-b';
   *
   * // Complex flag with nested config
   * const modelDefaults: FeatureFlagStatus = {
   *   enabled: true,
   *   value: {
   *     openai: 'gpt-4',
   *     azure: 'gpt-4-turbo',
   *     google: 'gemini-1.5-pro'
   *   }
   * };
   *
   * // Type narrowing with type guards
   * function getFlagValue(flag: FeatureFlagStatus) {
   *   if (typeof flag === 'boolean') return flag;
   *   if (typeof flag === 'object') return flag.enabled;
   *   return Boolean(flag);
   * }
   * ```
   *
   * @typedef {boolean | number | string | {enabled: boolean, value?: string | number | object | boolean}} FeatureFlagStatus
   */
  export type FeatureFlagStatus =
    | boolean
    | number
    | string
    | {
        enabled: boolean;
        value?: string | number | object | boolean;
      }
    | {
        max: number;
        detect: number;
      };

  /**
   * Type alias for a complete feature flag configuration mapping.
   *
   * Maps each known feature flag key to its corresponding status value. This type
   * ensures that any object representing all flags has exactly the right keys with
   * appropriate value types.
   *
   * Used primarily for:
   * - Return types from `getAllFeatureFlags()` functions
   * - Configuration objects containing full flag state
   * - Type definitions for React context providers
   * - Type-safe flag state management
   *
   * @example
   * ```typescript
   * // Complete flag configuration
   * const allFlags: AllFeatureFlagStatus = {
   *   models_azure: true,
   *   models_openai: false,
   *   models_google: true,
   *   models_defaults: {
   *     enabled: true,
   *     value: { openai: 'gpt-4', azure: 'lofi', google: 'gemini-1.5-pro' }
   *   },
   *   mcp_cache_tools: false,
   *   mcp_cache_client: true
   * };
   *
   * // Hook return type
   * const flags: AllFeatureFlagStatus = useAIFeatureFlags();
   *
   * // Access type-safely
   * const azureEnabled = allFlags.models_azure; // boolean
   * ```
   *
   * @typedef {Record<KnownFeatureType, FeatureFlagStatus>} AllFeatureFlagStatus
   */
  export type AllFeatureFlagStatus = Record<
    KnownFeatureType,
    FeatureFlagStatus
  >;

  /**
   * Default configuration object containing fallback values for all feature flags.
   *
   * Provides sensible defaults for each feature flag that are used when:
   * - The Flagsmith service is unavailable
   * - A flag has not been configured remotely
   * - Running in development/test environments without remote config
   * - Initial app load before remote flags are fetched
   *
   * Current Defaults:
   * - `models_azure`: `true` - Azure models enabled by default
   * - `models_openai`: `false` - OpenAI models disabled by default
   * - `models_google`: `true` - Google models enabled by default
   * - `models_defaults`: Object with model name defaults per provider
   * - `mcp_cache_tools`: `false` - MCP cache tools disabled by default
   * - `mcp_cache_client`: `true` - MCP cache client enabled by default
   *
   * The object is marked `as const` to provide literal types for each value,
   * enabling precise type inference and autocomplete.
   *
   * @example
   * ```typescript
   * // Get default value for a flag
   * const defaultAzure = AllFeatureFlagsDefault.models_azure; // true
   *
   * // Use as fallback
   * const azureFlag = await getFeatureFlag('models_azure')
   *   ?? AllFeatureFlagsDefault.models_azure;
   *
   * // Access complex defaults
   * const defaultModel = AllFeatureFlagsDefault.models_defaults.value.google;
   * // 'gemini-1.5-pro'
   * ```
   *
   * @constant
   * @type {AllFeatureFlagStatus}
   * @readonly
   */
  export const AllFeatureFlagsDefault: AllFeatureFlagStatus;

  /**
   * Type alias capturing the exact literal type of AllFeatureFlagsDefault.
   *
   * This type preserves the specific literal types of the default configuration
   * (e.g., `true` instead of `boolean`, `'lofi'` instead of `string`), enabling
   * more precise type inference throughout the application.
   *
   * Primarily used internally for deriving other utility types like
   * FeatureFlagValueType, but can also be useful for ensuring exact type matching
   * in tests or type assertions.
   *
   * @example
   * ```typescript
   * // Extract exact type
   * type DefaultsType = AllFeatureFlagDefaultType;
   * // {
   * //   models_azure: true,
   * //   models_openai: false,
   * //   ...
   * // }
   *
   * // Use for type assertions
   * const config: AllFeatureFlagDefaultType = AllFeatureFlagsDefault;
   * ```
   *
   * @typedef {typeof AllFeatureFlagsDefault} AllFeatureFlagDefaultType
   */
  export type AllFeatureFlagDefaultType = typeof AllFeatureFlagsDefault;

  /**
   * Conditional type that extracts the specific value type for a given feature flag key.
   *
   * This utility type provides type-safe access to feature flag values by inferring
   * the exact type from the defaults configuration. It ensures that when you access
   * a specific flag, you get back the correct type (boolean, number, string, or complex object).
   *
   * The type uses TypeScript's conditional types and mapped types to:
   * 1. Check if K is a valid key in AllFeatureFlagDefaultType
   * 2. If valid, extract (Pick) the specific property type
   * 3. If invalid, return `never` to cause a compile error
   *
   * Type Safety Benefits:
   * - Prevents accessing non-existent flags at compile time
   * - Infers precise return types for flag getter functions
   * - Enables autocomplete for flag-specific value properties
   * - Catches type mismatches when setting flag values
   *
   * @example
   * ```typescript
   * // Extract boolean type
   * type AzureType = FeatureFlagValueType<'models_azure'>;
   * // Result: true (literal type from defaults)
   *
   * // Extract complex object type
   * type DefaultsType = FeatureFlagValueType<'models_defaults'>;
   * // Result: { enabled: true, value: { openai: 'lofi', ... } }
   *
   * // Use in generic functions
   * async function getTypedFlag<K extends KnownFeatureType>(
   *   key: K
   * ): Promise<FeatureFlagValueType<K>> {
   *   return await getFeatureFlag(key);
   * }
   *
   * const azure = await getTypedFlag('models_azure');
   * // Type is inferred as: true | false (boolean from defaults)
   *
   * // Compile error for invalid key
   * type Invalid = FeatureFlagValueType<'nonexistent'>;
   * // Result: never
   * ```
   *
   * @template K - The feature flag key (must extend KnownFeatureType)
   * @typedef {K extends keyof AllFeatureFlagDefaultType ? Pick<AllFeatureFlagDefaultType, K>[K] : never} FeatureFlagValueType
   */
  export type FeatureFlagValueType<K extends KnownFeatureType> =
    K extends keyof AllFeatureFlagDefaultType
      ? Pick<AllFeatureFlagDefaultType, K>[K]
      : never;
}
