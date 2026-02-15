/**
 * @fileoverview FeatureFlagFetchConfigManager - FetchConfigManager backed by feature flags
 *
 * This implementation extends the basic FetchConfigManager to load configuration
 * values from Flagsmith using AutoRefreshFeatureFlag instances. It provides
 * dynamic configuration that can be updated without redeploying the application.
 */

import { wellKnownFlagSync } from '@compliance-theater/feature-flags/feature-flag-with-refresh';
import type {
  AutoRefreshFeatureFlag,
  MinimalNodeFlagsmith,
} from '@compliance-theater/feature-flags/types';
import type { FetchConfig, FetchConfigManager, FetchConfigManagerFactory } from '@compliance-theater/fetch';
import { AllFeatureFlagsDefault } from '@compliance-theater/feature-flags/known-feature-defaults';
import { flagsmithServerFactory } from '@compliance-theater/feature-flags/server';
import { LoggedError } from '@compliance-theater/logger';
import { getFetchConfigFactory, setFetchConfigFactory } from '@compliance-theater/fetch';

const FETCH_CONFIG_SALT = 'fetch-config-v1' as const;
const FETCH_CONFIG_SERVER_TIMEOUT = 5 * 60 * 1000; // 5 minutes

let fetchConfigFlagsmith: MinimalNodeFlagsmith | undefined = undefined;

/**
 * Factory function for creating or reusing a Flagsmith instance
 * @internal
 */
const fetchConfigFlagsmithFactory = (): MinimalNodeFlagsmith => {
  // If a fetchmanager-specific server already exists, reuse it
  if (fetchConfigFlagsmith) {
    return fetchConfigFlagsmith;
  }

  // Otherwise, we need to create a special flagsmith instance that uses
  // a version of fetch that is not provided by ServerFetchManager or we
  // wind up with a circular dependency and stack-busting horribleness.
  fetchConfigFlagsmith = flagsmithServerFactory({
    fetch: globalThis.fetch,
  });

  // Schedule cleanup after timeout expires
  setTimeout(async () => {
    const thisServer = fetchConfigFlagsmith;
    fetchConfigFlagsmith = undefined;
    try {
      if (
        thisServer &&
        'close' in thisServer &&
        typeof thisServer.close === 'function'
      ) {
        await thisServer.close();
      }
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        source: 'fetch-config:flagsmith:close',
        log: true,
      });
    }
  }, FETCH_CONFIG_SERVER_TIMEOUT);

  return fetchConfigFlagsmith;
};

/**
 * FeatureFlagFetchConfigManager - Manages fetch configuration with auto-refresh from feature flags
 *
 * This class provides a FetchConfigManager implementation that loads configuration
 * values from Flagsmith. It uses AutoRefreshFeatureFlag instances for each
 * configuration value, providing automatic refresh and caching.
 *
 * @example
 * ```typescript
 * const manager = new FeatureFlagFetchConfigManager();
 * await manager.initialize();
 * const config = manager.value;
 * ```
 */
export class FeatureFlagFetchConfigManager implements FetchConfigManager {
  readonly #models_fetch_concurrency: AutoRefreshFeatureFlag<'models_fetch_concurrency'>;
  readonly #fetch_cache_ttl: AutoRefreshFeatureFlag<'models_fetch_cache_ttl'>;
  readonly #models_fetch_enhanced: AutoRefreshFeatureFlag<'models_fetch_enhanced'>;
  readonly #models_fetch_trace_level: AutoRefreshFeatureFlag<'models_fetch_trace_level'>;
  readonly #models_fetch_stream_buffer: AutoRefreshFeatureFlag<'models_fetch_stream_buffer'>;
  readonly #fetch_stream_max_chunks: AutoRefreshFeatureFlag<'models_fetch_stream_max_chunks'>;
  readonly #fetch_stream_max_total_bytes: AutoRefreshFeatureFlag<'models_fetch_stream_max_total_bytes'>;
  readonly #fetch_dedup_writerequests: AutoRefreshFeatureFlag<'models_fetch_dedup_writerequests'>;

