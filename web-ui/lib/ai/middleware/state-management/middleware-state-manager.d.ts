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
import {
  SerializableLanguageModelMiddleware,
  SerializableMiddleware,
  SerializableState,
} from './types';

declare module '@/lib/ai/middleware/state-management/middleware-state-manager' {
  /**
   * State Management Middleware that handles protocol prompts for state collection and restoration
   *
   * This middleware:
   * - Intercepts STATE_PROTOCOL.COLLECT prompts to collect middleware states
   * - Intercepts STATE_PROTOCOL.RESTORE prompts to restore middleware states
   * - Must be the first middleware in the chain to capture all downstream states
   */
  export class MiddlewareStateManager {
    /**
     * Reset the global singleton instance. Intended for tests and reinitialization.
     * Calling this will drop the existing global instance and allow a new one to be created.
     */
    static reset(): void;

    /**
     * Accessor for the global MiddlewareStateManager singleton.
     * Creates the instance lazily on first access.
     */
    static get Instance(): MiddlewareStateManager;

    /**
     * Return a stable identifier for this middleware instance.
     * This id is used by the state protocol to reference the middleware's saved state.
     * @returns {'state-manager'} Middleware id literal
     */
    getMiddlewareId(): 'state-manager';

    /**
     * Return the underlying middleware implementation used by the wrapper helpers.
     * Consumers may use this to examine or re-wrap the middleware.
     * @returns {LanguageModelV2Middleware} Middleware implementation
     */
    getMiddlewareInstance(): LanguageModelV2Middleware;

    /**
     * Serialize the current state of middleware in the pipeline.
     * This function asks downstream middleware to write their serializable state into
     * the `STATE_PROTOCOL.RESULTS` provider options and returns the collected snapshot.
     *
     * Note: the implementation uses `generateText` with protocol providerOptions to
     * trigger state collection. The returned state is a list of [middlewareId, state]
     * tuples together with a timestamp.
     *
     * @param params - The language model used to perform the protocol call.
     * @returns Collected state snapshot and timestamp
     */
    serializeState(params: { model: LanguageModelV2 }): Promise<{
      timestamp: number;
      state: Array<[string, SerializableState]>;
    }>;

    /**
     * Restore previously serialized middleware state.
     *
     * The `state` parameter accepts either the raw array of tuples or the wrapper
     * object produced by `serializeState` ({ timestamp, state }). The method triggers
     * downstream middleware by executing `generateText` with providerOptions instructing
     * each middleware to restore from the provided `STATE_PROTOCOL.RESULTS` payload.
     *
     * @param params - The state to restore and the model to use.
     */
    deserializeState(params: {
      model: LanguageModelV2;
      state:
        | Array<[string, SerializableState]>
        | { timestamp: number; state: Array<[string, SerializableState]> };
    }): Promise<void>;

    /**
     * Wrap a plain (non-serializable) middleware with stateful behaviour.
     * This helper returns a middleware that speaks the state protocol but delegates
     * to the provided `middleware` for actual behavior.
     *
     * @param args - The middleware ID and implementation.
     * @returns Wrapped middleware
     */
    basicMiddlewareWrapper(args: {
      middlewareId: string;
      middleware: LanguageModelV2Middleware;
    }): LanguageModelV2Middleware;

    /**
     * Wrap a middleware that already supports serialization (or provide custom
     * serialize/deserialize handlers) and produce a stateful middleware compatible
     * with the pipeline state protocol.
     *
     * The generic `TState` should match the serializable state shape produced by the
     * middleware being wrapped.
     *
     * @template TState
     * @param args - The middleware ID, implementation, and optional handlers.
     * @returns Wrapped stateful middleware
     */
    statefulMiddlewareWrapper<
      TState extends SerializableState = SerializableState,
    >(args: {
      middlewareId: string;
      middleware:
        | LanguageModelV2Middleware
        | SerializableLanguageModelMiddleware<string, TState>;
      serialize?: SerializableMiddleware<TState>['serializeState'];
      deserialize?: SerializableMiddleware<TState>['deserializeState'];
    }): LanguageModelV2Middleware;

    /**
     * Initialize a LanguageModelV2 instance with the state-management middleware wired in.
     * This helper wraps the provided model and installs the middleware so that calls to the
     * model will be intercepted for state collection/restoration protocol messages.
     *
     * @param props - The language model to wrap.
     *    It can be wrapped in a property object or passed in as the first argument.
     * @returns Wrapped language model
     */
    initializeModel(
      props: LanguageModelV2 | { model: LanguageModelV2 },
    ): LanguageModelV2;
  }
}
