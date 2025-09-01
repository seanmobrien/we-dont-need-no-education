/**
 * @fileoverview Stateful Middleware Wrapper
 *
 * This file provides a generic wrapper function that can adapt existing middleware
 * to participate in the state management protocol.
 */

import type { LanguageModelV2Middleware } from '@ai-sdk/provider';
import { log } from '@/lib/logger';
import {
  STATE_PROTOCOL,
  type StatefulMiddlewareConfig,
  type StateManagementParams,
  type SerializableState,
  type StateManagementProviderOptions,
  type StateManagementProviderOptionsKey,
  type SerializableLanguageModelMiddleware,
  SerializableMiddleware,
} from './types';
import { LoggedError } from '@/lib/react-util/errors/logged-error';

type CreateMiddlewareOptions<
  T extends SerializableState = SerializableState,
  TMiddlewareId extends string = string,
> = StatefulMiddlewareConfig<TMiddlewareId> & {
  /**
   * The original middleware to wrap
   */
  originalMiddleware:
    | SerializableLanguageModelMiddleware<TMiddlewareId, T>
    | LanguageModelV2Middleware;
};

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
export function createStatefulMiddleware<
  T extends SerializableState = SerializableState,
  TMiddlewareId extends string = string,
>(
  config: CreateMiddlewareOptions<T, TMiddlewareId>,
): LanguageModelV2Middleware {
  const { middlewareId, originalMiddleware } = config;
  const serializer: SerializableLanguageModelMiddleware<TMiddlewareId, T> =
    'serializeState' in originalMiddleware &&
    typeof originalMiddleware.serializeState === 'function' &&
    'deserializeState' in originalMiddleware &&
    typeof originalMiddleware.deserializeState === 'function' &&
    'getMiddlewareId' in originalMiddleware &&
    typeof originalMiddleware.getMiddlewareId === 'function'
      ? (originalMiddleware as SerializableLanguageModelMiddleware<
          TMiddlewareId,
          T
        >)
      : {
          getMiddlewareId: () => middlewareId,
          serializeState: () => Promise.resolve({} as T),
          deserializeState: () => Promise.resolve(),
        };

  return {
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

    transformParams: originalMiddleware.transformParams,
  };
}

const middlewareStateFromOptions = (
  params: Pick<StateManagementParams, 'providerOptions'>,
  options?: { create?: boolean },
) => {
  let { providerOptions } = params;
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
 * Check if this is a state collection request
 */
const isStateCollectionRequest = (options: StateManagementParams): boolean =>
  middlewarePropFromOptions(options, STATE_PROTOCOL.COLLECT) === true;

/**
 * Check if this is a state restoration request
 */
const isStateRestorationRequest = (options: StateManagementParams): boolean =>
  middlewarePropFromOptions(options, STATE_PROTOCOL.RESTORE) === true;

/**
 * Handle state collection for this middleware
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
 * Handle state restoration for this middleware
 */
async function handleStateRestoration<T extends SerializableState>({
  config,
  middlewareId,
  deserialize,
  params,
}: {
  config: StatefulMiddlewareConfig;
  middlewareId: string;
  deserialize: SerializableMiddleware<T>['deserializeState'];
  params: StateManagementParams;
}): Promise<void> {
  // Pop the top block off the array
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
  const source = target.pop();
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
  originalMiddleware: LanguageModelV2Middleware,
): LanguageModelV2Middleware {
  return createStatefulMiddleware({
    middlewareId,
    originalMiddleware,
  });
}
