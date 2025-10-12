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
  type StatefulMiddlewareConfig,
  type StateManagementParams,
  type SerializableMiddleware,
  type SerializableLanguageModelMiddleware,
  type MiddlewareMetadata,
} from './types';

// State management middleware
export { MiddlewareStateManager } from './middleware-state-manager';
