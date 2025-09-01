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
  SerializableLanguageModelMiddleware,
  SerializableMiddleware,
  SerializableState,
  STATE_PROTOCOL,
} from './types';
import { createStatefulMiddleware } from './create-stateful-middleware';
import { generateText } from 'ai';

/**
 * State Management Middleware that handles protocol prompts for state collection and restoration
 *
 * This middleware:
 * - Intercepts STATE_PROTOCOL.COLLECT prompts to collect middleware states
 * - Intercepts STATE_PROTOCOL.RESTORE prompts to restore middleware states
 * - Must be the first middleware in the chain to capture all downstream states
 */
export class StateManagementMiddleware {
  // implements
  //  SerializableMiddleware<BasicMiddlewareState>
  static #globalInstance?: StateManagementMiddleware;
  static reset(): void {
    const instance = this.#globalInstance;
    if (instance) {
      this.#globalInstance = undefined;
    }
  }
  static get Instance() {
    if (!this.#globalInstance) {
      this.#globalInstance = new StateManagementMiddleware();
    }
    return this.#globalInstance;
  }

  getMiddlewareId(): 'state-manager' {
    return 'state-manager';
  }

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
          content: [{ type: 'text', text: 'Restoring pipeline state' }],
          providerOptions,
        },
      ],
    });
    log((l) => l.verbose(`Generated text for state restoration:`, result));
    // Serialize the state of all middleware
    return Promise.resolve({ state: stateItems, timestamp: Date.now() });
  }

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
    //
    if (
      result.providerMetadata?.[STATE_PROTOCOL.OPTIONS_ROOT]?.[
        STATE_PROTOCOL.RESULTS
      ]
    ) {
      return Promise.resolve();
    }
  }

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
   * The main middleware implementation
   */
  get middleware(): LanguageModelV2Middleware {
    return this.statefulMiddlewareWrapper({
      middlewareId: 'state-manager',
      middleware: {},
      serialize: () => Promise.resolve({ timestamp: Date.now() }),
      deserialize: () => Promise.resolve(),
    });
  }
}

/**
 * Factory function to "create" a "new" StateManagementMiddleware instance
 * Note it really just hands you a reference to the global, but
 */
export const createStateManagementMiddleware =
  (): StateManagementMiddleware => {
    return new StateManagementMiddleware();
  };
