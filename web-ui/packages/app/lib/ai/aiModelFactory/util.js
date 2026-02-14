import { isAiProviderType, } from '@/lib/ai/core';
import { wellKnownFlag } from '@compliance-theater/feature-flags/feature-flag-with-refresh';
import { LoggedError } from '@compliance-theater/logger';
import { log } from '@compliance-theater/logger';
export const AutoRefreshProviderFlagKeyMap = {
    azure: 'models_config_azure',
    google: 'models_config_google',
    openai: 'models_config_openai',
};
export const asAutoRefreshFlagKey = (provider) => AutoRefreshProviderFlagKeyMap[provider];
export const getModelFlag = async (provider) => {
    if (isAiProviderType(provider)) {
        const flagType = asAutoRefreshFlagKey(provider);
        return await wellKnownFlag(flagType, { load: true });
    }
    throw new TypeError(`Invalid provider for model flag: ${provider}`);
};
export const normalizeModelKeyForProvider = (provider, modelType) => {
    if (modelType.startsWith(provider + ':')) {
        return modelType;
    }
    const idx = modelType.indexOf(':');
    if (idx > -1) {
        return `${provider}:${modelType.substring(idx + 1)}`;
    }
    return `${provider}:${modelType}`;
};
export const caseProviderMatch = (prefix, modelType) => {
    if (modelType.startsWith(prefix)) {
        return modelType;
    }
    return 'not-a-match';
};
export const SupportedProviders = [
    'azure',
    'google',
    'openai',
];
export const initializeProviderConfig = async () => {
    const rawMcpFlags = [
        'mcp_cache_client',
        'mcp_cache_tools',
        'mcp_protocol_http_stream',
        'mem0_mcp_tools_enabled',
    ];
    const refreshFlag = async (key, flag) => {
        try {
            const f = await flag;
            if (!f || f.isInitialized) {
                return f;
            }
            await f.forceRefresh();
            return f;
        }
        catch (e) {
            const le = LoggedError.isTurtlesAllTheWayDownBaby(e, {
                log: true,
                source: `initializeAiModelConfig:[${key}]`,
            });
            log((l) => l.warn(`=== ${le.source}: Failed to load critical feature flag: model resolution may be impacted ===\n\tDetails: ${le.message}`));
            return flag;
        }
    };
    const flags = await Promise.all([
        ...rawMcpFlags.map((f) => refreshFlag(f, wellKnownFlag(f))),
    ]);
    log((l) => l.verbose(`---=== AI Model Subsystem successfully initialized; ${flags.length} settings were loaded.`));
};
//# sourceMappingURL=util.js.map