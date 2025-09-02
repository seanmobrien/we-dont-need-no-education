/**
 * @fileoverview Stateful Middleware Wrapper
 *
 * This module exports helpers to adapt arbitrary language-model middleware so it can
 * participate in the repository's state management protocol. The wrapper exposes
 * two public factory functions:
 *
 * - `createStatefulMiddleware(config)` – wraps an existing middleware and enables
 *   state collection/restoration hooks (serialize/deserialize) to be invoked when
 *   special provider options indicating `collect` or `restore` are present.
 *
 * The implementation is intentionally lightweight: it inspects the wrapped middleware
 * for `serializeState`, `deserializeState`, and `getMiddlewareId`. If absent, a
 * no-op serializer/deserializer is provided. During state-collection requests the
 * wrapper will call the middleware serializer and append the serialized state into
 * the shared `providerOptions[STATE_PROTOCOL.OPTIONS_ROOT].results` array. During
 * state-restoration requests the wrapper will pop a state entry from that array and
 * pass it to the middleware's `deserializeState`.
 *
 * This file focuses on documentation and a clear, typed contract for middleware
 * authors to implement serializable state handlers. It does not change runtime
 * semantics of wrapped middleware.
 */

import type { LanguageModelV2Middleware } from '@ai-sdk/provider';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { log } from '@/lib/logger';
import {
  STATE_PROTOCOL,
  type StatefulMiddlewareConfig,
  type StateManagementParams,
  type SerializableState,
  type StateManagementProviderOptions,
  type SerializableLanguageModelMiddleware,
  SerializableMiddleware,
} from './types';

/**
 * Key names for the state management provider options.
 */
type StateManagementProviderOptionsKey = keyof StateManagementProviderOptions;

/**
 * Options used to construct a stateful middleware wrapper.
 *
 * @template T - The serializable state shape produced/consumed by the wrapped middleware.
 * @template TMiddlewareId - A string literal type that uniquely identifies the middleware.  Defaults to `string`.
 *
 * @property {StatefulMiddlewareConfig<TMiddlewareId>} StatefulMiddlewareConfig -
 *   Inherits the stateful wrapper configuration (priority, etc.).
 * @property {SerializableLanguageModelMiddleware<TMiddlewareId, T> | LanguageModelV2Middleware} originalMiddleware
 *   The middleware instance being wrapped. If the provided middleware implements
 *   `serializeState`, `deserializeState`, and `getMiddlewareId`, those implementations
 *   will be used; otherwise the wrapper provides no-op defaults.
 */
type CreateMiddlewareOptions<
  T extends SerializableState = SerializableState,
  TMiddlewareId extends string = string,
> = StatefulMiddlewareConfig<TMiddlewareId> & {
  /** The original middleware to wrap. */
  originalMiddleware:
    | SerializableLanguageModelMiddleware<TMiddlewareId, T>
    | LanguageModelV2Middleware;
};

/**
 * Retrieve (or optionally create) the middleware state bag inside the
 * `providerOptions` object.
 *
 * The state management protocol keeps state in a namespaced property on
 * `params.providerOptions` identified by `STATE_PROTOCOL.OPTIONS_ROOT`.
 * This helper safely reads that object and will create it when `options.create`
 * is true.
 *
 * @param {Pick<StateManagementParams, 'providerOptions'>} params - The generate params
 *   object provided to middleware. May contain `providerOptions` which stores protocol
 *   baggage.
 * @param {{create?: boolean}} [options] - If `{create: true}` and the state bag is
 *   missing, a new object will be created and attached to `params.providerOptions`.
 * @returns {StateManagementProviderOptions | undefined} The internal state bag or
 *   `undefined` when it's absent and `create` is not requested.
 */
const middlewareStateFromOptions = (
  params: Pick<StateManagementParams, 'providerOptions'>,
  options?: { create?: boolean },
) => {
  let providerOptions = params?.providerOptions;
  if (!providerOptions) {
    providerOptions = {};
    params.providerOptions = providerOptions;
  }
  const create =
    typeof options === 'object' && options ? options.create === true : false;
  let ret = providerOptions[STATE_PROTOCOL.OPTIONS_ROOT];
  if (!ret && create) {
    ret = {};
    providerOptions[STATE_PROTOCOL.OPTIONS_ROOT] = ret;
  }
  return ret;
};

/**
 * Read a single property from the middleware state bag.
 *
 * This convenience wraps `middlewareStateFromOptions` and provides typed access
 * to named fields on the protocol bag. If the bag does not exist and `create` is
 * not set, `undefined` is returned.
 *
 * @param {Pick<StateManagementParams, 'providerOptions'>} source - The params
 *   container potentially containing `providerOptions`.
 * @param {{create?: boolean; field: StateManagementProviderOptionsKey} | StateManagementProviderOptionsKey} options
 *   Either the literal key to read (e.g. `STATE_PROTOCOL.COLLECT`) or an object
 *   describing the field and whether to create the bag if missing.
 * @returns {any} The stored value for the requested field, or `undefined`.
 */
