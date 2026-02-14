import type { EmbeddingModelV2, LanguageModelV2, ProviderV2 } from '@ai-sdk/provider';
import { type AiModelType, type AiProviderType } from '@/lib/ai/core';
import type { AutoRefreshFeatureFlag } from '@compliance-theater/feature-flags/types';
export declare const AutoRefreshProviderFlagKeyMap: {
    readonly azure: "models_config_azure";
    readonly google: "models_config_google";
    readonly openai: "models_config_openai";
};
export type AutoRefreshFlagKey<P extends AiProviderType> = (typeof AutoRefreshProviderFlagKeyMap)[P];
export declare const asAutoRefreshFlagKey: <P extends AiProviderType>(provider: P) => AutoRefreshFlagKey<P>;
export declare const getModelFlag: <P extends AiProviderType>(provider: P) => Promise<AutoRefreshFeatureFlag<AutoRefreshFlagKey<P>>>;
export type ModelFromDeploymentId<T extends string | undefined> = T extends undefined ? ProviderV2 & {
    chat: (model: string) => LanguageModelV2;
} : T extends 'embedding' ? EmbeddingModelV2<string> : LanguageModelV2;
interface NormalizeModelKeyForProviderOverloads {
    (provider: 'azure', modelType: AiModelType): `azure:${string}`;
    (provider: 'google', modelType: AiModelType): `google:${string}`;
    (provider: 'openai', modelType: AiModelType): `openai:${string}`;
}
export declare const normalizeModelKeyForProvider: NormalizeModelKeyForProviderOverloads;
export declare const caseProviderMatch: (prefix: string, modelType: AiModelType) => AiModelType;
export declare const SupportedProviders: Array<AiProviderType>;
export declare const initializeProviderConfig: () => Promise<void>;
export {};
//# sourceMappingURL=util.d.ts.map