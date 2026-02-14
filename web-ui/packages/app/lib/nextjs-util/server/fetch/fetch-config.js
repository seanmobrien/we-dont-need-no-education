import { wellKnownFlagSync } from '@compliance-theater/feature-flags/feature-flag-with-refresh';
import { AllFeatureFlagsDefault } from '@compliance-theater/feature-flags/known-feature-defaults';
import { flagsmithServerFactory } from '@compliance-theater/feature-flags/server';
import { LoggedError } from '@compliance-theater/logger';
const FETCH_CONFIG_SALT = 'fetch-config-v1';
const FETCH_CONFIG_SERVER_TIMEOUT = 5 * 60 * 1000;
export const FETCH_MANAGER_SINGLETON_KEY = '@noeducation/fetch-manager';
let fetchConfigFlagsmith = undefined;
const fetchConfigFlagsmithFactory = () => {
    if (fetchConfigFlagsmith) {
        return fetchConfigFlagsmith;
    }
    fetchConfigFlagsmith = flagsmithServerFactory({
        fetch: globalThis.fetch,
    });
    setTimeout(async () => {
        const thisServer = fetchConfigFlagsmith;
        fetchConfigFlagsmith = undefined;
        try {
            if (thisServer &&
                'close' in thisServer &&
                typeof thisServer.close === 'function') {
                await thisServer.close();
            }
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                source: 'fetch-config:flagsmith:close',
                log: true,
            });
        }
    }, FETCH_CONFIG_SERVER_TIMEOUT);
    return fetchConfigFlagsmith;
};
class FetchConfigManager {
    #models_fetch_concurrency;
    #fetch_cache_ttl;
    #models_fetch_enhanced;
    #models_fetch_trace_level;
    #models_fetch_stream_buffer;
    #fetch_stream_max_chunks;
    #fetch_stream_max_total_bytes;
    #fetch_dedup_writerequests;
    constructor() {
        this.#models_fetch_concurrency =
            wellKnownFlagSync('models_fetch_concurrency', {
                load: false,
                salt: FETCH_CONFIG_SALT,
                flagsmith: fetchConfigFlagsmithFactory,
            });
        this.#fetch_cache_ttl = wellKnownFlagSync('models_fetch_cache_ttl', {
            load: false,
            salt: FETCH_CONFIG_SALT,
            flagsmith: fetchConfigFlagsmithFactory,
        });
        this.#models_fetch_enhanced = wellKnownFlagSync('models_fetch_enhanced', {
            load: false,
            salt: FETCH_CONFIG_SALT,
            flagsmith: fetchConfigFlagsmithFactory,
        });
        this.#models_fetch_trace_level =
            wellKnownFlagSync('models_fetch_trace_level', {
                load: false,
                salt: FETCH_CONFIG_SALT,
                flagsmith: fetchConfigFlagsmithFactory,
            });
        this.#models_fetch_stream_buffer =
            wellKnownFlagSync('models_fetch_stream_buffer', {
                load: false,
                salt: FETCH_CONFIG_SALT,
                flagsmith: fetchConfigFlagsmithFactory,
            });
        this.#fetch_stream_max_chunks =
            wellKnownFlagSync('models_fetch_stream_max_chunks', {
                load: false,
                salt: FETCH_CONFIG_SALT,
                flagsmith: fetchConfigFlagsmithFactory,
            });
        this.#fetch_stream_max_total_bytes =
            wellKnownFlagSync('models_fetch_stream_max_total_bytes', {
                load: false,
                salt: FETCH_CONFIG_SALT,
                flagsmith: fetchConfigFlagsmithFactory,
            });
        this.#fetch_dedup_writerequests =
            wellKnownFlagSync('models_fetch_dedup_writerequests', {
                load: false,
                salt: FETCH_CONFIG_SALT,
                flagsmith: fetchConfigFlagsmithFactory,
            });
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
    get value() {
        const streamBuffer = this.#models_fetch_stream_buffer.value ??
            AllFeatureFlagsDefault.models_fetch_stream_buffer;
        const enhancedConfig = this.#models_fetch_enhanced.value;
        return {
            fetch_concurrency: this.#models_fetch_concurrency.value,
            stream_enabled: !!streamBuffer,
            fetch_stream_buffer_max: streamBuffer?.max ?? 0,
            fetch_stream_detect_buffer: streamBuffer?.detect ?? false,
            fetch_cache_ttl: this.#fetch_cache_ttl.value,
            enhanced: !!enhancedConfig,
            timeout: enhancedConfig
                ? enhancedConfig.timeout
                : AllFeatureFlagsDefault.models_fetch_enhanced.timeout,
            trace_level: this.#models_fetch_trace_level.value,
            fetch_stream_max_chunks: this.#fetch_stream_max_chunks.value,
            fetch_stream_max_total_bytes: this.#fetch_stream_max_total_bytes.value,
            dedup_writerequests: this.#fetch_dedup_writerequests.value,
        };
    }
    get isStale() {
        return this.#flags.some((flag) => flag.isStale);
    }
    get lastError() {
        return this.#flags.find((x) => x.lastError !== null)?.lastError || null;
    }
    get ttlRemaining() {
        return this.#flags.reduce((min, flag) => {
            return Math.min(min, flag.ttlRemaining);
        }, Infinity);
    }
    get isInitialized() {
        return this.#flags.every((flag) => flag.expiresAt > 0);
    }
    async forceRefresh() {
        await Promise.all(this.#flags.map((flag) => flag.forceRefresh()));
        return this.value;
    }
    async initialize() {
        await Promise.all(this.#flags.map((flag) => flag.isInitialized ? Promise.resolve(flag.value) : flag.forceRefresh()));
        return this.value;
    }
}
export const fetchConfig = async () => {
    return new FetchConfigManager().initialize();
};
export const fetchConfigSync = () => {
    return new FetchConfigManager().value;
};
export const forceRefreshFetchConfig = async () => fetchConfig();
export const getFetchConfigStatus = () => new FetchConfigManager();
export default fetchConfig;
//# sourceMappingURL=fetch-config.js.map