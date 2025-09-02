/**
 * @fileoverview State Management Protocol Types and Interfaces
 *
 * @module lib/ai/middleware/state-management/types
 *
 * This module declares the TypeScript types and runtime constants that define
 * the state-management protocol used by language-model middleware in this
 * repository. The protocol enables middleware to participate in two special
 * request modes:
 *
 * - State collection: middleware are asked to serialize their internal state so
 *   that it can be transported and later restored.
 * - State restoration: previously serialized states are supplied back to the
 *   middleware so they can re-hydrate their internal runtime state.
 *
 * Protocol data is passed via a namespaced property on `params.providerOptions`.
 * Middleware authors should implement the `SerializableMiddleware` interface to
 * opt-in to serialization and restoration.
 */

import type {
  LanguageModelV2Middleware,
  LanguageModelV2CallOptions,
  SharedV2ProviderOptions,
} from '@ai-sdk/provider';
import { JSONValue } from 'ai';

/**
 * STATE_PROTOCOL constants
 *
 * These keys are the canonical property names used to signal state-collection
 * or restoration requests and to hold the serialized results. The
 * `OPTIONS_ROOT` value is a GUID-like key used to avoid clobbering regular
 * provider options.
 *
 * Example usage:
 * ```ts
 * params.providerOptions = params.providerOptions || {};
 * params.providerOptions[STATE_PROTOCOL.OPTIONS_ROOT] = {
 *   [STATE_PROTOCOL.COLLECT]: true,
 * };
 * ```
 */
export const STATE_PROTOCOL = {
  /** When present and truthy, participating middleware should serialize state. */
  COLLECT: '__COLLECT_MIDDLEWARE_STATE__',
  /** When present and truthy, participating middleware should consume restored state. */
  RESTORE: '__RESTORE_MIDDLEWARE_STATE__',
  /** The property name used to store serialized middleware results (FIFO array). */
  RESULTS: '__MIDDLEWARE_STATE_RESULT__',
  /** Namespaced root used to store the state protocol bag inside providerOptions. */
  OPTIONS_ROOT: '9bd3f8a1-2c5f-4e5b-9c7a-6f1e2d3c4b5a',
} as const;

/**
 * Serializable state data shape
 *
 * Middleware state is represented as a plain object whose property values are
 * JSON-serializable. `JSONValue` is imported from the `ai` package and covers
 * primitives, arrays and nested objects composed of JSON-compatible values.
 *
 * Implementations are expected to return values matching this shape from
 * `serializeState` and accept the same shape for `deserializeState`.
 */
export type SerializableState = Record<string, JSONValue>;

/**
 * Interface for middleware that can serialize and restore state.
 *
 * Middleware implementing this interface are expected to provide three pieces
 * of functionality:
 *
 * - `getMiddlewareId` — returns a stable identifier for the middleware
 * - `serializeState` — returns a JSON-serializable representation of current state
 * - `deserializeState` — re-applies a previously serialized state
 *
 * These functions are invoked by the state-management wrapper during collection
 * and restoration flows.
 */
export type SerializableMiddleware<
  T extends SerializableState = SerializableState,
> = {
  /**
   * Get the unique identifier for this middleware instance.
   * @param props - The wrapper configuration for the middleware instance.
   * @returns A stable string identifier used to match state entries during restore.
   */
  getMiddlewareId(props: { config: StatefulMiddlewareConfig }): string;

  /**
   * Serialize the current middleware state into a JSON-compatible object.
   * @param props.params - The current generate call parameters (may include providerOptions).
   * @param props.config - The wrapper configuration for this middleware.
   * @returns A Promise resolving to the serializable state object.
   */
  serializeState(props: {
    params: StateManagementParams;
    config: StatefulMiddlewareConfig;
  }): Promise<T>;

  /**
   * Restore middleware state from a previously serialized object.
   * @param props.state - The serialized state to restore.
   * @param props.params - The current generate call parameters.
   * @param props.config - The wrapper configuration for this middleware.
   */
  deserializeState(props: {
    state: T;
    params: StateManagementParams;
    config: StatefulMiddlewareConfig;
  }): Promise<void>;
};

/**
 * Interface that middleware must implement to participate in the state management protocol
 */
/**
 * Combined middleware type that includes the language-model middleware shape
 * and the serializable state contract.
 *
 * This type is used when a middleware both participates in the v2 middleware
 * pipeline and implements serialize/deserialize helpers.
 */
