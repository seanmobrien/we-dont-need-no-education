/**
 * @fileoverview Stateful Middleware Wrapper
 * 
 * This file provides a generic wrapper function that can adapt existing middleware
 * to participate in the state management protocol.
 */

import type { LanguageModelV2Middleware, LanguageModelV2 } from '@ai-sdk/provider';
import { log } from '@/lib/logger';
import { 
  STATE_PROTOCOL, 
  type StatefulMiddlewareConfig, 
  type StateManagementParams,
  type SerializableState
} from './types';

/**
 * Creates a stateful middleware that can participate in the state management protocol
 * 
 * This wrapper:
 * - Adds state collection and restoration capabilities to existing middleware
 * - Provides a unique middleware ID for identification
 * - Optionally handles state serialization/deserialization
 * 
 * @param config Configuration for the stateful middleware wrapper
 * @returns A new middleware that supports the state management protocol
 */
export function createStatefulMiddleware<T = SerializableState>(
  config: StatefulMiddlewareConfig<T>
): LanguageModelV2Middleware {
  const { middlewareId, originalMiddleware, stateHandlers } = config;

  return {
    wrapGenerate: async (options) => {
      const { doGenerate } = options;
      
      // Handle state collection
      if (isStateCollectionRequest(options)) {
        return handleStateCollection(middlewareId, stateHandlers, options, doGenerate);
      }

      // Handle state restoration
      if (isStateRestorationRequest(options)) {
        return handleStateRestoration(middlewareId, stateHandlers, options, doGenerate);
      }

      // Normal operation - use original middleware
      if (originalMiddleware.wrapGenerate) {
        return await originalMiddleware.wrapGenerate(options);
      }

      return await doGenerate();
    },

    wrapStream: async (options) => {
      const { doStream } = options;
      
      // Handle state collection for streaming
      if (isStateCollectionRequest(options)) {
        return handleStateCollection(middlewareId, stateHandlers, options, doStream);
      }

      // Handle state restoration for streaming
      if (isStateRestorationRequest(options)) {
        return handleStateRestoration(middlewareId, stateHandlers, options, doStream);
      }

      // Normal operation - use original middleware stream wrapper if available
      if (originalMiddleware.wrapStream) {
        return await originalMiddleware.wrapStream(options);
      }

      return await doStream();
    },

    transformParams: originalMiddleware.transformParams,
  };
}

/**
 * Check if this is a state collection request
 */
function isStateCollectionRequest(options: any): boolean {
  const params = options.params || options;
  return !!(params as StateManagementParams)[STATE_PROTOCOL.RESULT_KEY];
}

/**
 * Check if this is a state restoration request
 */
function isStateRestorationRequest(options: any): boolean {
  const params = options.params || options;
  return !!(params as StateManagementParams)[STATE_PROTOCOL.RESTORE];
}

/**
 * Handle state collection for this middleware
 */
async function handleStateCollection<T>(
  middlewareId: string,
  stateHandlers: { serialize?: () => T; deserialize?: (state: T) => void } | undefined,
  options: any,
  next: () => any
): Promise<any> {
  const params = options.params || options;
  const stateCollection = (params as StateManagementParams)[STATE_PROTOCOL.RESULT_KEY];
  
  if (stateCollection) {
    // Add our state if we can serialize
    if (stateHandlers?.serialize) {
      try {
        const state = stateHandlers.serialize();
        stateCollection.set(middlewareId, state);
        
        log(l => l.debug('Middleware state collected', { 
          middlewareId, 
          hasState: !!state 
        }));
      } catch (error) {
        log(l => l.warn('Failed to serialize middleware state', { 
          middlewareId, 
          error: error instanceof Error ? error.message : String(error)
        }));
      }
    } else {
      // Even if we can't serialize, we report our presence
      stateCollection.set(middlewareId, { present: true });
      
      log(l => l.debug('Middleware reported presence (no serialization)', { 
        middlewareId 
      }));
    }
  }

  // Continue down the chain
  return await next();
}

/**
 * Handle state restoration for this middleware
 */
async function handleStateRestoration<T>(
  middlewareId: string,
  stateHandlers: { serialize?: () => T; deserialize?: (state: T) => void } | undefined,
  options: any,
  next: () => any
): Promise<any> {
  const params = options.params || options;
  const stateData = (params as StateManagementParams).stateData;
  
  if (stateData) {
    const myState = stateData.get(middlewareId);
    
    if (myState && stateHandlers?.deserialize) {
      try {
        stateHandlers.deserialize(myState as T);
        
        log(l => l.debug('Middleware state restored', { 
          middlewareId, 
          hasState: !!myState 
        }));
      } catch (error) {
        log(l => l.warn('Failed to deserialize middleware state', { 
          middlewareId, 
          error: error instanceof Error ? error.message : String(error)
        }));
      }
    } else if (myState) {
      log(l => l.debug('Middleware state found but no deserializer available', { 
        middlewareId 
      }));
    }
  }

  // Continue down the chain
  return await next();
}

/**
 * Convenience function to create a stateful middleware with minimal configuration
 * 
 * @param middlewareId Unique identifier for the middleware
 * @param originalMiddleware The original middleware to wrap
 * @returns A stateful middleware without state handlers
 */
export function createSimpleStatefulMiddleware(
  middlewareId: string,
  originalMiddleware: LanguageModelV2Middleware
): LanguageModelV2Middleware {
  return createStatefulMiddleware({
    middlewareId,
    originalMiddleware
  });
}