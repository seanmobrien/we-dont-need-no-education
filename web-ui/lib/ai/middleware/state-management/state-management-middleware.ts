/**
 * @fileoverview State Management Middleware Implementation
 * 
 * This middleware intercepts special protocol prompts for state collection and restoration.
 * It must be placed first in the middleware chain to capture all middleware states.
 */

import type { LanguageModelV1Middleware, LanguageModelV1 } from 'ai';
import { log } from '@/lib/logger';
import { STATE_PROTOCOL, type StatefulMiddleware, type StateManagementParams } from './types';

/**
 * State Management Middleware that handles protocol prompts for state collection and restoration
 * 
 * This middleware:
 * - Intercepts STATE_PROTOCOL.COLLECT prompts to collect middleware states
 * - Intercepts STATE_PROTOCOL.RESTORE prompts to restore middleware states
 * - Must be the first middleware in the chain to capture all downstream states
 */
export class StateManagementMiddleware implements StatefulMiddleware {
  
  getMiddlewareId(): string {
    return 'state-manager';
  }

  /**
   * The main middleware implementation
   */
  get middleware(): LanguageModelV1Middleware {
    return {
      wrapGenerate: async ({ model, params }, next) => {
        return this.handleRequest(model, params, next);
      }
    };
  }

  /**
   * Handle the incoming request and check for state management protocols
   */
  private async handleRequest(
    model: LanguageModelV1,
    params: StateManagementParams,
    next: (args: { model: LanguageModelV1; params: StateManagementParams }) => Promise<unknown>
  ): Promise<unknown> {
    const prompt = this.extractPrompt(params);
    
    // Check for state collection protocol
    if (prompt && prompt.includes(STATE_PROTOCOL.COLLECT)) {
      log(l => l.debug('State collection protocol detected', { middlewareId: this.getMiddlewareId() }));
      return this.handleStateCollection(model, params, next);
    }
    
    // Check for state restoration protocol
    if (prompt && prompt.includes(STATE_PROTOCOL.RESTORE)) {
      log(l => l.debug('State restoration protocol detected', { middlewareId: this.getMiddlewareId() }));
      return this.handleStateRestoration(model, params, next);
    }
    
    // Normal operation - pass through
    return await next({ model, params });
  }

  /**
   * Extract prompt text from various parameter formats
   */
  private extractPrompt(params: StateManagementParams): string | null {
    if (!params) return null;
    
    // Handle string prompt
    if (typeof params.prompt === 'string') {
      return params.prompt;
    }
    
    // Handle array of messages
    if (Array.isArray(params.messages)) {
      // Look for content in messages
      const lastMessage = params.messages[params.messages.length - 1];
      if (lastMessage && typeof lastMessage.content === 'string') {
        return lastMessage.content;
      }
    }
    
    return null;
  }

  /**
   * Handle state collection by running through the middleware chain to gather states
   */
  private async handleStateCollection(
    model: LanguageModelV1,
    params: StateManagementParams,
    next: (args: { model: LanguageModelV1; params: StateManagementParams }) => Promise<unknown>
  ): Promise<{
    finishReason: string;
    usage: { promptTokens: number; completionTokens: number };
    text: string;
    response: { id: string; timestamp: Date; modelId: string };
  }> {
    // Initialize state collection
    const stateCollection = new Map<string, unknown>();
    
    // Create modified params for state collection
    const collectionParams: StateManagementParams = {
      ...params,
      [STATE_PROTOCOL.RESULT_KEY]: stateCollection
    };
    
    try {
      // Run through the chain to collect states
      await next({ model, params: collectionParams });
    } catch (error) {
      // Expected - middleware may "fail" when they see collection protocol
      // This is normal behavior for the collection process
      log(l => l.debug('Expected error during state collection', { 
        middlewareId: this.getMiddlewareId(),
        error: error instanceof Error ? error.message : String(error)
      }));
    }
    
    const collectedStates = Array.from(stateCollection.entries());
    log(l => l.debug('State collection completed', { 
      middlewareId: this.getMiddlewareId(),
      collectedCount: collectedStates.length,
      middlewareIds: collectedStates.map(([id]) => id)
    }));
    
    // Return the collected states instead of LLM response
    return {
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
      text: JSON.stringify(collectedStates),
      response: {
        id: 'state-collection',
        timestamp: new Date(),
        modelId: model.modelId || 'unknown'
      }
    };
  }

  /**
   * Handle state restoration by passing state data through the middleware chain
   */
  private async handleStateRestoration(
    model: LanguageModelV1,
    params: StateManagementParams,
    next: (args: { model: LanguageModelV1; params: StateManagementParams }) => Promise<unknown>
  ): Promise<{
    finishReason: string;
    usage: { promptTokens: number; completionTokens: number };
    text: string;
    response: { id: string; timestamp: Date; modelId: string };
  }> {
    // Extract state data from params (it should be provided by the caller)
    const stateData = params.stateData;
    
    if (!stateData) {
      log(l => l.warn('State restoration requested but no state data provided', {
        middlewareId: this.getMiddlewareId()
      }));
      
      return {
        finishReason: 'stop',
        usage: { promptTokens: 0, completionTokens: 0 },
        text: 'State restoration failed: no state data provided',
        response: {
          id: 'state-restoration-error',
          timestamp: new Date(),
          modelId: model.modelId || 'unknown'
        }
      };
    }
    
    // Create modified params for state restoration
    const restorationParams: StateManagementParams = {
      ...params,
      [STATE_PROTOCOL.RESTORE]: true,
      stateData
    };
    
    try {
      // Run through chain to restore states
      await next({ model, params: restorationParams });
      
      log(l => l.debug('State restoration completed', { 
        middlewareId: this.getMiddlewareId(),
        restoredCount: stateData.size,
        middlewareIds: Array.from(stateData.keys())
      }));
    } catch (error) {
      // Expected - this is just for restoration
      log(l => l.debug('Expected behavior during state restoration', { 
        middlewareId: this.getMiddlewareId(),
        error: error instanceof Error ? error.message : String(error)
      }));
    }
    
    // Return success signal
    return {
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
      text: 'State restored successfully',
      response: {
        id: 'state-restoration',
        timestamp: new Date(),
        modelId: model.modelId || 'unknown'
      }
    };
  }
}

/**
 * Factory function to create a new StateManagementMiddleware instance
 */
export const createStateManagementMiddleware = (): StateManagementMiddleware => {
  return new StateManagementMiddleware();
};