export type SerializableLanguageModelMiddleware<
  TMiddlewareId extends string = string,
  T extends SerializableState = SerializableState,
> = LanguageModelV2Middleware &
  SerializableMiddleware<T> & {
    /**
     * Get the unique identifier for this middleware instance.
     * @param props.options - The wrapper configuration object provided to the middleware.
     * @returns A typed middleware id literal (TMiddlewareId).
     */
    getMiddlewareId(props: {
      options: StatefulMiddlewareConfig;
    }): TMiddlewareId;
  };

/**
 * Configuration for the createStatefulMiddleware wrapper
 */
/**
 * Configuration object supplied to the stateful middleware wrapper.
 *
 * The only required property is `middlewareId` — a stable identifier used when
 * serializing and restoring middleware state. The wrapper passes this object
 * to serializer and deserializer helpers so they can use configuration values
 * if needed.
 */
export interface StatefulMiddlewareConfig<
  TMiddlewareId extends string = string,
> {
  /** Unique identifier for the middleware. */
  middlewareId: TMiddlewareId;
}

/**
 * Provider-level options used to drive the state protocol.
 *
 * This type extends an open record (so other provider options may co-exist)
 * and adds three optional, namespaced properties used by the protocol:
 *
 * - `RESULTS` — an array used as a FIFO queue that stores `[middlewareId, state]`
 *   tuples produced during collection.
 * - `RESTORE` — boolean flag indicating the current call should restore state.
 * - `COLLECT` — boolean flag indicating the current call should collect state.
 */
export type StateManagementProviderOptions = Record<string, JSONValue> & {
  /**
   * A FIFO-based array used to store middleware id and state value during serialization.
   * Each entry is a two-tuple `[middlewareId, serializedState]`.
   */
  [STATE_PROTOCOL.RESULTS]?: Array<[string, SerializableState]>;
  /** When true participating middleware should read state from the statebag. */
  [STATE_PROTOCOL.RESTORE]?: boolean;
  /** When true participating middleware should store current state to the statebag. */
  [STATE_PROTOCOL.COLLECT]?: boolean;
};

/**
 * Extended parameters for middleware that include state management
 */
/**
 * Extended middleware call parameters that include the state-management
 * protocol bag.
 *
 * `StateManagementParams` extends the normal `LanguageModelV2CallOptions` and
 * augments `providerOptions` to optionally contain the protocol's
 * `OPTIONS_ROOT` bag. Middleware should treat `providerOptions` as potentially
 * containing the protocol object and use the namespaced keys on that object to
 * coordinate collection/restore flows.
 */
export interface StateManagementParams extends LanguageModelV2CallOptions {
  /**
   * Extends {@link SharedV2ProviderOptions} with state management protocol support.
   * The `OPTIONS_ROOT` property is where the protocol stores its control flags
   * and results array.
   */
  providerOptions?: SharedV2ProviderOptions & {
    /**
     * "Magic" statebag used to smuggle in state management protocol support.
     * Middleware and wrappers should only touch this property when participating
     * in the protocol; other callers should ignore it.
     */
    [STATE_PROTOCOL.OPTIONS_ROOT]?: StateManagementProviderOptions;
  };
}

/**
 * Database schema for middleware metadata
 */
/**
 * Optional database schema for storing middleware metadata.
 *
 * This structure is primarily used by administrative tooling that discovers
 * and manages pluggable middleware. It is not required for runtime protocol
 * operation but provides useful metadata for registration UIs and auditing.
 */
export type MiddlewareMetadata = {
  /** Unique identifier for the middleware. */
  id: string;

  /** Human-readable name of the middleware. */
  name: string;

  /** Path to the JavaScript file that implements the middleware. */
  implementationPath: string;

  /** Optional description of what the middleware does. */
  description?: string;

  /** Whether the middleware supports state serialization. */
  supportsStateSerialization: boolean;

  /** Timestamp when the middleware was registered. */
  createdAt: Date;

  /** Timestamp when the middleware metadata was last updated. */
  updatedAt: Date;

  /** Whether the middleware is currently active. */
  isActive: boolean;
};

/**
 * Small, common state shape that middleware may use as a baseline for
 * testing/examples. Real middleware will define richer state shapes.
 */
export type BasicMiddlewareState = {
  /** Epoch milliseconds when the state snapshot was taken. */
  timestamp: number;
};
