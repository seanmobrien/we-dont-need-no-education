import { aiModelFactory } from '@/lib/ai/aiModelFactory';
import { MiddlewareStateManager, setNormalizedDefaultsMiddleware, } from '@/lib/ai/middleware';
import { generateText, wrapLanguageModel } from 'ai';
const makeMiddleware = () => ({
    wrapGenerate: async (options) => {
        return await options.doGenerate();
    },
});
const makeMockModel = (stateManager) => {
    const model = {
        modelId: 'test-model',
        provider: 'test',
        specificationVersion: 'v2',
        supportedUrls: {
            img: [/.*/i],
        },
        doGenerate: jest.fn().mockImplementation(async (arg) => {
            return {
                finishReason: 'stop',
                usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
                content: [
                    {
                        type: 'text',
                        text: `Response to: ${JSON.stringify(arg?.prompt ?? {})}`,
                    },
                ],
                warnings: [],
                response: {
                    id: 'test-response',
                    timestamp: new Date(),
                    modelId: arg.params.modelId,
                },
            };
        }),
        doStream: jest.fn(),
    };
    return stateManager
        ? stateManager.initializeModel({
            model,
        })
        : model;
};
jest.mock('@/lib/ai/aiModelFactory');
const mockAiModelFactory = aiModelFactory;
describe('State Management Protocol Integration', () => {
    let actualModel;
    let mockDoGenerate;
    beforeEach(async () => {
        const setupImpersonationMock = require('@/__tests__/jest.mock-impersonation').setupImpersonationMock;
        const setupMaps = require('@/__tests__/setup/jest.mock-provider-model-maps').setupMaps;
        setupImpersonationMock();
        setupMaps();
        const mockModel = {
            modelId: 'test-model',
            provider: 'test',
            specificationVersion: 'v1',
            doGenerate: jest.fn(),
            doStream: jest.fn(),
            defaultObjectGenerationMode: 'json',
        };
        mockAiModelFactory.mockResolvedValue(mockModel);
        actualModel = await aiModelFactory('lofi');
    });
    beforeAll(async () => {
    });
    beforeEach(() => {
        mockDoGenerate = jest
            .spyOn(actualModel, 'doGenerate')
            .mockImplementation(async (arg) => {
            return {
                finishReason: 'stop',
                usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
                content: [
                    {
                        type: 'text',
                        text: `Response to: ${JSON.stringify(arg?.prompt ?? {})}`,
                    },
                ],
                warnings: [],
                response: {
                    id: 'test-response',
                    timestamp: new Date(),
                    modelId: actualModel.modelId,
                },
            };
        });
        MiddlewareStateManager.reset();
    });
    describe('End-to-end state collection and restoration', () => {
        it('should collect and restore state from multiple middleware in the chain', async () => {
            let middlewareState = { requestCount: 0, lastPrompt: '' };
            const stateManager = MiddlewareStateManager.Instance;
            const statefulMiddleware = stateManager.statefulMiddlewareWrapper({
                middlewareId: 'test-counter',
                middleware: {
                    wrapGenerate: async (options) => {
                        middlewareState.requestCount++;
                        middlewareState.lastPrompt =
                            typeof options.params.prompt === 'string'
                                ? options.params.prompt
                                : options.params.prompt
                                    .flatMap((msg) => msg.content.map((part) => part.text))
                                    .join('\n');
                        return await options.doGenerate();
                    },
                    serializeState: () => {
                        return Promise.resolve(middlewareState);
                    },
                    deserializeState: ({ state }) => {
                        middlewareState = {
                            ...middlewareState,
                            ...state,
                        };
                        return Promise.resolve();
                    },
                },
            });
            const wrappedModel = wrapLanguageModel({
                model: stateManager.initializeModel(actualModel),
                middleware: [
                    makeMiddleware(),
                    statefulMiddleware,
                    stateManager.basicMiddlewareWrapper({
                        middleware: makeMiddleware(),
                        middlewareId: 'wrapper-middleware',
                    }),
                ],
            });
            const normalParams = {
                prompt: 'test prompt for counting',
            };
            await generateText({
                model: wrappedModel,
                ...normalParams,
            });
            expect(mockDoGenerate).toHaveBeenCalledTimes(1);
            expect(middlewareState.requestCount).toBe(1);
            expect(middlewareState.lastPrompt).toBe('test prompt for counting');
            const collectionResult = await stateManager.serializeState({
                model: wrappedModel,
            });
            expect(mockDoGenerate).toHaveBeenCalledTimes(1);
            expect(collectionResult.state).toBeDefined();
            expect(Array.isArray(collectionResult.state)).toBe(true);
            expect(collectionResult.state).toHaveLength(2);
            const testCounterEntry = collectionResult.state.find(([id]) => id === 'test-counter');
            expect(testCounterEntry).toBeDefined();
            expect(testCounterEntry[1]).toEqual({
                requestCount: 1,
                lastPrompt: 'test prompt for counting',
            });
            middlewareState = { requestCount: 0, lastPrompt: '' };
            expect(middlewareState.requestCount).toBe(0);
            expect(middlewareState.lastPrompt).toBe('');
            await stateManager.deserializeState({
                model: wrappedModel,
                state: collectionResult,
            });
            expect(mockDoGenerate).toHaveBeenCalledTimes(1);
            expect(middlewareState.requestCount).toBe(1);
            expect(middlewareState.lastPrompt).toBe('test prompt for counting');
            const followupParams = {
                prompt: 'follow-up prompt',
            };
            await generateText({
                model: wrappedModel,
                ...followupParams,
            });
            expect(mockDoGenerate).toHaveBeenCalledTimes(2);
            expect(middlewareState.requestCount).toBe(2);
            expect(middlewareState.lastPrompt).toBe('follow-up prompt');
        });
        it('should work with existing middleware like setNormalizedDefaultsMiddleware', async () => {
            const stateManager = MiddlewareStateManager.Instance;
            const model = makeMockModel();
            const collectionResult = await stateManager.serializeState({
                model: wrapLanguageModel({
                    model: stateManager.initializeModel({ model }),
                    middleware: setNormalizedDefaultsMiddleware,
                }),
            });
            const collectedStates = collectionResult.state;
            const normalizedDefaultsEntry = collectedStates.find(([id]) => id === 'set-normalized-defaults');
            expect(normalizedDefaultsEntry).toBeDefined();
            expect(normalizedDefaultsEntry[1]).toBeDefined();
            expect(model.doGenerate).not.toHaveBeenCalled();
        });
    });
    describe('Error handling and edge cases', () => {
        it('should handle middleware that does not support state serialization', async () => {
            const stateManager = MiddlewareStateManager.Instance;
            const mockModel = makeMockModel(stateManager);
            const simpleMiddleware = {
                wrapGenerate: async (options) => options.doGenerate(),
            };
            const result = await stateManager.serializeState({
                model: wrapLanguageModel({
                    model: mockModel,
                    middleware: [simpleMiddleware],
                }),
            });
            expect(result).toBeDefined();
            const collectedStates = result.state;
            expect(collectedStates).toBeDefined();
        });
        it('should handle restoration when no state data is provided', async () => {
            const stateManager = MiddlewareStateManager.Instance;
            const mockModel = makeMockModel(stateManager);
            await stateManager.deserializeState({
                model: mockModel,
                state: [],
            });
        });
    });
});
//# sourceMappingURL=integration.test.js.map