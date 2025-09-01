/**
 * @fileoverview State Management Protocol Types and Interfaces
 *
 * This file defines the types and interfaces for the middleware state management
 * protocol that enables capturing and restoring middleware state across requests.
 */

import { PickField } from '@/lib/typescript';
import type {
  LanguageModelV2Middleware,
  LanguageModelV2CallOptions,
  SharedV2ProviderOptions,
} from '@ai-sdk/provider';
import { JSONValue } from 'ai';

/**
 * State management protocol constants for special prompt handling
 */
export const STATE_PROTOCOL = {
  COLLECT: '__COLLECT_MIDDLEWARE_STATE__',
  RESTORE: '__RESTORE_MIDDLEWARE_STATE__',
  RESULTS: '__MIDDLEWARE_STATE_RESULT__',
  OPTIONS_ROOT: '9bd3f8a1-2c5f-4e5b-9c7a-6f1e2d3c4b5a',
} as const;

/**
 * Serializable state data type
 */
export type SerializableState = Record<string, JSONValue>;

export type SerializableMiddleware<
  T extends SerializableState = SerializableState,
> = {
  /**
   * Get the unique identifier for this middleware instance
   * @returns A string that uniquely identifies this middleware
   */
  getMiddlewareId(props: { config: StatefulMiddlewareConfig }): string;

  /**
   * Serialize the current state of this middleware
   * @returns A JSON-serializable object representing the middleware state
   */
  serializeState(props: {
    params: StateManagementParams;
    config: StatefulMiddlewareConfig;
  }): Promise<T>;

  /**
   * Restore the middleware state from a serialized object
   * @param state The serialized state to restore
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
export type SerializableLanguageModelMiddleware<
  TMiddlewareId extends string = string,
  T extends SerializableState = SerializableState,
> = LanguageModelV2Middleware &
  SerializableMiddleware<T> & {
    /**
     * Get the unique identifier for this middleware instance
     * @returns A string that uniquely identifies this middleware
     */
    getMiddlewareId(props: {
      options: StatefulMiddlewareConfig;
    }): TMiddlewareId;
  };

/**
 * Configuration for the createStatefulMiddleware wrapper
 */
export interface StatefulMiddlewareConfig<
  TMiddlewareId extends string = string,
> {
  /**
   * Unique identifier for the middleware
   */
  middlewareId: TMiddlewareId;
}

export type StateManagementProviderOptions = Record<string, JSONValue> & {
  /**
   * A statebag keyed by middleware id and used to gather collection state results during state collection
   */
  [STATE_PROTOCOL.RESULTS]?: Array<[string, SerializableState]>;
  /**
   * When flag is true participating middleware should read state from the statebag; default is to write state.
   */
  [STATE_PROTOCOL.RESTORE]?: boolean;
  /**
   * State data for restoration.  I don't think we need this? eg the one result_key statebag should work...
   *
   * @deprecated Use [STATE_PROTOCOL.RESULT_KEY] instead.
   */
  stateData?: Map<string, unknown>;
};

export type StateManagementProviderOptionsKey =
  keyof StateManagementProviderOptions;

export type StateManagementField<
  TKey extends StateManagementProviderOptionsKey,
> = PickField<StateManagementProviderOptions, TKey>;

/**
 * Extended parameters for middleware that include state management
 */
export interface StateManagementParams extends LanguageModelV2CallOptions {
  /**
   * Extends {@link SharedV2ProviderOptions} with state management protocol support.
   */
  providerOptions?: SharedV2ProviderOptions & {
    /**
     * "Magic" statebag used to smuggle in state management protocul support.
     */
    [STATE_PROTOCOL.OPTIONS_ROOT]?: StateManagementProviderOptions;
  };
}

/**
 * Database schema for middleware metadata
 */
export interface MiddlewareMetadata {
  /**
   * Unique identifier for the middleware
   */
  id: string;

  /**
   * Human-readable name of the middleware
   */
  name: string;

  /**
   * Path to the JavaScript file that implements the middleware
   */
  implementationPath: string;

  /**
   * Description of what the middleware does
   */
  description?: string;

  /**
   * Whether the middleware supports state serialization
   */
  supportsStateSerialization: boolean;

  /**
   * Timestamp when the middleware was registered
   */
  createdAt: Date;

  /**
   * Timestamp when the middleware metadata was last updated
   */
  updatedAt: Date;

  /**
   * Whether the middleware is currently active
   */
  isActive: boolean;
}

/**
 * Basic state representation for middleware
 */
export type BasicMiddlewareState = {
  timestamp: number;
};
