import { ProviderMap, } from '@/lib/ai/services/model-stats/provider-map';
import { ModelMap, } from '@/lib/ai/services/model-stats/model-map';
export const PROVIDER_ID_AZURE = 'b555b85f-5b2f-45d8-a317-575a3ab50ff2';
export const PROVIDER_ID_GOOGLE = '91cd42ab-e957-4035-8a2d-3d6c997b9538';
export const MODEL_GPT4o = 'gpt-4o-mini';
export const MODEL_ID_GPT4 = '97e291f6-4396-472e-9cb5-13cc94291879';
export const MODEL_ID_GPT4_NO_QUOTA = '97e291f6-4396-472e-9cb5-13cc94291880';
export const providerRecords = [
    [
        PROVIDER_ID_AZURE,
        {
            name: 'azure',
            displayName: 'Azure OpenAI',
            baseUrl: null,
            description: 'Azure OpenAI provider',
            isActive: true,
            aliases: ['azure.chat', 'azure-openai.chat'],
        },
    ],
    [
        PROVIDER_ID_GOOGLE,
        {
            name: 'google.generative-ai',
            baseUrl: null,
            displayName: 'Google Generative AI',
            description: 'Google Generative AI provider',
            isActive: true,
            aliases: ['google'],
        },
    ],
];
export const modelRecords = [
    [
        'b555b85f-5b2f-45d8-a317-575a3ab50ff2:embedding',
        {
            id: 'ce719026-03e2-4cd5-aba0-bb5121c37b7c',
            providerId: 'b555b85f-5b2f-45d8-a317-575a3ab50ff2',
            modelName: 'embedding',
            displayName: 'Azure Text Embedding',
            description: 'Azure OpenAI text embedding model',
            isActive: true,
            createdAt: '2025-08-01T14:18:55.625835+00:00',
            updatedAt: '2025-08-01T14:18:55.625835+00:00',
        },
    ],
    [
        'b555b85f-5b2f-45d8-a317-575a3ab50ff2:o3-mini',
        {
            id: 'bc1a33e7-1330-4be1-913a-28bda8ebd835',
            providerId: 'b555b85f-5b2f-45d8-a317-575a3ab50ff2',
            modelName: 'o3-mini',
            displayName: 'Azure O3 Mini',
            description: 'Azure OpenAI O3 mini model for completions',
            isActive: true,
            createdAt: '2025-08-01T14:18:55.625835+00:00',
            updatedAt: '2025-08-01T14:18:55.625835+00:00',
        },
    ],
    [
        'b555b85f-5b2f-45d8-a317-575a3ab50ff2:gpt-4o-mini',
        {
            id: 'dbae7862-637d-41c0-9610-b59c885a94ef',
            providerId: 'b555b85f-5b2f-45d8-a317-575a3ab50ff2',
            modelName: 'gpt-4o-mini',
            displayName: 'Azure GPT-4o Mini',
            description: 'Low-fidelity Azure OpenAI GPT-4o mini model for general purpose tasks',
            isActive: true,
            createdAt: '2025-08-01T14:18:55.625835+00:00',
            updatedAt: '2025-08-01T14:18:55.625835+00:00',
        },
    ],
    [
        'b555b85f-5b2f-45d8-a317-575a3ab50ff2:gpt-4.1',
        {
            id: '97e291f6-4396-472e-9cb5-13cc94291879',
            providerId: 'b555b85f-5b2f-45d8-a317-575a3ab50ff2',
            modelName: 'gpt-4.1',
            displayName: 'Azure GPT-4.1',
            description: 'High-fidelity Azure OpenAI GPT-4 model for complex reasoning and analysis',
            isActive: true,
            createdAt: '2025-08-01T14:18:55.625835+00:00',
            updatedAt: '2025-08-01T14:18:55.625835+00:00',
        },
    ],
    [
        'b555b85f-5b2f-45d8-a317-575a3ab50ff2:gpt-4.1-no-quota',
        {
            id: '97e291f6-4396-472e-9cb5-13cc94291880',
            providerId: 'b555b85f-5b2f-45d8-a317-575a3ab50ff2',
            modelName: 'gpt-4.1-no-quota',
            displayName: 'Azure GPT-4.1 No-Quota',
            description: 'High-fidelity Azure OpenAI GPT-4 model for complex reasoning and analysis; no active quota record configured',
            isActive: true,
            createdAt: '2025-08-01T14:18:55.625835+00:00',
            updatedAt: '2025-08-01T14:18:55.625835+00:00',
        },
    ],
    [
        '91cd42ab-e957-4035-8a2d-3d6c997b9538:google-embedding',
        {
            id: 'a0afd651-12dc-41d7-af3a-34a4e35425af',
            providerId: '91cd42ab-e957-4035-8a2d-3d6c997b9538',
            modelName: 'google-embedding',
            displayName: 'Google Text Embedding',
            description: 'Google text embedding model',
            isActive: true,
            createdAt: '2025-08-01T14:18:55.625835+00:00',
            updatedAt: '2025-08-01T14:18:55.625835+00:00',
        },
    ],
    [
        '91cd42ab-e957-4035-8a2d-3d6c997b9538:gemini-2.0-flash',
        {
            id: '422f15db-6d31-4028-9b2f-f576ae2e6cab',
            providerId: '91cd42ab-e957-4035-8a2d-3d6c997b9538',
            modelName: 'gemini-2.0-flash',
            displayName: 'Google Gemini 2.0 Flash',
            description: 'Google Gemini 2.0 Flash model for fast responses',
            isActive: true,
            createdAt: '2025-08-01T14:18:55.625835+00:00',
            updatedAt: '2025-08-01T14:18:55.625835+00:00',
        },
    ],
    [
        '91cd42ab-e957-4035-8a2d-3d6c997b9538:gemini-2.5-flash',
        {
            id: '6431fbfb-742b-48ee-8d48-60be108c2361',
            providerId: '91cd42ab-e957-4035-8a2d-3d6c997b9538',
            modelName: 'gemini-2.5-flash',
            displayName: 'Google Gemini 2.5 Flash',
            description: 'Google Gemini 2.5 Flash model for fast responses',
            isActive: true,
            createdAt: '2025-08-01T14:18:55.625835+00:00',
            updatedAt: '2025-08-01T14:18:55.625835+00:00',
        },
    ],
    [
        '91cd42ab-e957-4035-8a2d-3d6c997b9538:gemini-2.5-pro',
        {
            id: '09a3354a-b5ca-4597-a8ee-09075adae10f',
            providerId: '91cd42ab-e957-4035-8a2d-3d6c997b9538',
            modelName: 'gemini-2.5-pro',
            displayName: 'Google Gemini 2.5 Pro',
            description: 'Google Gemini 2.5 Pro model for advanced reasoning',
            isActive: true,
            createdAt: '2025-08-01T14:18:55.625835+00:00',
            updatedAt: '2025-08-01T14:18:55.625835+00:00',
        },
    ],
];
export const quotaRecords = [
    [
        '97e291f6-4396-472e-9cb5-13cc94291879',
        {
            id: '6bf2bf6c-6b94-485b-945b-20c762f1fe18',
            modelId: '97e291f6-4396-472e-9cb5-13cc94291879',
            maxTokensPerMessage: 128000,
            maxTokensPerMinute: 50000,
            maxTokensPerDay: undefined,
            isActive: true,
            createdAt: '2025-08-01T14:21:16.896854+00:00',
            updatedAt: '2025-08-01T14:21:16.896854+00:00',
        },
    ],
    [
        'dbae7862-637d-41c0-9610-b59c885a94ef',
        {
            id: '944dd413-adfe-4488-a8ce-0f82dfbe2782',
            modelId: 'dbae7862-637d-41c0-9610-b59c885a94ef',
            maxTokensPerMessage: 128000,
            maxTokensPerMinute: 200000,
            maxTokensPerDay: undefined,
            isActive: true,
            createdAt: '2025-08-01T14:21:16.896854+00:00',
            updatedAt: '2025-08-01T14:21:16.896854+00:00',
        },
    ],
    [
        'bc1a33e7-1330-4be1-913a-28bda8ebd835',
        {
            id: '9ea845ba-d548-4a5c-9289-085c5db4c0b3',
            modelId: 'bc1a33e7-1330-4be1-913a-28bda8ebd835',
            maxTokensPerMessage: 200000,
            maxTokensPerMinute: 200000,
            maxTokensPerDay: undefined,
            isActive: true,
            createdAt: '2025-08-01T14:21:16.896854+00:00',
            updatedAt: '2025-08-01T14:21:16.896854+00:00',
        },
    ],
    [
        '422f15db-6d31-4028-9b2f-f576ae2e6cab',
        {
            id: '8798d271-a48e-4679-aafc-87669b62a115',
            modelId: '422f15db-6d31-4028-9b2f-f576ae2e6cab',
            maxTokensPerMessage: 1048576,
            maxTokensPerMinute: 15728640,
            maxTokensPerDay: undefined,
            isActive: true,
            createdAt: '2025-08-01T14:21:16.896854+00:00',
            updatedAt: '2025-08-01T14:21:16.896854+00:00',
        },
    ],
    [
        '09a3354a-b5ca-4597-a8ee-09075adae10f',
        {
            id: '2e262da2-21b4-475b-8b28-f17176383da2',
            modelId: '09a3354a-b5ca-4597-a8ee-09075adae10f',
            maxTokensPerMessage: 1048576,
            maxTokensPerMinute: 157286400,
            maxTokensPerDay: undefined,
            isActive: true,
            createdAt: '2025-08-01T14:21:16.896854+00:00',
            updatedAt: '2025-08-01T14:21:16.896854+00:00',
        },
    ],
    [
        '6431fbfb-742b-48ee-8d48-60be108c2361',
        {
            id: '1fbbec6a-4b40-4607-ba1e-fdd18c1c3899',
            modelId: '6431fbfb-742b-48ee-8d48-60be108c2361',
            maxTokensPerMessage: 1048576,
            maxTokensPerMinute: 10485760,
            maxTokensPerDay: undefined,
            isActive: true,
            createdAt: '2025-08-01T14:21:16.896854+00:00',
            updatedAt: '2025-08-01T14:21:16.896854+00:00',
        },
    ],
];
export const setupMaps = (props) => {
    const { providers, models, quotas, exclusive = false } = props ?? {};
    const providerMap = ProviderMap.setupMockInstance(exclusive ? (providers ?? []) : [...providerRecords, ...(providers ?? [])]);
    const modelMap = ModelMap.setupMockInstance(exclusive ? (models ?? []) : [...modelRecords, ...(models ?? [])], exclusive ? (quotas ?? []) : [...quotaRecords, ...(quotas ?? [])]);
    return {
        providers: providerMap,
        models: modelMap,
    };
};
//# sourceMappingURL=jest.mock-provider-model-maps.js.map