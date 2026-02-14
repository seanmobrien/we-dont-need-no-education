import { jest } from '@jest/globals';
jest.mock('@ai-sdk/azure', () => ({
    createAzure: jest.fn(() => ({
        completion: jest.fn(() => ({ modelType: 'azure-completions' })),
        chat: jest.fn(() => ({ modelType: 'azure-chat' })),
        textEmbeddingModel: jest.fn(() => ({ modelType: 'azure-embedding' })),
    })),
    AzureOpenAIProvider: jest.fn(),
}));
jest.mock('@ai-sdk/google', () => ({
    createGoogleGenerativeAI: jest.fn(() => ({
        chat: jest.fn(() => ({ modelType: 'google-chat' })),
        textEmbeddingModel: jest.fn(() => ({ modelType: 'google-embedding' })),
    })),
    GoogleGenerativeAIProvider: jest.fn(),
}));
jest.mock('ai', () => {
    const actual = jest.requireActual('ai');
    return {
        ...actual,
        customProvider: jest.fn((config) => ({
            languageModels: config.languageModels || {},
            embeddingModels: config.embeddingModels || {},
            fallbackProvider: config.fallbackProvider,
        })),
        createProviderRegistry: jest.fn(() => ({
            languageModel: jest.fn((id) => ({ modelId: id, type: 'language' })),
            textEmbeddingModel: jest.fn((id) => ({ modelId: id, type: 'embedding' })),
        })),
    };
});
//# sourceMappingURL=jest.mock-ai.js.map