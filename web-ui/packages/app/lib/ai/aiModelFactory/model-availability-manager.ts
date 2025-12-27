import {
  isAiProviderType,
} from '@/lib/ai/core';
import { log } from '@repo/lib-logger';
import {
  globalRequiredSingleton,
} from '@/lib/typescript';
import { LoggedError } from '@/lib/react-util';
import { getModelFlag } from './util';


/**
 * Model availability manager for programmatic control of model enabling/disabling
 */
export class ModelAvailabilityManager {
  private availabilityMap = new Map<string, boolean>();

  private constructor() {
    // Initialize all models as available by default
    this.resetToDefaults();
  }

  static get Instance(): ModelAvailabilityManager {
    return globalRequiredSingleton(
      Symbol.for('@noeducation/aiModelFactory:availability'),
      () => new ModelAvailabilityManager(),
    );
  }

  static getInstance(): Promise<ModelAvailabilityManager> {
    const ret = this.Instance;
    return ret.initializeFlags().then(() => ret);
  }

  async initializeFlags(): Promise<void> {
    return Promise.all(
      ['azure', 'google', 'openai'].map((provider) =>
        getModelFlag(provider as 'azure' | 'google' | 'openai').then(
          (flag) =>
            flag.isInitialized
              ? Promise.resolve(flag.value)
              : flag.forceRefresh(),
        ),
      ),
    )
      .then(() => { })
      .catch((error) => {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: `ModelAvailabilityManager:initializeFlags]`,
        });
      });
  }

  /**
   * Check if a specific model is available
   */
  isModelAvailable(modelKey: string): boolean {
    return this.availabilityMap.get(modelKey) ?? true;
  }

  /**
   * Check if a provider is available (checks if any model for that provider is available)
   */
  async isProviderAvailable(provider: 'azure' | 'google' | 'openai'): Promise<boolean> {
    if (await this.isProviderDisabled(provider)) {
      return false;
    }

    const providerModels = Array.from(this.availabilityMap.keys()).filter(
      (key) => key.startsWith(`${provider}:`),
    );

    if (providerModels.length === 0) return true; // No explicit settings, assume available

    return providerModels.some((key) => this.availabilityMap.get(key) === true);
  }

  /**
   * Disable a specific model
   */
  disableModel(modelKey: string): void {
    this.availabilityMap.set(modelKey, false);
  }

  /**
   * Enable a specific model
   */
  async enableModel(modelKey: string): Promise<void> {
    if (await this.isProviderDisabled(modelKey)) {
      return;
    }
    // Otherwise it's an enabled provider so we can enable the model
    this.availabilityMap.set(modelKey, true);
  }

  /**
   * is the provider disabled via feature flags
   * @param provider the provider name
   * @returns true if disabled, false otherwise
   */
  private async isProviderDisabled(provider: string): Promise<boolean> {
    const [normalProvider] = provider.split(':');
    if (isAiProviderType(normalProvider)) {
      const flag = await getModelFlag(normalProvider);
      if (flag.isEnabled !== true) {
        log((l) =>
          l.warn(`Cannot enable model for disabled provider: ${provider}`),
        );
        return true;
      }
      return false;
    }
    log((l) => l.warn(`Cannot enable model for unknown provider: ${provider}`));
    return true;
  }

  /**
   * Disable all models for a provider
   */
  disableProvider(provider: 'azure' | 'google' | 'openai'): void {
    const modelTypes = ['hifi', 'lofi', 'completions', 'embedding'];
    const googleSpecificModels = [
      'gemini-pro',
      'gemini-flash',
      'google-embedding',
    ];

    if (provider === 'azure') {
      modelTypes.forEach((model) => this.disableModel(`azure:${model}`));
    } else if (provider === 'google') {
      [...modelTypes, ...googleSpecificModels].forEach((model) =>
        this.disableModel(`google:${model}`),
      );
    } else if (provider === 'openai') {
      modelTypes.forEach((model) => this.disableModel(`openai:${model}`));
    }
  }

  /**
   * Enable all models for a provider
   */
  async enableProvider(provider: 'azure' | 'google' | 'openai'): Promise<void> {
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
    } else if (provider === 'google') {
      [...modelTypes, ...googleSpecificModels].forEach((model) =>
        this.enableModel(`google:${model}`),
      );
    } else if (provider === 'openai') {
      modelTypes.forEach((model) => this.enableModel(`openai:${model}`));
    }
  }

  /**
   * Temporarily disable a model for a specified duration (in milliseconds)
   */
  temporarilyDisableModel(modelKey: string, durationMs: number): void {
    this.disableModel(modelKey);
    setTimeout(() => {
      this.enableModel(modelKey);
    }, durationMs);
  }

  /**
   * Reset all models to default available state
   */
  resetToDefaults(): void {
    this.availabilityMap.clear();
    // All models are available by default (no explicit entries needed)
  }

  /**
   * Get current availability status for debugging
   */
  getAvailabilityStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const [key, value] of this.availabilityMap.entries()) {
      status[key] = value;
    }
    return status;
  }
}

