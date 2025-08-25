/**
 * @fileoverview Integration Tests for State Management Protocol
 * 
 * These tests demonstrate the full end-to-end functionality of the state management
 * protocol including state collection and restoration across multiple middleware.
 */

import { 
  STATE_PROTOCOL,
  StateManagementMiddleware,
  createStateManagementMiddleware,
  createStatefulMiddleware,
  setNormalizedDefaultsMiddleware
} from '@/lib/ai/middleware';

describe('State Management Protocol Integration', () => {
  describe('End-to-end state collection and restoration', () => {
    it('should collect and restore state from multiple middleware in the chain', async () => {
      // Create a simple stateful middleware with actual state
      let middlewareState = { requestCount: 0, lastPrompt: '' };
      
      const statefulMiddleware = createStatefulMiddleware({
        middlewareId: 'test-counter',
        originalMiddleware: {
          wrapGenerate: async ({ model, params }, next) => {
            // Update internal state
            middlewareState.requestCount++;
            middlewareState.lastPrompt = params.prompt as string || '';
            
            // Continue with the chain
            return await next({ model, params });
          }
        },
        stateHandlers: {
          serialize: () => middlewareState,
          deserialize: (state) => {
            middlewareState = { ...state };
          }
        }
      });

      // Create state management middleware
      const stateManager = createStateManagementMiddleware();

      // Create a mock model that just returns the prompt
      const mockModel = {
        modelId: 'test-model',
        provider: 'test'
      };

      // Simulate a middleware chain with state manager first
      const stateManagerMiddleware = stateManager.middleware;

      // Step 1: Normal request - this should update the middleware state
      const normalParams = {
        prompt: 'test prompt for counting',
        messages: []
      };

      await stateManagerMiddleware.wrapGenerate!(
        { model: mockModel, params: normalParams },
        async ({ model, params }) => {
          // Chain to our stateful middleware
          return await statefulMiddleware.wrapGenerate!(
            { model, params },
            async ({ model, params }) => {
              // Final handler - simulate LLM response
              return {
                finishReason: 'stop',
                usage: { promptTokens: 10, completionTokens: 5 },
                text: `Response to: ${params.prompt}`,
                response: {
                  id: 'test-response',
                  timestamp: new Date(),
                  modelId: mockModel.modelId
                }
              };
            }
          );
        }
      );

      // Verify the middleware state was updated
      expect(middlewareState.requestCount).toBe(1);
      expect(middlewareState.lastPrompt).toBe('test prompt for counting');

      // Step 2: Collect state using the protocol
      const collectionParams = {
        prompt: STATE_PROTOCOL.COLLECT,
        messages: []
      };

      const collectionResult = await stateManagerMiddleware.wrapGenerate!(
        { model: mockModel, params: collectionParams },
        async ({ model, params }) => {
          // Chain to our stateful middleware for state collection
          return await statefulMiddleware.wrapGenerate!(
            { model, params },
            async ({ model, params }) => {
              // This won't be reached during collection
              return {
                finishReason: 'stop',
                usage: { promptTokens: 0, completionTokens: 0 },
                text: 'should not reach here',
                response: {
                  id: 'unreachable',
                  timestamp: new Date(),
                  modelId: mockModel.modelId
                }
              };
            }
          );
        }
      );

      // Verify state was collected
      expect(collectionResult.text).toBeDefined();
      const collectedStates = JSON.parse(collectionResult.text);
      expect(Array.isArray(collectedStates)).toBe(true);
      expect(collectedStates).toHaveLength(1); // Only test-counter (state-manager doesn't collect its own state)

      // Find our middleware's state
      const testCounterEntry = collectedStates.find(([id]) => id === 'test-counter');
      
      expect(testCounterEntry).toBeDefined();
      expect(testCounterEntry[1]).toEqual({
        requestCount: 1,
        lastPrompt: 'test prompt for counting'
      });

      // Step 3: Reset the middleware state to simulate a new instance
      middlewareState = { requestCount: 0, lastPrompt: '' };
      expect(middlewareState.requestCount).toBe(0);
      expect(middlewareState.lastPrompt).toBe('');

      // Step 4: Restore state using the protocol
      const stateData = new Map(collectedStates);
      const restorationParams = {
        prompt: STATE_PROTOCOL.RESTORE,
        messages: [],
        stateData
      };

      const restorationResult = await stateManagerMiddleware.wrapGenerate!(
        { model: mockModel, params: restorationParams },
        async ({ model, params }) => {
          // Chain to our stateful middleware for state restoration
          return await statefulMiddleware.wrapGenerate!(
            { model, params },
            async ({ model, params }) => {
              // This won't be reached during restoration
              return {
                finishReason: 'stop',
                usage: { promptTokens: 0, completionTokens: 0 },
                text: 'should not reach here',
                response: {
                  id: 'unreachable',
                  timestamp: new Date(),
                  modelId: mockModel.modelId
                }
              };
            }
          );
        }
      );

      // Verify restoration was successful
      expect(restorationResult.text).toBe('State restored successfully');

      // Verify the middleware state was actually restored
      expect(middlewareState.requestCount).toBe(1);
      expect(middlewareState.lastPrompt).toBe('test prompt for counting');

      // Step 5: Make another normal request to verify the restored state works
      const followupParams = {
        prompt: 'follow-up prompt',
        messages: []
      };

      await stateManagerMiddleware.wrapGenerate!(
        { model: mockModel, params: followupParams },
        async ({ model, params }) => {
          return await statefulMiddleware.wrapGenerate!(
            { model, params },
            async ({ model, params }) => {
              return {
                finishReason: 'stop',
                usage: { promptTokens: 5, completionTokens: 3 },
                text: `Follow-up response to: ${params.prompt}`,
                response: {
                  id: 'follow-up-response',
                  timestamp: new Date(),
                  modelId: mockModel.modelId
                }
              };
            }
          );
        }
      );

      // Verify the state continued from where it was restored
      expect(middlewareState.requestCount).toBe(2); // 1 (restored) + 1 (new)
      expect(middlewareState.lastPrompt).toBe('follow-up prompt');
    });

    it('should work with existing middleware like setNormalizedDefaultsMiddleware', async () => {
      const stateManager = createStateManagementMiddleware();
      const mockModel = { modelId: 'test-model', provider: 'test' };

      // Test that setNormalizedDefaultsMiddleware participates in state collection
      const collectionParams = {
        prompt: STATE_PROTOCOL.COLLECT,
        messages: []
      };

      const collectionResult = await stateManager.middleware.wrapGenerate!(
        { model: mockModel, params: collectionParams },
        async ({ model, params }) => {
          return await setNormalizedDefaultsMiddleware.wrapGenerate!(
            { model, params },
            async ({ model, params }) => {
              return {
                finishReason: 'stop',
                usage: { promptTokens: 0, completionTokens: 0 },
                text: 'test',
                response: {
                  id: 'test',
                  timestamp: new Date(),
                  modelId: mockModel.modelId
                }
              };
            }
          );
        }
      );

      const collectedStates = JSON.parse(collectionResult.text);
      const normalizedDefaultsEntry = collectedStates.find(([id]) => id === 'set-normalized-defaults');
      
      expect(normalizedDefaultsEntry).toBeDefined();
      expect(normalizedDefaultsEntry[1]).toEqual({ present: true }); // No custom state, just presence
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle middleware that does not support state serialization', async () => {
      const stateManager = createStateManagementMiddleware();
      const mockModel = { modelId: 'test-model', provider: 'test' };

      // Create middleware without state handlers
      const simpleMiddleware = createStatefulMiddleware({
        middlewareId: 'simple-middleware',
        originalMiddleware: {
          wrapGenerate: async ({ model, params }, next) => next({ model, params })
        }
        // No stateHandlers - should still report presence
      });

      const collectionParams = {
        prompt: STATE_PROTOCOL.COLLECT,
        messages: []
      };

      const result = await stateManager.middleware.wrapGenerate!(
        { model: mockModel, params: collectionParams },
        async ({ model, params }) => {
          return await simpleMiddleware.wrapGenerate!(
            { model, params },
            async () => ({
              finishReason: 'stop',
              usage: { promptTokens: 0, completionTokens: 0 },
              text: 'test',
              response: { id: 'test', timestamp: new Date(), modelId: 'test' }
            })
          );
        }
      );

      const collectedStates = JSON.parse(result.text);
      const simpleEntry = collectedStates.find(([id]) => id === 'simple-middleware');
      
      expect(simpleEntry).toBeDefined();
      expect(simpleEntry[1]).toEqual({ present: true });
    });

    it('should handle restoration when no state data is provided', async () => {
      const stateManager = createStateManagementMiddleware();
      const mockModel = { modelId: 'test-model', provider: 'test' };

      const restorationParams = {
        prompt: STATE_PROTOCOL.RESTORE,
        messages: []
        // No stateData provided
      };

      const result = await stateManager.middleware.wrapGenerate!(
        { model: mockModel, params: restorationParams },
        async () => ({
          finishReason: 'stop',
          usage: { promptTokens: 0, completionTokens: 0 },
          text: 'should not reach',
          response: { id: 'test', timestamp: new Date(), modelId: 'test' }
        })
      );

      expect(result.text).toBe('State restoration failed: no state data provided');
      expect(result.response.id).toBe('state-restoration-error');
    });
  });
});