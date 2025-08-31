/**
 * @fileoverview State Management Module Exports
 * 
 * This module provides middleware state management capabilities including
 * state collection, restoration, and persistence protocol support.
 */

// Core types and interfaces
export {
  STATE_PROTOCOL,
  type SerializableState,
  type StatefulMiddleware,
  type StateHandlers,
  type StatefulMiddlewareConfig,
  type StateManagementParams,
  type MiddlewareMetadata,
  type StateCollectionResult,
  type StateRestorationData,
} from './types';

// State management middleware
export {
  StateManagementMiddleware,
  createStateManagementMiddleware,
} from './state-management-middleware';

// Stateful middleware wrapper
export {
  createStatefulMiddleware,
  createSimpleStatefulMiddleware,
} from './create-stateful-middleware';