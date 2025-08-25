/**
 * @fileoverview State Management Protocol Types and Interfaces
 * 
 * This file defines the types and interfaces for the middleware state management
 * protocol that enables capturing and restoring middleware state across requests.
 */

import type { LanguageModelV1Middleware, LanguageModelV1CallOptions } from 'ai';

/**
 * State management protocol constants for special prompt handling
 */
export const STATE_PROTOCOL = {
  COLLECT: '__COLLECT_MIDDLEWARE_STATE__',
  RESTORE: '__RESTORE_MIDDLEWARE_STATE__',
  RESULT_KEY: '__MIDDLEWARE_STATE_RESULT__'
} as const;

/**
 * Serializable state data type
 */
export type SerializableState = Record<string, unknown>;

/**
 * Interface that middleware must implement to participate in the state management protocol
 */
export interface StatefulMiddleware {
  /**
   * Get the unique identifier for this middleware instance
   * @returns A string that uniquely identifies this middleware
   */
  getMiddlewareId(): string;

  /**
   * Serialize the current state of this middleware
   * @returns A JSON-serializable object representing the middleware state
   */
  serializeState?(): SerializableState;

  /**
   * Restore the middleware state from a serialized object
   * @param state The serialized state to restore
   */
  deserializeState?(state: SerializableState): void;
}

/**
 * Handlers for state serialization and deserialization
 */
export interface StateHandlers<T = SerializableState> {
  /**
   * Function to serialize the middleware state
   */
  serialize?: () => T;

  /**
   * Function to deserialize and restore the middleware state
   */
  deserialize?: (state: T) => void;
}

/**
 * Configuration for the createStatefulMiddleware wrapper
 */
export interface StatefulMiddlewareConfig<T = SerializableState> {
  /**
   * Unique identifier for the middleware
   */
  middlewareId: string;

  /**
   * The original middleware to wrap
   */
  originalMiddleware: LanguageModelV1Middleware;

  /**
   * Optional state handlers for serialization/deserialization
   */
  stateHandlers?: StateHandlers<T>;
}

/**
 * Extended parameters for middleware that include state management
 */
export interface StateManagementParams extends LanguageModelV1CallOptions {
  /**
   * Collection result storage for state collection protocol
   */
  [STATE_PROTOCOL.RESULT_KEY]?: Map<string, unknown>;

  /**
   * Flag indicating state restoration is in progress
   */
  [STATE_PROTOCOL.RESTORE]?: boolean;

  /**
   * State data for restoration
   */
  stateData?: Map<string, unknown>;
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
 * State collection result type
 */
export type StateCollectionResult = Map<string, unknown>;

/**
 * State restoration data type
 */
export type StateRestorationData = Map<string, unknown>;