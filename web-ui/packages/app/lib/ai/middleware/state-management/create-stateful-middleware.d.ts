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
import type {
  StatefulMiddlewareConfig,
  StateManagementParams,
  SerializableState,
  SerializableLanguageModelMiddleware,
} from './types';

declare module '@/lib/ai/middleware/state-management/create-stateful-middleware' {
  /**
   * Options used to construct a stateful middleware wrapper.
   *
   * @template T - The serializable state shape produced/consumed by the wrapped middleware.
   * @template TMiddlewareId - A string literal type that uniquely identifies the middleware.  Defaults to `string`.
   */
  export type CreateMiddlewareOptions<
    T extends SerializableState = SerializableState,
    TMiddlewareId extends string = string,
  > = StatefulMiddlewareConfig<TMiddlewareId> & {
    /** The original middleware to wrap. */
    originalMiddleware:
      | SerializableLanguageModelMiddleware<TMiddlewareId, T>
      | LanguageModelV2Middleware;
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
   * @param options - The middleware invocation params.
   * @returns `true` when a state-collection request is in progress.
   */
  export const isStateCollectionRequest: (
    options: StateManagementParams,
  ) => boolean;

  /**
   * Return `true` when the current generate invocation is intended to restore
   * previously collected middleware state.
   *
   * If `true`, middleware should attempt to consume an entry from the shared
   * state bag and apply it via their `deserializeState` implementation.
   *
   * @param options - The middleware invocation params.
   * @returns `true` when a state-restoration request is in progress.
   */
  export const isStateRestorationRequest: (
    options: StateManagementParams,
  ) => boolean;

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
   * @param config - Wrapper options containing `middlewareId`, `originalMiddleware`, and optional state handlers.
   * @returns A middleware ready to be composed into a language model middleware chain.
   */
  export const createStatefulMiddleware: <
    T extends SerializableState = SerializableState,
    TMiddlewareId extends string = string,
  >(
    config: CreateMiddlewareOptions<T, TMiddlewareId>,
  ) => LanguageModelV2Middleware;
}
