/**
 * @fileoverview Stateful Middleware Wrapper
 * 
 * This file provides a generic wrapper function that can adapt existing middleware
 * to participate in the state management protocol.
 */

import type { LanguageModelV1Middleware, LanguageModelV1 } from 'ai';
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
): LanguageModelV1Middleware {
  const { middlewareId, originalMiddleware, stateHandlers } = config;

  return {
    wrapGenerate: async ({ model, params }, next) => {
      // Handle state collection
      if (isStateCollectionRequest(params)) {
        return handleStateCollection(middlewareId, stateHandlers, { model, params }, next);
      }

      // Handle state restoration
      if (isStateRestorationRequest(params)) {
        return handleStateRestoration(middlewareId, stateHandlers, { model, params }, next);
      }

      // Normal operation - use original middleware
      if (originalMiddleware.wrapGenerate) {
        return await originalMiddleware.wrapGenerate({ model, params }, next);
      }

      return await next({ model, params });
    },

    wrapStream: async ({ model, params }, next) => {
      // Handle state collection for streaming
      if (isStateCollectionRequest(params)) {
        return handleStateCollection(middlewareId, stateHandlers, { model, params }, next);
      }

      // Handle state restoration for streaming
      if (isStateRestorationRequest(params)) {
        return handleStateRestoration(middlewareId, stateHandlers, { model, params }, next);
      }

      // Normal operation - use original middleware stream wrapper if available
      if (originalMiddleware.wrapStream) {
        return await originalMiddleware.wrapStream({ model, params }, next);
      }

      return await next({ model, params });
    },

    // Pass through parameter transformation if available
    transformParams: originalMiddleware.transformParams
  };
}

/**
 * Check if this is a state collection request
 */
function isStateCollectionRequest(params: StateManagementParams): boolean {
  return !!(params as StateManagementParams)[STATE_PROTOCOL.RESULT_KEY];
}

/**
 * Check if this is a state restoration request
 */
function isStateRestorationRequest(params: StateManagementParams): boolean {
  return !!(params as StateManagementParams)[STATE_PROTOCOL.RESTORE];
}

/**
 * Handle state collection for this middleware
 */
async function handleStateCollection<T>(
  middlewareId: string,
  stateHandlers: { serialize?: () => T; deserialize?: (state: T) => void } | undefined,
  { model, params }: { model: LanguageModelV1; params: StateManagementParams },
  next: (args: { model: LanguageModelV1; params: StateManagementParams }) => Promise<unknown>
): Promise<unknown> {
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
  return await next({ model, params });
}

/**
 * Handle state restoration for this middleware
 */
async function handleStateRestoration<T>(
  middlewareId: string,
  stateHandlers: { serialize?: () => T; deserialize?: (state: T) => void } | undefined,
  { model, params }: { model: LanguageModelV1; params: StateManagementParams },
  next: (args: { model: LanguageModelV1; params: StateManagementParams }) => Promise<unknown>
): Promise<unknown> {
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
  return await next({ model, params });
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
  originalMiddleware: LanguageModelV1Middleware
): LanguageModelV1Middleware {
  return createStatefulMiddleware({
    middlewareId,
    originalMiddleware
  });
}