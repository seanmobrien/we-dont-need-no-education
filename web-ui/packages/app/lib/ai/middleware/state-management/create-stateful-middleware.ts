import type { LanguageModelV2Middleware } from '@ai-sdk/provider';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { log } from '@compliance-theater/logger';
import {
  STATE_PROTOCOL,
  type StatefulMiddlewareConfig,
  type StateManagementParams,
  type SerializableState,
  type StateManagementProviderOptions,
  type SerializableLanguageModelMiddleware,
  SerializableMiddleware,
} from './types';

type StateManagementProviderOptionsKey = keyof StateManagementProviderOptions;

type CreateMiddlewareOptions<
  T extends SerializableState = SerializableState,
  TMiddlewareId extends string = string
> = StatefulMiddlewareConfig<TMiddlewareId> & {
  originalMiddleware:
    | SerializableLanguageModelMiddleware<TMiddlewareId, T>
    | LanguageModelV2Middleware;
};

const middlewareStateFromOptions = (
  params: Pick<StateManagementParams, 'providerOptions'>,
  options?: { create?: boolean }
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

const middlewarePropFromOptions = (
  source: Pick<StateManagementParams, 'providerOptions'>,
  options:
    | { create?: boolean; field: StateManagementProviderOptionsKey }
    | StateManagementProviderOptionsKey
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

export const isStateCollectionRequest = (
  options: StateManagementParams
): boolean =>
  middlewarePropFromOptions(options, STATE_PROTOCOL.COLLECT) === true;

export const isStateRestorationRequest = (
  options: StateManagementParams
): boolean =>
  middlewarePropFromOptions(options, STATE_PROTOCOL.RESTORE) === true;

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
      l.warn('No statebag found during state restoration', { middlewareId })
    );
    return;
  }
  const source = target.shift();
  if (!source) {
    log((l) =>
      l.warn('No state found during state restoration', { middlewareId })
    );
    return;
  }
  if (source[0] !== middlewareId) {
    log((l) =>
      l.warn('Middleware ID mismatch during state restoration', {
        middlewareId,
      })
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

export const createStatefulMiddleware = <
  T extends SerializableState = SerializableState,
  TMiddlewareId extends string = string
>(
  config: CreateMiddlewareOptions<T, TMiddlewareId>
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