  constructor() {
    this.#models_fetch_concurrency =
      wellKnownFlagSync<'models_fetch_concurrency'>(
        'models_fetch_concurrency',
        {
          load: false,
          salt: FETCH_CONFIG_SALT,
          flagsmith: fetchConfigFlagsmithFactory,
        },
      );
    this.#fetch_cache_ttl = wellKnownFlagSync<'models_fetch_cache_ttl'>(
      'models_fetch_cache_ttl',
      {
        load: false,
        salt: FETCH_CONFIG_SALT,
        flagsmith: fetchConfigFlagsmithFactory,
      },
    );
    this.#models_fetch_enhanced = wellKnownFlagSync<'models_fetch_enhanced'>(
      'models_fetch_enhanced',
      {
        load: false,
        salt: FETCH_CONFIG_SALT,
        flagsmith: fetchConfigFlagsmithFactory,
      },
    );
    this.#models_fetch_trace_level =
      wellKnownFlagSync<'models_fetch_trace_level'>(
        'models_fetch_trace_level',
        {
          load: false,
          salt: FETCH_CONFIG_SALT,
          flagsmith: fetchConfigFlagsmithFactory,
        },
      );
    this.#models_fetch_stream_buffer =
      wellKnownFlagSync<'models_fetch_stream_buffer'>(
        'models_fetch_stream_buffer',
        {
          load: false,
          salt: FETCH_CONFIG_SALT,
          flagsmith: fetchConfigFlagsmithFactory,
        },
      );
    this.#fetch_stream_max_chunks =
      wellKnownFlagSync<'models_fetch_stream_max_chunks'>(
        'models_fetch_stream_max_chunks',
        {
          load: false,
          salt: FETCH_CONFIG_SALT,
          flagsmith: fetchConfigFlagsmithFactory,
        },
      );
    this.#fetch_stream_max_total_bytes =
      wellKnownFlagSync<'models_fetch_stream_max_total_bytes'>(
        'models_fetch_stream_max_total_bytes',
        {
          load: false,
          salt: FETCH_CONFIG_SALT,
          flagsmith: fetchConfigFlagsmithFactory,
        },
      );
    this.#fetch_dedup_writerequests =
      wellKnownFlagSync<'models_fetch_dedup_writerequests'>(
        'models_fetch_dedup_writerequests',
        {
          load: false,
          salt: FETCH_CONFIG_SALT,
          flagsmith: fetchConfigFlagsmithFactory,
        },
      );
  }

  get #flags() {
    return [
      this.#models_fetch_concurrency,
      this.#fetch_cache_ttl,
      this.#models_fetch_enhanced,
      this.#models_fetch_trace_level,
      this.#models_fetch_stream_buffer,
      this.#fetch_stream_max_chunks,
      this.#fetch_stream_max_total_bytes,
      this.#fetch_dedup_writerequests,
    ];
  }

  get value(): Required<FetchConfig> {
    const streamBuffer =
      this.#models_fetch_stream_buffer.value ??
      AllFeatureFlagsDefault.models_fetch_stream_buffer;
    const enhancedConfig = this.#models_fetch_enhanced.value;
    const effectiveEnhancedConfig =
      enhancedConfig ?? AllFeatureFlagsDefault.models_fetch_enhanced;
    return {
      fetch_concurrency: this.#models_fetch_concurrency.value,
      stream_enabled: !!streamBuffer,
      fetch_stream_detect_buffer: streamBuffer?.detect ?? 4096,
      fetch_stream_buffer_max: streamBuffer?.max ?? 65536,
      fetch_cache_ttl: this.#fetch_cache_ttl.value,
      enhanced: !!effectiveEnhancedConfig,
      timeout: effectiveEnhancedConfig.timeout,
      trace_level: this.#models_fetch_trace_level.value,
      fetch_stream_max_chunks: this.#fetch_stream_max_chunks.value,
      fetch_stream_max_total_bytes: this.#fetch_stream_max_total_bytes.value,
      dedup_writerequests: this.#fetch_dedup_writerequests.value,
    };
  }

  get isStale(): boolean {
    return this.#flags.some((flag) => flag.isStale);
  }

  get lastError(): Error | null {
    return this.#flags.find((x) => x.lastError !== null)?.lastError || null;
  }

  get ttlRemaining(): number {
    return this.#flags.reduce((min, flag) => {
      return Math.min(min, flag.ttlRemaining);
    }, Infinity);
  }

  get isInitialized(): boolean {
    return this.#flags.every((flag) => flag.expiresAt > 0);
  }

  /**
   * Force immediate refresh (for testing or manual refresh)
   */
  async forceRefresh(): Promise<Required<FetchConfig>> {
    await Promise.all(this.#flags.map((flag) => flag.forceRefresh()));
    return this.value;
  }

  /**
   * Initialize with first load
   */
  async initialize(): Promise<Required<FetchConfig>> {
    await Promise.all(
      this.#flags.map((flag) =>
        flag.isInitialized ? Promise.resolve(flag.value) : flag.forceRefresh(),
      ),
    );
    return this.value;
  }

  /**
   * Factory stack for managing nested setup/teardown calls
   * @internal
   */
  private static factoryStack: FetchConfigManagerFactory[] = [];

  /**
   * Setup FeatureFlagFetchConfigManager as the global factory
   *
   * This static method:
   * 1. Gets the current factory using getFetchConfigFactory()
   * 2. Stores it in a global stack
   * 3. Uses setFetchConfigFactory() to update the factory to return FeatureFlagFetchConfigManager instances
   * 4. Returns a disposable object that calls teardown() when disposed
   *
   * @returns A disposable object that restores the previous factory when disposed
   *
   * @example
   * ```typescript
   * // Using explicit disposal
   * const disposable = FeatureFlagFetchConfigManager.setup();
   * try {
   *   // Use feature-flag backed configuration
   *   const config = getFetchConfigFactory()();
   * } finally {
   *   disposable[Symbol.dispose]();
   * }
   *
   * // Using automatic disposal with 'using' declaration (TypeScript 5.2+)
   * using _setup = FeatureFlagFetchConfigManager.setup();
   * // Configuration is automatically restored when scope exits
   * ```
   */
  static setup(): { [Symbol.dispose]: () => void } {
    // Get current factory and push to stack
    const currentFactory = getFetchConfigFactory();
    FeatureFlagFetchConfigManager.factoryStack.push(currentFactory);

    // Set new factory that creates FeatureFlagFetchConfigManager instances
    setFetchConfigFactory(() => new FeatureFlagFetchConfigManager());

    // Track if dispose has been called
    let disposed = false;

    // Return disposable object
    return {
      [Symbol.dispose](): void {
        if (!disposed) {
          disposed = true;
          FeatureFlagFetchConfigManager.teardown();
        }
      },
    };
  }

  /**
   * Teardown the FeatureFlagFetchConfigManager factory
   *
   * This static method:
   * 1. Pops the most recent factory from the stack
   * 2. Passes it to setFetchConfigFactory()
   * 3. If the stack is empty, passes undefined to setFetchConfigFactory() instead
   *
   * @internal
   */
  static teardown(): void {
    const previousFactory = FeatureFlagFetchConfigManager.factoryStack.pop();
    setFetchConfigFactory(previousFactory ?? undefined);
  }
}
