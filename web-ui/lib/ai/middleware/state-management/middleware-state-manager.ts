/**
 * @fileoverview State Management Middleware Implementation
 *
 * This middleware intercepts special protocol prompts for state collection and restoration.
 * It must be placed first in the middleware chain to capture all middleware states.
 */

import type {
  LanguageModelV2Middleware,
  LanguageModelV2,
  LanguageModelV2TextPart,
} from '@ai-sdk/provider';
import { log } from '/lib/logger';
import {
  SerializableLanguageModelMiddleware,
  SerializableMiddleware,
  SerializableState,
  STATE_PROTOCOL,
} from './types';
import {
  createStatefulMiddleware,
  isStateCollectionRequest,
  isStateRestorationRequest,
} from './create-stateful-middleware';
import { generateText, wrapLanguageModel } from 'ai';

/**
 * State Management Middleware that handles protocol prompts for state collection and restoration
 *
 * This middleware:
 * - Intercepts STATE_PROTOCOL.COLLECT prompts to collect middleware states
 * - Intercepts STATE_PROTOCOL.RESTORE prompts to restore middleware states
 * - Must be the first middleware in the chain to capture all downstream states
 */
export class MiddlewareStateManager {
  /** Symbol-based global registry key for MiddlewareStateManager singleton. */
  static readonly #REGISTRY_KEY = Symbol.for(
    '@noeducation/middleware:MiddlewareStateManager',
  );

  /**
   * Global singleton instance via symbol registry.
   * Use `MiddlewareStateManager.Instance` or the factory `createStateManagementMiddleware`
   * to obtain a reference.
   * @private
   * @type {MiddlewareStateManager | undefined}
   */
  // implements
  //  SerializableMiddleware<BasicMiddlewareState>
  static get #globalInstance(): MiddlewareStateManager | undefined {
    type GlobalReg = { [k: symbol]: MiddlewareStateManager | undefined };
    const g = globalThis as unknown as GlobalReg;
    return g[this.#REGISTRY_KEY];
  }
  static set #globalInstance(value: MiddlewareStateManager | undefined) {
    type GlobalReg = { [k: symbol]: MiddlewareStateManager | undefined };
    const g = globalThis as unknown as GlobalReg;
    g[this.#REGISTRY_KEY] = value;
  }
  /**
   * Reset the global singleton instance. Intended for tests and reinitialization.
   * Calling this will drop the existing global instance and allow a new one to be created.
   * @returns {void}
   */
  static reset(): void {
    const instance = this.#globalInstance;
    if (instance) {
      this.#globalInstance = undefined;
    }
  }
  /**
   * Accessor for the global MiddlewareStateManager singleton.
   * Creates the instance lazily on first access.
   * @returns {MiddlewareStateManager}
   */
  static get Instance() {
    if (!this.#globalInstance) {
      this.#globalInstance = new MiddlewareStateManager();
    }
    return this.#globalInstance;
  }
  /**
   * Return a stable identifier for this middleware instance.
   * This id is used by the state protocol to reference the middleware's saved state.
   * @returns {'state-manager'} Middleware id literal
   */
  getMiddlewareId(): 'state-manager' {
    return 'state-manager';
  }
  /**
   * Return the underlying middleware implementation used by the wrapper helpers.
   * Consumers may use this to examine or re-wrap the middleware.
   * @returns {LanguageModelV2Middleware} Middleware implementation
   */
  getMiddlewareInstance() {
    return this.#middleware;
  }
  /**
   * Serialize the current state of middleware in the pipeline.
   * This function asks downstream middleware to write their serializable state into
   * the `STATE_PROTOCOL.RESULTS` provider options and returns the collected snapshot.
   *
   * Note: the implementation uses `generateText` with protocol providerOptions to
   * trigger state collection. The returned state is a list of [middlewareId, state]
   * tuples together with a timestamp.
   *
   * @param {{ model: LanguageModelV2 }} params - The language model used to perform the protocol call.
   * @returns {Promise<{ timestamp: number; state: Array<[string, SerializableState]> }>} Collected state snapshot and timestamp
   */
  async serializeState({ model }: { model: LanguageModelV2 }): Promise<{
    timestamp: number;
    state: Array<[string, SerializableState]>;
  }> {
    const stateItems: Array<[string, SerializableState]> = [];
    log((l) => l.verbose(`Taking snapshot of workflow state.`));
    const providerOptions = {
      [STATE_PROTOCOL.OPTIONS_ROOT]: {
        [STATE_PROTOCOL.RESULTS]: stateItems,
        [STATE_PROTOCOL.COLLECT]: true,
      },
    };
    const result = await generateText({
      model,
      providerOptions,
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Serializing pipeline state' }],
          providerOptions,
        },
      ],
    });
    log((l) => l.verbose(`Generated text for state serialization:`, result));
    // Serialize the state of all middleware
    return Promise.resolve({ state: stateItems, timestamp: Date.now() });
  }
  /**
   * Restore previously serialized middleware state.
   *
   * The `state` parameter accepts either the raw array of tuples or the wrapper
   * object produced by `serializeState` ({ timestamp, state }). The method triggers
   * downstream middleware by executing `generateText` with providerOptions instructing
   * each middleware to restore from the provided `STATE_PROTOCOL.RESULTS` payload.
   *
   * @param {{ state: Array<[string, SerializableState]> | { timestamp: number; state: Array<[string, SerializableState]> }, model: LanguageModelV2 }} params
   * @returns {Promise<void>}
   */
  async deserializeState({
    state,
    model,
  }: {
    model: LanguageModelV2;
    state:
      | Array<[string, SerializableState]>
      | { timestamp: number; state: Array<[string, SerializableState]> };
  }): Promise<void> {
    const timestamp = 'timestamp' in state ? state.timestamp : Date.now();
    const stateItems = Array.isArray(state) ? state : state.state;
    log((l) => l.verbose(`Restoring state from ${new Date(timestamp)}.`));
    const providerOptions = {
      [STATE_PROTOCOL.OPTIONS_ROOT]: {
        [STATE_PROTOCOL.RESULTS]: stateItems,
        [STATE_PROTOCOL.RESTORE]: true,
      },
    };
    const result = await generateText({
      model,
      providerOptions,
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Restoring pipeline state' }],
          providerOptions,
        },
      ],
    });
    log((l) => l.verbose(`Generated text for state restoration:`, result));
  }
  /**
   * Wrap a plain (non-serializable) middleware with stateful behaviour.
   * This helper returns a middleware that speaks the state protocol but delegates
   * to the provided `middleware` for actual behavior.
   *
   * @param {{ middlewareId: string; middleware: LanguageModelV2Middleware }} args
   * @returns {LanguageModelV2Middleware} Wrapped middleware
   */
  basicMiddlewareWrapper({
    middlewareId,
    middleware,
  }: {
    middlewareId: string;
    middleware: LanguageModelV2Middleware;
  }): LanguageModelV2Middleware {
    return createStatefulMiddleware({
      middlewareId,
      originalMiddleware: middleware,
    });
  }
  /**
   * Wrap a middleware that already supports serialization (or provide custom
   * serialize/deserialize handlers) and produce a stateful middleware compatible
   * with the pipeline state protocol.
   *
   * The generic `TState` should match the serializable state shape produced by the
   * middleware being wrapped.
   *
   * @template TState
   * @param {{ middlewareId: string; middleware: LanguageModelV2Middleware | SerializableLanguageModelMiddleware<string, TState>; serialize?: SerializableMiddleware<TState>['serializeState']; deserialize?: SerializableMiddleware<TState>['deserializeState'] }} args
   * @returns {LanguageModelV2Middleware} Wrapped stateful middleware
   */
  statefulMiddlewareWrapper<
    TState extends SerializableState = SerializableState,
  >({
    middlewareId,
    middleware,
    serialize,
    deserialize,
  }: {
    middlewareId: string;
    middleware:
      | LanguageModelV2Middleware
      | SerializableLanguageModelMiddleware<string, TState>;
    serialize?: SerializableMiddleware<TState>['serializeState'];
    deserialize?: SerializableMiddleware<TState>['deserializeState'];
  }): LanguageModelV2Middleware {
    const serializeState =
      ('serializeState' in middleware
        ? middleware.serializeState
        : serialize) ?? serialize;
    const deserializeState =
      ('deserializeState' in middleware
        ? middleware.deserializeState
        : deserialize) ?? deserialize;
    const getMiddlewareId =
      'getMiddlewareId' in middleware
        ? middleware.getMiddlewareId
        : () => middlewareId;
    return createStatefulMiddleware({
      middlewareId,
      originalMiddleware: {
        ...middleware,
        serializeState,
        deserializeState,
        getMiddlewareId,
      },
    });
  }

  /**
   * Initialize a LanguageModelV2 instance with the state-management middleware wired in.
   * This helper wraps the provided model and installs the middleware so that calls to the
   * model will be intercepted for state collection/restoration protocol messages.
   *
   * @param {{ model: LanguageModelV2 } | LanguageModelV2} props - The language model to wrap.
   *    It can be wrapped in a property object or passed in as the first argument.
   * @returns {LanguageModelV2} Wrapped language model
   */
  initializeModel(
    props: LanguageModelV2 | { model: LanguageModelV2 },
  ): LanguageModelV2 {
    const model = 'model' in props ? props.model : props;
    const ret = wrapLanguageModel({
      model,
      middleware: this.#middleware,
    });
    return ret;
  }
  /**
   * Core middleware implementation that intercepts generate calls.
   * It recognizes state-collection and state-restoration requests via the
   * `isStateCollectionRequest` / `isStateRestorationRequest` helpers and returns
   * a deterministic, serializable response used by the protocol.
   *
   * @private
   * @returns {LanguageModelV2Middleware} Middleware object exposing `wrapGenerate`
   */
  get #middleware(): LanguageModelV2Middleware {
    return {
      wrapGenerate: async ({ model, params, doGenerate }) => {
        if (
          isStateRestorationRequest(params) ||
          isStateCollectionRequest(params)
        ) {
          const { prompt } = params;

          const text = (
            prompt
              .flatMap((msg) => (Array.isArray(msg.content) ? msg.content : []))
              .filter(
                (p) => p.type === 'text' && p.text?.length,
              ) as LanguageModelV2TextPart[]
          )
            .map((p) => p.text)
            .join('\n');
          return {
            finishReason: 'stop',
            usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            content: [
              {
                type: 'text',
                text: `Response to: ${text}`,
              },
            ],
            warnings: [],
            response: {
              id: 'state-operation-result',
              timestamp: new Date(),
              modelId: model.modelId,
            },
          };
        }
        return doGenerate();
      },
    };
  }
}