const middlewarePropFromOptions = (
  source: Pick<StateManagementParams, 'providerOptions'>,
  options:
    | { create?: boolean; field: StateManagementProviderOptionsKey }
    | StateManagementProviderOptionsKey,
) => {
  const create =
    typeof options === 'object' && options ? options.create === true : false;
  const props = middlewareStateFromOptions(source, { create });
  if (!props) {
    return undefined;
  }
  if (typeof options === 'object') {
    const field = options.field;
    if (field) {
      return props[field];
    }
    throw new TypeError('field is required');
  }
  return props[options];
};

/**
 * Return `true` when the current generate invocation is intended to collect
 * state from middleware in the chain.
 *
 * If `true`, middleware should attempt to consume an entry from the shared
 * state bag and apply it via their `deserializeState` implementation.
 *
 * Middleware authors should use this helper to detect collection phases and
 * avoid performing normal generation work when the caller is requesting only
 * serialized state.
 *
 * @param {StateManagementParams} options - The middleware invocation params.
 * @returns {boolean} `true` when a state-collection request is in progress.
 */
export const isStateCollectionRequest = (
  options: StateManagementParams,
): boolean =>
  middlewarePropFromOptions(options, STATE_PROTOCOL.COLLECT) === true;

/**
 * Return `true` when the current generate invocation is intended to restore
 * previously collected middleware state.
 *
 * If `true`, middleware should attempt to consume an entry from the shared
 * state bag and apply it via their `deserializeState` implementation.
 *
 * @param {StateManagementParams} options - The middleware invocation params.
 * @returns {boolean} `true` when a state-restoration request is in progress.
 */
export const isStateRestorationRequest = (
  options: StateManagementParams,
): boolean =>
  middlewarePropFromOptions(options, STATE_PROTOCOL.RESTORE) === true;

/**
 * Run the middleware's `serializeState` hook and append the resulting state to
 * the protocol state bag.
 *
 * Contract & behavior:
 * - Calls the provided `serialize` function with `{ config, params }` and
 *   expects a serializable object in return.
 * - Ensures the protocol bag and `results` array exist (creates them when
 *   necessary).
 * - Avoids duplicating identical states in the `results` array: if the last
 *   recorded entry for this middleware already matches the newly serialized
 *   value (using `Object.is` on the state object), the value will not be
 *   pushed again.
 * - Exceptions thrown by `serialize` are captured and sent to `LoggedError`
 *   for diagnostic logging but will not crash the entire collection process.
 *
 * @template T - The serializable state type produced by the middleware.
 * @param {Object} args
 * @param {StatefulMiddlewareConfig} args.config - The wrapper configuration.
 * @param {string} args.middlewareId - The unique middleware identifier.
 * @param {SerializableMiddleware<T>['serializeState']} args.serialize - The
 *   middleware's serialize handler.
 * @param {StateManagementParams} args.params - The current middleware params.
 * @returns {Promise<T>} The serialized state that was recorded (or an empty
 *   object if serialization failed).
 */
const handleStateCollection = async <T extends SerializableState>({
  middlewareId,
  serialize,
  params,
  config,
}: {
  config: StatefulMiddlewareConfig;
  middlewareId: string;
  serialize: SerializableMiddleware<T>['serializeState'];
  params: StateManagementParams;
}): Promise<T> => {
  let state: T = {} as T;
  let ops: StateManagementProviderOptions = {};
  try {
    // Retrieve state from serializer
    state = await serialize({ config, params });
    // Append to
    const check = middlewareStateFromOptions(params, { create: true });
    if (!check) {
      throw new SyntaxError('Failed to create middleware statebag');
    }
    ops = check;
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'StatefuleMiddleware::handleStateCollection',
      data: {
        state: state,
        middlewareId,
        params,
      },
    });
  }
  const target = ops[STATE_PROTOCOL.RESULTS];
  if (!target || !Array.isArray(target)) {
    throw new TypeError('Failed to retrieve middleware state');
  }
  // Check to see if we have already been added to the statebag
  let addToBag;
  if (target.length === 0) {
    addToBag = true;
  } else {
    const lastItem = target[target.length - 1];
    if (lastItem[0] === middlewareId && Object.is(lastItem[1], state)) {
      addToBag = false;
    } else {
      addToBag = true;
    }
  }
  // Add if necessary
  if (addToBag) {
    target.push([middlewareId, state]);
  }
  // And return
  return state;
};

/**
 * Restore a middleware's state by popping the next available state entry off
 * the shared protocol results array and calling the middleware's
 * `deserializeState` handler.
 *
 * Contract & behavior:
 * - If no state bag or results array exists the function logs a warning and
 *   returns early (no-op).
 * - If the popped entry's middleware id does not match `middlewareId`, a
 *   warning is logged and restoration is skipped (this guards against
 *   accidental mismatch ordering).
 * - Any errors thrown by `deserialize` are captured and reported via
 *   `LoggedError` but are not re-thrown.
 *
 * @template T - The serializable state type expected by the middleware.
 * @param {Object} args
 * @param {StatefulMiddlewareConfig} args.config - The wrapper configuration.
 * @param {string} args.middlewareId - The unique middleware identifier.
 * @param {SerializableMiddleware<T>['deserializeState']} args.deserialize - The
 *   middleware's deserialize handler.
 * @param {StateManagementParams} args.params - The current middleware params.
 * @returns {Promise<void>} Resolves when restoration completes or is skipped.
 */
