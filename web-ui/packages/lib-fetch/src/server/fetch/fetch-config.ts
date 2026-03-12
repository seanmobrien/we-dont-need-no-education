import { DEFAULT_ENHANCED_FETCH_CONFIG } from './enhanced-fetch-config';
import type { FetchConfig } from './fetch-types';

const defaultConfig: Required<FetchConfig> = {
    fetch_concurrency: 8,
    fetch_stream_detect_buffer: 4 * 1024,
    fetch_stream_buffer_max: 64 * 1024,
    fetch_cache_ttl: 300,
    fetch_stream_max_chunks: 100,
    fetch_stream_max_total_bytes: 10 * 1024 * 1024,
    enhanced: true,
    timeout: DEFAULT_ENHANCED_FETCH_CONFIG.timeout,
    stream_enabled: true,
    dedup_writerequests: true,
};

export const FETCH_MANAGER_SINGLETON_KEY = '@compliance-theater/fetch-manager';

let overrideConfig: Partial<FetchConfig> | undefined;

const merged = (): Required<FetchConfig> => ({
    ...defaultConfig,
    ...(overrideConfig ?? {}),
    timeout: {
        ...defaultConfig.timeout,
        ...(overrideConfig?.timeout ?? {}),
    },
});

export const fetchConfigSync = (): Required<FetchConfig> => merged();

export const fetchConfig = async (): Promise<Required<FetchConfig>> => merged();

export const configureFetchConfig = (config: Partial<FetchConfig>): Required<FetchConfig> => {
    overrideConfig = {
        ...(overrideConfig ?? {}),
        ...config,
        timeout: {
            ...(overrideConfig?.timeout ?? {}),
            ...(config.timeout ?? {}),
        },
    };
    return merged();
};

export const resetFetchConfig = (): Required<FetchConfig> => {
    overrideConfig = undefined;
    return merged();
};
