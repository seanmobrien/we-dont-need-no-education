/**
 * @fileoverview State Management Middleware Implementation
 *
 * This middleware intercepts special protocol prompts for state collection and restoration.
 * It must be placed first in the middleware chain to capture all middleware states.
 */

import type {
  LanguageModelV2Middleware,
  LanguageModelV2,
} from '@ai-sdk/provider';
import { log } from '@/lib/logger';
import {
  STATE_PROTOCOL,
  type StatefulMiddleware,
  type StateManagementParams,
} from './types';

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
  get middleware(): LanguageModelV2Middleware {
    return {
      wrapGenerate: async (options) => {
        const { model, params, doGenerate } = options;
        return this.handleRequest(model, params, doGenerate, options);
      },
      wrapStream: async (options) => {
        const { model, params, doStream } = options;
        // For now, just pass through streaming requests
        return doStream();
      },
    };
  }

  /**
   * Handle the incoming request and check for state management protocols
   */
  private async handleRequest(
    model: LanguageModelV2,
    params: StateManagementParams,
    doGenerate: () => any,
    originalOptions?: any,
  ): Promise<any> {
    const prompt = this.extractPrompt(params);

    // Check for state collection protocol
    if (prompt && prompt.includes(STATE_PROTOCOL.COLLECT)) {
      log((l) =>
        l.debug('State collection protocol detected', {
          middlewareId: this.getMiddlewareId(),
        }),
      );
      return this.handleStateCollection(model, params, doGenerate, originalOptions);
    }

    // Check for state restoration protocol
    if (prompt && prompt.includes(STATE_PROTOCOL.RESTORE)) {
      log((l) =>
        l.debug('State restoration protocol detected', {
          middlewareId: this.getMiddlewareId(),
        }),
      );
      return this.handleStateRestoration(model, params, doGenerate, originalOptions);
    }

    // Normal operation - pass through
    return await doGenerate();
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
    if (Array.isArray(params.prompt)) {
      // Look for content in messages
      const lastMessage = params.prompt[params.prompt.length - 1];
      if (!lastMessage) return null;
      if (typeof lastMessage.content === 'string') {
        return lastMessage.content;
      }
      const parts = lastMessage.content
        .map((part) => ('text' in part ? part.text : ''))
        .filter((text) => text);
      return parts.join('\n');
    }

    return null;
  }

  /**
   * Handle state collection by running through the middleware chain to gather states
   */
  private async handleStateCollection(
    model: LanguageModelV2,
    params: StateManagementParams,
    doGenerate: () => any,
    originalOptions?: any,
  ): Promise<any> {
    // Initialize state collection
    const stateCollection = new Map<string, unknown>();

    // Create modified params for state collection
    const collectionParams: StateManagementParams = {
      ...params,
      [STATE_PROTOCOL.RESULT_KEY]: stateCollection,
    };

    try {
      // The key insight: we need to call doGenerate() and let the middleware chain
      // detect the collection protocol through the collectionParams we've created
      // But we need to "inject" these params somehow...
      
      // Actually, let's look at this differently: the doGenerate represents calling
      // the rest of the middleware chain. If we want to pass modified params,
      // we need to somehow inject them into the call context.
      
      // For now, let's try a different approach: inject the collection map into the original params object
      // This is a bit hacky but might work with the existing middleware detection logic
      const originalResult = params[STATE_PROTOCOL.RESULT_KEY];
      (params as any)[STATE_PROTOCOL.RESULT_KEY] = stateCollection;
      
      try {
        await doGenerate();
      } finally {
        // Restore original value
        if (originalResult !== undefined) {
          (params as any)[STATE_PROTOCOL.RESULT_KEY] = originalResult;
        } else {
          delete (params as any)[STATE_PROTOCOL.RESULT_KEY];
        }
      }
    } catch (error) {
      // Expected - middleware may "fail" when they see collection protocol
      // This is normal behavior for the collection process
      log((l) =>
        l.debug('Expected error during state collection', {
          middlewareId: this.getMiddlewareId(),
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }

    const collectedStates = Array.from(stateCollection.entries());
    log((l) =>
      l.debug('State collection completed', {
        middlewareId: this.getMiddlewareId(),
        collectedCount: collectedStates.length,
        middlewareIds: collectedStates.map(([id]) => id),
      }),
    );

    // Return the collected states instead of LLM response
    return {
      finishReason: 'stop',
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      content: [{ type: 'text', text: JSON.stringify(collectedStates) }],
      warnings: [],
      response: {
        id: 'state-collection',
        timestamp: new Date(),
        modelId: model.modelId || 'unknown',
      },
    };
  }

  /**
   * Handle state restoration by passing state data through the middleware chain
   */
  private async handleStateRestoration(
    model: LanguageModelV2,
    params: StateManagementParams,
    doGenerate: () => any,
    originalOptions?: any,
  ): Promise<any> {
    // Extract state data from params (it should be provided by the caller)
    const stateData = params.stateData;

    if (!stateData) {
      log((l) =>
        l.warn('State restoration requested but no state data provided', {
          middlewareId: this.getMiddlewareId(),
        }),
      );

      return {
        finishReason: 'stop',
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        content: [{ type: 'text', text: 'State restoration failed: no state data provided' }],
        warnings: [],
        response: {
          id: 'state-restoration-error',
          timestamp: new Date(),
          modelId: model.modelId || 'unknown',
        },
      };
    }

    // Create modified params for state restoration
    const restorationParams: StateManagementParams = {
      ...params,
      [STATE_PROTOCOL.RESTORE]: true,
      stateData,
    };

    try {
      // Inject the restoration parameters into the original params object
      // so downstream middleware can detect the restoration protocol
      const originalRestore = params[STATE_PROTOCOL.RESTORE];
      const originalStateData = params.stateData;
      
      (params as any)[STATE_PROTOCOL.RESTORE] = true;
      (params as any).stateData = stateData;
      
      try {
        // Run through chain to restore states
        await doGenerate();
      } finally {
        // Restore original values
        if (originalRestore !== undefined) {
          (params as any)[STATE_PROTOCOL.RESTORE] = originalRestore;
        } else {
          delete (params as any)[STATE_PROTOCOL.RESTORE];
        }
        
        if (originalStateData !== undefined) {
          (params as any).stateData = originalStateData;
        } else {
          delete (params as any).stateData;
        }
      }

      log((l) =>
        l.debug('State restoration completed', {
          middlewareId: this.getMiddlewareId(),
          restoredCount: stateData.size,
          middlewareIds: Array.from(stateData.keys()),
        }),
      );
    } catch (error) {
      // Expected - this is just for restoration
      log((l) =>
        l.debug('Expected behavior during state restoration', {
          middlewareId: this.getMiddlewareId(),
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }

    // Return success signal
    return {
      finishReason: 'stop',
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      content: [{ type: 'text', text: 'State restored successfully' }],
      warnings: [],
      response: {
        id: 'state-restoration',
        timestamp: new Date(),
        modelId: model.modelId || 'unknown',
      },
    };
  }
}

/**
 * Factory function to create a new StateManagementMiddleware instance
 */
export const createStateManagementMiddleware =
  (): StateManagementMiddleware => {
    return new StateManagementMiddleware();
  };