const handleStateRestoration = async <T extends SerializableState>({
  config,
  middlewareId,
  deserialize,
  params,
}: {
  config: StatefulMiddlewareConfig;
  middlewareId: string;
  deserialize: SerializableMiddleware<T>['deserializeState'];
  params: StateManagementParams;
}): Promise<void> => {
  // Pop the first block off the array
  const ops = middlewareStateFromOptions(params, { create: true });
  if (!ops) {
    throw new SyntaxError('Failed to create middleware statebag');
  }
  const target = ops[STATE_PROTOCOL.RESULTS];
  if (!target) {
    log((l) =>
      l.warn('No statebag found during state restoration', { middlewareId }),
    );
    return;
  }
  const source = target.shift();
  if (!source) {
    log((l) =>
      l.warn('No state found during state restoration', { middlewareId }),
    );
    return;
  }
  if (source[0] !== middlewareId) {
    log((l) =>
      l.warn('Middleware ID mismatch during state restoration', {
        middlewareId,
      }),
    );
    return;
  }
  // Pass state to deserializer for processing
  try {
    await deserialize({ config, params, state: source[1] as T });
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'StatefuleMiddleware::handleStateRestoration',
      data: {
        state: source[1] as T,
        middlewareId,
        params,
      },
    });
  }
  // And that's all she wrote - return to caller
};
/**
 * Create a middleware wrapper that enables participation in the state
 * management protocol.
 *
 * The returned middleware implements the `LanguageModelV2Middleware` shape and
 * will intercept the `wrapGenerate` call to perform either state collection or
 * state restoration when `params.providerOptions` contains the specialized
 * protocol keys (see `STATE_PROTOCOL`). For regular generate calls the wrapper
 * delegates to the underlying middleware (or the provided `doGenerate` when
 * there is no wrapped middleware).
 *
 * Important notes for implementers:
 * - The wrapper will call `serializeState` during collection requests and
 *   append the result into the shared `results` array. The serializer is
 *   expected to return a serializable plain object (or a Promise resolving to
 *   one).
 * - During restoration requests the wrapper will pop the first entry off the
 *   `results` array and forward it to `deserializeState` for rehydration.
 * - The wrapper is defensive: serialization/deserialization exceptions are
 *   captured and logged but do not abort the overall operation.
 *
 * @template T - The middleware's serializable state type.
 * @template TMiddlewareId - The middleware id literal type.
 * @param {CreateMiddlewareOptions<T, TMiddlewareId>} config - Wrapper options
 *   containing `middlewareId`, `originalMiddleware`, and optional state handlers.
 * @returns {LanguageModelV2Middleware} A middleware ready to be composed into
 *   a language model middleware chain.
 */
export const createStatefulMiddleware = <
  T extends SerializableState = SerializableState,
  TMiddlewareId extends string = string,
>(
  config: CreateMiddlewareOptions<T, TMiddlewareId>,
): LanguageModelV2Middleware => {
  const { middlewareId, originalMiddleware } = config;
  const serializer: SerializableLanguageModelMiddleware<TMiddlewareId, T> = {
    getMiddlewareId:
      'getMiddlewareId' in originalMiddleware &&
      typeof originalMiddleware.getMiddlewareId === 'function'
        ? originalMiddleware.getMiddlewareId
        : () => middlewareId,
    serializeState:
      'serializeState' in originalMiddleware &&
      typeof originalMiddleware.serializeState === 'function'
        ? originalMiddleware.serializeState
        : () => Promise.resolve({} as T),
    deserializeState:
      'deserializeState' in originalMiddleware &&
      typeof originalMiddleware.deserializeState === 'function'
        ? originalMiddleware.deserializeState
        : () => Promise.resolve(),
  };

  return {
    ...originalMiddleware,
    wrapGenerate: async (options) => {
      const { params } = options;
      let callInnerMiddleware = true;
      // Handle state collection
      if (isStateCollectionRequest(params)) {
        await handleStateCollection({
          middlewareId,
          serialize: serializer.serializeState,
          params,
          config,
        });
        callInnerMiddleware = false;
      }

      // Handle state restoration
      if (isStateRestorationRequest(params)) {
        await handleStateRestoration({
          middlewareId,
          deserialize: serializer.deserializeState,
          params,
          config,
        });
        callInnerMiddleware = false;
      }
      // Pass the call on down the chain...usually to our wrapped middleware,
      // unless this was a state management request in which case route it to
      // the next link in the chain.
      return callInnerMiddleware && originalMiddleware.wrapGenerate
        ? await originalMiddleware.wrapGenerate(options)
        : options.doGenerate();
    },
  };
};
