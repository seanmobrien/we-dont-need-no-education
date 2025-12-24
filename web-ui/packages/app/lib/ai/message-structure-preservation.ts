/**
 * @fileoverview Message Structure Preservation - Main exports
 *
 * This module provides a strongly-typed interface for message structure preservation,
 * replacing magic properties with type-safe, configurable options.
 *
 * @example
 * ```typescript
 * import {
 *   preserveMessageStructure,
 *   createPresetConfiguration,
 *   type MessageStructureOptions
 * } from '@/lib/ai/message-structure-preservation';
 *
 * const options = createPresetConfiguration('balanced');
 * const result = preserveMessageStructure(messages, options);
 * ```
 */

// Core types and interfaces
export type {
  MessageStructureOptions,
  MessagePreservationResult,
  PreservationStrategy,
  MessagePartPreservationRules,
  MetadataPreservationOptions,
  ContentTransformationOptions,
  ToolPreservationRules,
  ContextualPreservationOptions,
  PerformanceOptions,
  PartialMessageStructureOptions,
} from './types/message-structure-preservation';

// Type guards and factory functions
export {
  createMessageStructureOptions,
  isPreservationEnabled,
  hasMessageStructureOptions,
  DEFAULT_MESSAGE_STRUCTURE_OPTIONS,
} from './types/message-structure-preservation';

// Utility functions
export {
  preserveMessageStructure,
  validateMessageStructureOptions,
  createPresetConfiguration,
  clearPreservationCache,
  getPreservationCacheStats,
} from './utils/message-structure-preservation';

/**
 * Re-export common preset configurations for convenience
 */
export const PRESET_CONFIGURATIONS = {
  minimal: 'minimal' as const,
  balanced: 'balanced' as const,
  comprehensive: 'comprehensive' as const,
  performance: 'performance' as const,
};

/**
 * Common strategies for easy import
 */
export const PRESERVATION_STRATEGIES = {
  full: 'full' as const,
  contentOnly: 'content-only' as const,
  semantic: 'semantic' as const,
  minimal: 'minimal' as const,
  custom: 'custom' as const,
} as const;
