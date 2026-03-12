import type {
    EmbeddingModelV2,
    LanguageModelV2,
    ProviderV2,
} from '@ai-sdk/provider';
import type { AiModelType } from '../core/unions';
import type {
    ProviderRegistryProvider
} from '../../../ai-sdk/index';


export type AiModelProvider = ProviderV2 & {
    chat: (model: string) => LanguageModelV2;
    completions?: (model: string) => LanguageModelV2;
};

type RegisteryProviders = {
    "azure": AiModelProvider;
    "google": AiModelProvider;
    "openai": AiModelProvider;
    [key: string]: AiModelProvider;
};

type AppProviderRegisteryProvider = ProviderRegistryProvider<RegisteryProviders, ':'>;

/**
* Overloads for the AI model provider factory function.
*
* @remarks
* This interface defines the various call signatures for obtaining different types of AI model providers.
*
* @overload
* Returns the default Azure provider when called with no arguments.
*
* @overload
* Returns an embedding model when called with a deployment ID of `'embedding'` or `'google-embedding'` and optional embedding options.
* @param deploymentId - The deployment identifier for the embedding model.
* @param options - Optional configuration for the embedding model.
* @returns An instance of `EmbeddingModelV2<string>`.
*
* @overload
* Returns a language model when called with any other deployment ID and optional chat options.
* @param deploymentId - The deployment identifier for the language model, excluding embedding types.
* @param options - Optional configuration for the language model.
* @returns An instance of `LanguageModel`.
*/
export interface GetAiModelProviderOverloads {
    (): Promise<AiModelProvider>;
    (deploymentId: 'embedding' | 'google-embedding'): Promise<
        EmbeddingModelV2<string>
    >;
    (
        deploymentId: Exclude<AiModelType, 'embedding' | 'google-embedding'>
    ): Promise<LanguageModelV2>;
    (deploymentId: AiModelType): Promise<
        LanguageModelV2 | EmbeddingModelV2<string>
    >;
}


export type IAiModelFactoryService = {
    getProviderRegistry: () => Promise<AppProviderRegisteryProvider>;
    aiModelFactory: GetAiModelProviderOverloads;
    createEmbeddingModel: () => Promise<EmbeddingModelV2<string>>;
    createGoogleEmbeddingModel: Promise<EmbeddingModelV2<string>>;
};

export type IModelAvailabilityManager = {
    disableModel: any;
    enableModel: any;
    disableProvider: any;
    enableProvider: any;
    temporarilyDisableModel: any;
    isModelAvailable: any;
    isProviderAvailable: any;
    getModelAvailabilityStatus: any;
    resetModelAvailability: any;
    handleAzureRateLimit: any;
    handleGoogleRateLimit: any;
    handleOpenAIRateLimit: any;
};