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
          wrapGenerate: async (options) => {
            // Update internal state
            middlewareState.requestCount++;
            middlewareState.lastPrompt = typeof options.params?.prompt === 'string' ? options.params.prompt : '';
            
            // Continue with the chain
            return await options.doGenerate();
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

      // Create a mock model that implements LanguageModelV2
      const mockModel: any = {
        modelId: 'test-model',
        provider: 'test',
        specificationVersion: 'v2' as const,
        supportedUrls: [],
        doGenerate: jest.fn(),
        doStream: jest.fn(),
      };

      // Simulate a middleware chain with state manager first
      const stateManagerMiddleware = stateManager.middleware;

      // Step 1: Normal request - this should update the middleware state
      const normalParams: any = {
        prompt: 'test prompt for counting',
        messages: []
      };

      await (stateManagerMiddleware.wrapGenerate as any)({
        model: mockModel,
        params: normalParams,
        doGenerate: async () => {
          // Chain to our stateful middleware
          return await (statefulMiddleware.wrapGenerate as any)({
            model: mockModel,
            params: normalParams,
            doGenerate: async () => {
              // Final handler - simulate LLM response
              return {
                finishReason: 'stop',
                usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
                content: [{ type: 'text', text: `Response to: ${normalParams.prompt}` }],
                warnings: [],
                response: {
                  id: 'test-response',
                  timestamp: new Date(),
                  modelId: mockModel.modelId
                }
              };
            }
          });
        }
      });

      // Verify the middleware state was updated
      expect(middlewareState.requestCount).toBe(1);
      expect(middlewareState.lastPrompt).toBe('test prompt for counting');

      // Step 2: Collect state using the protocol
      const collectionParams: any = {
        prompt: STATE_PROTOCOL.COLLECT,
        messages: []
      };

      const collectionResult = await (stateManagerMiddleware.wrapGenerate as any)({
        model: mockModel,
        params: collectionParams,
        doGenerate: async () => {
          // Chain to our stateful middleware for state collection
          return await (statefulMiddleware.wrapGenerate as any)({
            model: mockModel,
            params: collectionParams,
            doGenerate: async () => {
              // This won't be reached during collection
              return {
                finishReason: 'stop',
                usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
                warnings: [],
                content: [{ type: 'text', text: 'should not reach here' }],
                response: {
                  id: 'unreachable',
                  timestamp: new Date(),
                  modelId: mockModel.modelId
                }
              };
            }
          });
        }
      });

      // Verify state was collected
      expect(collectionResult.content).toBeDefined();
      const textContent = (collectionResult.content as any)?.[0]?.text || '';
      const collectedStates = JSON.parse(textContent);
      expect(Array.isArray(collectedStates)).toBe(true);
      expect(collectedStates).toHaveLength(1); // Only test-counter (state-manager doesn't collect its own state)

      // Find our middleware's state
      const testCounterEntry = collectedStates.find(([id]: any) => id === 'test-counter');
      
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
      const restorationParams: any = {
        prompt: STATE_PROTOCOL.RESTORE,
        messages: [],
        stateData
      };

      const restorationResult = await (stateManagerMiddleware.wrapGenerate as any)({
        model: mockModel,
        params: restorationParams,
        doGenerate: async () => {
          // Chain to our stateful middleware for state restoration
          return await (statefulMiddleware.wrapGenerate as any)({
            model: mockModel,
            params: restorationParams,
            doGenerate: async () => {
              // This won't be reached during restoration
              return {
                finishReason: 'stop',
                usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
                warnings: [],
                content: [{ type: 'text', text: 'should not reach here' }],
                response: {
                  id: 'unreachable',
                  timestamp: new Date(),
                  modelId: mockModel.modelId
                }
              };
            }
          });
        }
      });

      // Verify restoration was successful
      const restorationTextContent = (restorationResult.content as any)?.[0]?.text || '';
      expect(restorationTextContent).toBe('State restored successfully');

      // Verify the middleware state was actually restored
      expect(middlewareState.requestCount).toBe(1);
      expect(middlewareState.lastPrompt).toBe('test prompt for counting');

      // Step 5: Make another normal request to verify the restored state works
      const followupParams: any = {
        prompt: 'follow-up prompt',
        messages: []
      };

      await (stateManagerMiddleware.wrapGenerate as any)({
        model: mockModel,
        params: followupParams,
        doGenerate: async () => {
          return await (statefulMiddleware.wrapGenerate as any)({
            model: mockModel,
            params: followupParams,
            doGenerate: async () => {
              return {
                finishReason: 'stop',
                usage: { inputTokens: 5, outputTokens: 3, totalTokens: 8 },
                warnings: [],
                content: [{ type: 'text', text: `Follow-up response to: ${followupParams.prompt}` }],
                response: {
                  id: 'follow-up-response',
                  timestamp: new Date(),
                  modelId: mockModel.modelId
                }
              };
            }
          });
        }
      });

      // Verify the state continued from where it was restored
      expect(middlewareState.requestCount).toBe(2); // 1 (restored) + 1 (new)
      expect(middlewareState.lastPrompt).toBe('follow-up prompt');
    });

    it('should work with existing middleware like setNormalizedDefaultsMiddleware', async () => {
      const stateManager = createStateManagementMiddleware();
      const mockModel: any = {
        modelId: 'test-model',
        provider: 'test',
        specificationVersion: 'v2' as const,
        supportedUrls: [],
        doGenerate: jest.fn(),
        doStream: jest.fn(),
      };

      // Test that setNormalizedDefaultsMiddleware participates in state collection
      const collectionParams: any = {
        prompt: STATE_PROTOCOL.COLLECT,
        messages: []
      };

      const collectionResult = await (stateManager.middleware.wrapGenerate as any)({
        model: mockModel,
        params: collectionParams,
        doGenerate: async () => {
          return await (setNormalizedDefaultsMiddleware.wrapGenerate as any)({
            model: mockModel,
            params: collectionParams,
            doGenerate: async () => {
              return {
                finishReason: 'stop',
                usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
                warnings: [],
                content: [{ type: 'text', text: 'test' }],
                response: {
                  id: 'test',
                  timestamp: new Date(),
                  modelId: mockModel.modelId
                }
              };
            }
          });
        }
      });

      const collectionTextContent = (collectionResult.content as any)?.[0]?.text || '';
      const collectedStates = JSON.parse(collectionTextContent);
      const normalizedDefaultsEntry = collectedStates.find(([id]: any) => id === 'set-normalized-defaults');
      
      expect(normalizedDefaultsEntry).toBeDefined();
      expect(normalizedDefaultsEntry[1]).toEqual({ present: true }); // No custom state, just presence
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle middleware that does not support state serialization', async () => {
      const stateManager = createStateManagementMiddleware();
      const mockModel: any = {
        modelId: 'test-model',
        provider: 'test',
        specificationVersion: 'v2' as const,
        supportedUrls: [],
        doGenerate: jest.fn(),
        doStream: jest.fn(),
      };

      // Create middleware without state handlers
      const simpleMiddleware = createStatefulMiddleware({
        middlewareId: 'simple-middleware',
        originalMiddleware: {
          wrapGenerate: async (options: any) => options.doGenerate()
        }
        // No stateHandlers - should still report presence
      });

      const collectionParams: any = {
        prompt: STATE_PROTOCOL.COLLECT,
        messages: []
      };

      const result = await (stateManager.middleware.wrapGenerate as any)({
        model: mockModel,
        params: collectionParams,
        doGenerate: async () => {
          return await (simpleMiddleware.wrapGenerate as any)({
            model: mockModel,
            params: collectionParams,
            doGenerate: async () => ({
              finishReason: 'stop',
              usage: { promptTokens: 0, completionTokens: 0 },
              content: [{ type: 'text', text: 'test' }],
              response: { id: 'test', timestamp: new Date(), modelId: 'test' }
            })
          });
        }
      });

      const resultTextContent = (result.content as any)?.[0]?.text || '';
      const collectedStates = JSON.parse(resultTextContent);
      const simpleEntry = collectedStates.find(([id]: any) => id === 'simple-middleware');
      
      expect(simpleEntry).toBeDefined();
      expect(simpleEntry[1]).toEqual({ present: true });
    });

    it('should handle restoration when no state data is provided', async () => {
      const stateManager = createStateManagementMiddleware();
      const mockModel: any = {
        modelId: 'test-model',
        provider: 'test',
        specificationVersion: 'v2' as const,
        supportedUrls: [],
        doGenerate: jest.fn(),
        doStream: jest.fn(),
      };

      const restorationParams = {
        prompt: STATE_PROTOCOL.RESTORE,
        messages: []
        // No stateData provided
      };

      const result = await (stateManager.middleware.wrapGenerate as any)({
        model: mockModel,
        params: restorationParams,
        doGenerate: async () => ({
          finishReason: 'stop',
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          content: [{ type: 'text', text: 'should not reach' }],
          warnings: [],
          response: { id: 'test', timestamp: new Date(), modelId: 'test' }
        })
      });

      const textContent = (result.content as any)?.[0]?.text || '';
      expect(textContent).toBe('State restoration failed: no state data provided');
      expect(result.response?.id).toBe('state-restoration-error');
    });
  });
});