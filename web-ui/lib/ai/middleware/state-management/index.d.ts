/**
 * @fileoverview State Management Module Exports
 *
 * This module provides middleware state management capabilities including
 * state collection, restoration, and persistence protocol support.
 */

  import {
    STATE_PROTOCOL,
    type SerializableState,
    type StatefulMiddlewareConfig,
    type StateManagementParams,
    type SerializableMiddleware,
    type SerializableLanguageModelMiddleware,
    type MiddlewareMetadata,
  } from './types';

import { MiddlewareStateManager } from './middleware-state-manager';

declare module '@/lib/ai/middleware/state-management' {
  // Core types and interfaces
  export {
    STATE_PROTOCOL,
    type SerializableState,
    type StatefulMiddlewareConfig,
    type StateManagementParams,
    type SerializableMiddleware,
    type SerializableLanguageModelMiddleware,
    type MiddlewareMetadata,
    MiddlewareStateManager
  };
}