export const getAvailability = () => ModelAvailabilityManager.Instance;

/**
 * Model availability control functions
 */

/**
 * Disable a specific model (e.g., 'azure:hifi', 'google:embedding')
 * @param modelKey - The model key in format 'provider:model' (e.g., 'azure:hifi')
 */
export const disableModel = (modelKey: string): void =>
  getAvailability().disableModel(modelKey);

/**
 * Enable a specific model (e.g., 'azure:hifi', 'google:embedding')
 * @param modelKey - The model key in format 'provider:model' (e.g., 'azure:hifi')
 */
export const enableModel = (modelKey: string): Promise<void> =>
  getAvailability().enableModel(modelKey);

/**
 * Disable all models for a provider
 * @param provider - Either 'azure', 'google', or 'openai'
 */
export const disableProvider = (
  provider: 'azure' | 'google' | 'openai',
): void => getAvailability().disableProvider(provider);
/**
 * Enable all models for a provider
 * @param provider - Either 'azure', 'google', or 'openai'
 */
export const enableProvider = (provider: 'azure' | 'google' | 'openai'): Promise<void> =>
  getAvailability().enableProvider(provider);

/**
 * Temporarily disable a model for a specified duration
 * @param modelKey - The model key in format 'provider:model' (e.g., 'azure:hifi')
 * @param durationMs - Duration in milliseconds to disable the model
 */
export const temporarilyDisableModel = (
  modelKey: string,
  durationMs: number,
): void => getAvailability().temporarilyDisableModel(modelKey, durationMs);
/**
 * Check if a model is currently available
 * @param modelKey - The model key in format 'provider:model' (e.g., 'azure:hifi')
 * @returns True if the model is available, false otherwise
 */
export const isModelAvailable = (modelKey: string): boolean =>
  getAvailability().isModelAvailable(modelKey);

/**
 * Check if a provider is available
 * @param provider - Either 'azure', 'google', or 'openai'
 * @returns True if the provider has any available models, false otherwise
 */
export const isProviderAvailable = (
  provider: 'azure' | 'google' | 'openai',
): Promise<boolean> => getAvailability().isProviderAvailable(provider);
/**
 * Get the current availability status of all models (for debugging)
 * @returns Object mapping model keys to their availability status
 */
export const getModelAvailabilityStatus = (): Record<string, boolean> =>
  getAvailability().getAvailabilityStatus();

/**
 * Reset all models to their default available state
 */
export const resetModelAvailability = (): void =>
  getAvailability().resetToDefaults();

/**
 * Convenience functions for common scenarios
 */

/**
 * Handle Azure rate limiting by temporarily disabling Azure models
 * @param durationMs - Duration in milliseconds to disable Azure (default: 5 minutes)
 */
export const handleAzureRateLimit = (durationMs: number = 300000): void => {
  log((l) =>
    l.warn('Azure rate limit detected, temporarily disabling Azure models'),
  );
  getAvailability().temporarilyDisableModel('azure:hifi', durationMs);
  getAvailability().temporarilyDisableModel('azure:lofi', durationMs);
  getAvailability().temporarilyDisableModel('azure:completions', durationMs);
  getAvailability().temporarilyDisableModel('azure:embedding', durationMs);
};

/**
 * Handle Google rate limiting by temporarily disabling Google models
 * @param durationMs - Duration in milliseconds to disable Google (default: 5 minutes)
 */
export const handleGoogleRateLimit = (durationMs: number = 300000): void => {
  log((l) =>
    l.warn('Google rate limit detected, temporarily disabling Google models'),
  );
  getAvailability().temporarilyDisableModel('google:hifi', durationMs);
  getAvailability().temporarilyDisableModel('google:lofi', durationMs);
  getAvailability().temporarilyDisableModel('google:embedding', durationMs);
  getAvailability().temporarilyDisableModel('google:gemini-pro', durationMs);
  getAvailability().temporarilyDisableModel('google:gemini-flash', durationMs);
  getAvailability().temporarilyDisableModel(
    'google:google-embedding',
    durationMs,
  );
};

/**
 * Handle OpenAI rate limiting by temporarily disabling OpenAI models
 * @param durationMs - Duration in milliseconds to disable OpenAI (default: 5 minutes)
 */
export const handleOpenAIRateLimit = (durationMs: number = 300000): void => {
  log((l) =>
    l.warn('OpenAI rate limit detected, temporarily disabling OpenAI models'),
  );
  getAvailability().temporarilyDisableModel('openai:hifi', durationMs);
  getAvailability().temporarilyDisableModel('openai:lofi', durationMs);
  getAvailability().temporarilyDisableModel('openai:completions', durationMs);
  getAvailability().temporarilyDisableModel('openai:embedding', durationMs);
};
