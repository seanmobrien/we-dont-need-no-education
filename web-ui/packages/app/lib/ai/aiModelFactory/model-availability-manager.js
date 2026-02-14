import { isAiProviderType } from '@/lib/ai/core';
import { log, LoggedError } from '@compliance-theater/logger';
import { globalRequiredSingleton } from '@compliance-theater/typescript';
import { getModelFlag } from './util';
export class ModelAvailabilityManager {
    availabilityMap = new Map();
    constructor() {
        this.resetToDefaults();
    }
    static get Instance() {
        return globalRequiredSingleton(Symbol.for('@noeducation/aiModelFactory:availability'), () => new ModelAvailabilityManager());
    }
    static getInstance() {
        const ret = this.Instance;
        return ret.initializeFlags().then(() => ret);
    }
    async initializeFlags() {
        return Promise.all(['azure', 'google', 'openai'].map((provider) => getModelFlag(provider).then((flag) => flag.isInitialized ? Promise.resolve(flag.value) : flag.forceRefresh())))
            .then(() => { })
            .catch((error) => {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: `ModelAvailabilityManager:initializeFlags]`,
            });
        });
    }
    isModelAvailable(modelKey) {
        return this.availabilityMap.get(modelKey) ?? true;
    }
    async isProviderAvailable(provider) {
        if (await this.isProviderDisabled(provider)) {
            return false;
        }
        const providerModels = Array.from(this.availabilityMap.keys()).filter((key) => key.startsWith(`${provider}:`));
        if (providerModels.length === 0)
            return true;
        return providerModels.some((key) => this.availabilityMap.get(key) === true);
    }
    disableModel(modelKey) {
        this.availabilityMap.set(modelKey, false);
    }
    async enableModel(modelKey) {
        if (await this.isProviderDisabled(modelKey)) {
            return;
        }
        this.availabilityMap.set(modelKey, true);
    }
    async isProviderDisabled(provider) {
        const [normalProvider] = provider.split(':');
        if (isAiProviderType(normalProvider)) {
            const flag = await getModelFlag(normalProvider);
            if (flag.isEnabled !== true) {
                log((l) => l.warn(`Cannot enable model for disabled provider: ${provider}`));
                return true;
            }
            return false;
        }
        log((l) => l.warn(`Cannot enable model for unknown provider: ${provider}`));
        return true;
    }
    disableProvider(provider) {
        const modelTypes = ['hifi', 'lofi', 'completions', 'embedding'];
        const googleSpecificModels = [
            'gemini-pro',
            'gemini-flash',
            'google-embedding',
        ];
        if (provider === 'azure') {
            modelTypes.forEach((model) => this.disableModel(`azure:${model}`));
        }
        else if (provider === 'google') {
            [...modelTypes, ...googleSpecificModels].forEach((model) => this.disableModel(`google:${model}`));
        }
        else if (provider === 'openai') {
            modelTypes.forEach((model) => this.disableModel(`openai:${model}`));
        }
    }
    async enableProvider(provider) {
        const modelTypes = ['hifi', 'lofi', 'completions', 'embedding'];
        const googleSpecificModels = [
            'gemini-pro',
            'gemini-flash',
            'google-embedding',
        ];
        if (await this.isProviderDisabled(provider)) {
            return;
        }
        if (provider === 'azure') {
            modelTypes.forEach((model) => this.enableModel(`azure:${model}`));
        }
        else if (provider === 'google') {
            [...modelTypes, ...googleSpecificModels].forEach((model) => this.enableModel(`google:${model}`));
        }
        else if (provider === 'openai') {
            modelTypes.forEach((model) => this.enableModel(`openai:${model}`));
        }
    }
    temporarilyDisableModel(modelKey, durationMs) {
        this.disableModel(modelKey);
        setTimeout(() => {
            this.enableModel(modelKey);
        }, durationMs);
    }
    resetToDefaults() {
        this.availabilityMap.clear();
    }
    getAvailabilityStatus() {
        const status = {};
        for (const [key, value] of this.availabilityMap.entries()) {
            status[key] = value;
        }
        return status;
    }
}
export const getAvailability = () => ModelAvailabilityManager.Instance;
export const disableModel = (modelKey) => getAvailability().disableModel(modelKey);
export const enableModel = (modelKey) => getAvailability().enableModel(modelKey);
export const disableProvider = (provider) => getAvailability().disableProvider(provider);
export const enableProvider = (provider) => getAvailability().enableProvider(provider);
export const temporarilyDisableModel = (modelKey, durationMs) => getAvailability().temporarilyDisableModel(modelKey, durationMs);
export const isModelAvailable = (modelKey) => getAvailability().isModelAvailable(modelKey);
export const isProviderAvailable = (provider) => getAvailability().isProviderAvailable(provider);
export const getModelAvailabilityStatus = () => getAvailability().getAvailabilityStatus();
export const resetModelAvailability = () => getAvailability().resetToDefaults();
export const handleAzureRateLimit = (durationMs = 300000) => {
    log((l) => l.warn('Azure rate limit detected, temporarily disabling Azure models'));
    getAvailability().temporarilyDisableModel('azure:hifi', durationMs);
    getAvailability().temporarilyDisableModel('azure:lofi', durationMs);
    getAvailability().temporarilyDisableModel('azure:completions', durationMs);
    getAvailability().temporarilyDisableModel('azure:embedding', durationMs);
};
export const handleGoogleRateLimit = (durationMs = 300000) => {
    log((l) => l.warn('Google rate limit detected, temporarily disabling Google models'));
    getAvailability().temporarilyDisableModel('google:hifi', durationMs);
    getAvailability().temporarilyDisableModel('google:lofi', durationMs);
    getAvailability().temporarilyDisableModel('google:embedding', durationMs);
    getAvailability().temporarilyDisableModel('google:gemini-pro', durationMs);
    getAvailability().temporarilyDisableModel('google:gemini-flash', durationMs);
    getAvailability().temporarilyDisableModel('google:google-embedding', durationMs);
};
export const handleOpenAIRateLimit = (durationMs = 300000) => {
    log((l) => l.warn('OpenAI rate limit detected, temporarily disabling OpenAI models'));
    getAvailability().temporarilyDisableModel('openai:hifi', durationMs);
    getAvailability().temporarilyDisableModel('openai:lofi', durationMs);
    getAvailability().temporarilyDisableModel('openai:completions', durationMs);
    getAvailability().temporarilyDisableModel('openai:embedding', durationMs);
};
//# sourceMappingURL=model-availability-manager.js.map