
/** @jest-environment node */

/**
 * @fileoverview Integration Tests for State Management Protocol
 *
 * These tests demonstrate the full end-to-end functionality of the state management
 * protocol including state collection and restoration across multiple middleware.
 */

import { aiModelFactory } from '@/lib/ai/aiModelFactory';
import {
  MiddlewareStateManager,
  setNormalizedDefaultsMiddleware,
} from '@/lib/ai/middleware';
import { generateText, wrapLanguageModel } from 'ai';

const makeMiddleware = () => ({
  wrapGenerate: async (options: any) => {
    // Custom logic for wrapping the generate function
    return await options.doGenerate();
  },
});
const makeMockModel = (stateManager?: MiddlewareStateManager) => {
  const model = {
    modelId: 'test-model',
    provider: 'test',
    specificationVersion: 'v2' as const,
    supportedUrls: {
      img: [/.*/i],
    },
    doGenerate: jest.fn().mockImplementation(async (arg: any) => {
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
const mockAiModelFactory = aiModelFactory as jest.MockedFunction<typeof aiModelFactory>;

describe('State Management Protocol Integration', () => {
  let actualModel: any;
  let mockDoGenerate: jest.SpyInstance;

  beforeEach(async () => {
    const setupImpersonationMock =
      require('@/__tests__/jest.mock-impersonation').setupImpersonationMock;
    const setupMaps =
      require('@/__tests__/setup/jest.mock-provider-model-maps').setupMaps;

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
    mockAiModelFactory.mockResolvedValue(mockModel as any);

    actualModel = await aiModelFactory('lofi');
  });

  beforeAll(async () => {
    /*
    let text = await generateText({
      model: actualModel,
      prompt: 'what model version are you?',
    });
    console.log(text);
    text = await generateText({
      model: aiModelFactory('hifi'),
      prompt: 'what model version are you?',
    });
    console.log(text);
    */
  });
  beforeEach(() => {
    mockDoGenerate = jest
      .spyOn(actualModel, 'doGenerate')
      .mockImplementation(async (arg: any) => {
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
    // Reset the global instance before each test
    MiddlewareStateManager.reset();
  });
  describe('End-to-end state collection and restoration', () => {
    it('should collect and restore state from multiple middleware in the chain', async () => {
      // Create a simple stateful middleware with actual state
      let middlewareState = { requestCount: 0, lastPrompt: '' };

      // Create state management middleware
      const stateManager = MiddlewareStateManager.Instance;
      const statefulMiddleware = stateManager.statefulMiddlewareWrapper<
        typeof middlewareState
      >({
        middlewareId: 'test-counter',
        middleware: {
          wrapGenerate: async (options: any) => {
            // Continue with the chain
            middlewareState.requestCount++;
            middlewareState.lastPrompt =
              typeof options.params.prompt === 'string'
                ? options.params.prompt
                : options.params.prompt
                  .flatMap((msg: any) =>
                    msg.content.map((part: any) => part.text),
                  )
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

      // Step 1: Normal request - this should update the middleware state
      const normalParams: any = {
        prompt: 'test prompt for counting',
        // messages: [],
      };

      await generateText({
        model: wrappedModel,
        ...normalParams,
      });
      expect(mockDoGenerate).toHaveBeenCalledTimes(1);

      // Verify the middleware state was updated
      expect(middlewareState.requestCount).toBe(1);
      expect(middlewareState.lastPrompt).toBe('test prompt for counting');

      const collectionResult = await stateManager.serializeState({
        model: wrappedModel,
      });
      expect(mockDoGenerate).toHaveBeenCalledTimes(1);

      // Verify state was collected
      expect(collectionResult.state).toBeDefined();
      expect(Array.isArray(collectionResult.state)).toBe(true);
      expect(collectionResult.state).toHaveLength(2); // Only test-counter (state-manager doesn't collect its own state)

      // Find our middleware's state
      const testCounterEntry = collectionResult.state.find(
        ([id]: any) => id === 'test-counter',
      );

      expect(testCounterEntry).toBeDefined();
      expect(testCounterEntry![1]).toEqual({
        requestCount: 1,
        lastPrompt: 'test prompt for counting',
      });

      // Step 3: Reset the middleware state to simulate a new instance
      middlewareState = { requestCount: 0, lastPrompt: '' };
      expect(middlewareState.requestCount).toBe(0);
      expect(middlewareState.lastPrompt).toBe('');

      // Step 4: Restore state using the protocol

      await stateManager.deserializeState({
        model: wrappedModel,
        state: collectionResult,
      });
      expect(mockDoGenerate).toHaveBeenCalledTimes(1);

      // Verify the middleware state was actually restored
      expect(middlewareState.requestCount).toBe(1);
      expect(middlewareState.lastPrompt).toBe('test prompt for counting');

      // Step 5: Make another normal request to verify the restored state works
      const followupParams: any = {
        prompt: 'follow-up prompt',
      };

      await generateText({
        model: wrappedModel,
        ...followupParams,
      });
      expect(mockDoGenerate).toHaveBeenCalledTimes(2);

      // Verify the state continued from where it was restored
      expect(middlewareState.requestCount).toBe(2); // 1 (restored) + 1 (new)
      expect(middlewareState.lastPrompt).toBe('follow-up prompt');
    });

    it('should work with existing middleware like setNormalizedDefaultsMiddleware', async () => {
      const stateManager = MiddlewareStateManager.Instance;
      const model = makeMockModel();

      // Test that setNormalizedDefaultsMiddleware participates in state collection
      const collectionResult = await stateManager.serializeState({
        model: wrapLanguageModel({
          model: stateManager.initializeModel({ model }),
          middleware: setNormalizedDefaultsMiddleware,
        }),
      });

      const collectedStates = collectionResult.state;
      const normalizedDefaultsEntry = collectedStates.find(
        ([id]: any) => id === 'set-normalized-defaults',
      );

      expect(normalizedDefaultsEntry).toBeDefined();
      expect(normalizedDefaultsEntry![1]).toBeDefined();
      expect(model.doGenerate).not.toHaveBeenCalled();
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle middleware that does not support state serialization', async () => {
      const stateManager = MiddlewareStateManager.Instance;
      const mockModel = makeMockModel(stateManager);

      // Create middleware without state handlers
      const simpleMiddleware = {
        wrapGenerate: async (options: any) => options.doGenerate(),
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
      const mockModel: any = makeMockModel(stateManager);

      await stateManager.deserializeState({
        model: mockModel,
        state: [],
      });

      // If we make it to here without throwing the test has passed.
    });
  });
});
