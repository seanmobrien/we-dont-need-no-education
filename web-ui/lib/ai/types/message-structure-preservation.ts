/**
 * @fileoverview Strongly-typed interface for message structure preservation
 * 
 * This module defines a type-safe alternative to the '__preserveStructure' magic property,
 * providing compile-time type checking and better developer experience for message
 * structure preservation logic.
 * 
 * @module lib/ai/types/message-structure-preservation
 */

import type { UIMessage, UIMessagePart, UIDataTypes, UITools } from 'ai';

/**
 * Preservation strategy types for different use cases
 */
export type PreservationStrategy = 
  | 'full'           // Preserve complete message structure including metadata
  | 'content-only'   // Preserve only text content, strip metadata  
  | 'semantic'       // Preserve semantic meaning while allowing format changes
  | 'minimal'        // Preserve only essential fields for functionality
  | 'custom';        // Use custom preservation rules

/**
 * Configuration for preserving message parts based on type
 */
export interface MessagePartPreservationRules {
  /** Whether to preserve text parts */
  text?: boolean;
  /** Whether to preserve tool call parts */
  toolCall?: boolean;
  /** Whether to preserve tool result parts */
  toolResult?: boolean;
  /** Whether to preserve file attachment parts */
  file?: boolean;
  /** Whether to preserve image parts */
  image?: boolean;
  /** Whether to preserve custom/dynamic parts */
  dynamic?: boolean;
}

/**
 * Metadata preservation configuration
 */
export interface MetadataPreservationOptions {
  /** Preserve timestamps */
  timestamps?: boolean;
  /** Preserve user identifiers */
  userIds?: boolean;
  /** Preserve message IDs */
  messageIds?: boolean;
  /** Preserve tool execution metadata */
  toolMetadata?: boolean;
  /** Preserve custom metadata fields */
  customFields?: string[];
}

/**
 * Content transformation options for preserved messages
 */
export interface ContentTransformationOptions {
  /** Maximum length for preserved content */
  maxContentLength?: number;
  /** Whether to truncate long content */
  truncateContent?: boolean;
  /** Truncation suffix (e.g., "...") */
  truncationSuffix?: string;
  /** Whether to summarize long content instead of truncating */
  summarizeContent?: boolean;
  /** Custom content transformer function */
  contentTransformer?: (content: string) => string;
}

/**
 * Tool-specific preservation rules
 */
export interface ToolPreservationRules {
  /** Tools to always preserve */
  alwaysPreserve?: string[];
  /** Tools to never preserve */
  neverPreserve?: string[];
  /** Custom preservation logic for specific tools */
  customRules?: Record<string, (part: UIMessagePart<UIDataTypes, UITools>) => boolean>;
}

/**
 * Context-aware preservation options
 */
export interface ContextualPreservationOptions {
  /** Preserve messages within this many recent interactions */
  recentInteractionCount?: number;
  /** Preserve messages containing these keywords */
  preserveKeywords?: string[];
  /** Preserve messages matching these patterns */
  preservePatterns?: RegExp[];
  /** Custom context evaluation function */
  contextEvaluator?: (message: UIMessage, index: number, messages: UIMessage[]) => boolean;
}

/**
 * Performance optimization options
 */
export interface PerformanceOptions {
  /** Enable caching of preservation decisions */
  enableCaching?: boolean;
  /** Cache TTL in milliseconds */
  cacheTtlMs?: number;
  /** Maximum number of items to cache */
  maxCacheSize?: number;
  /** Enable async processing for large message sets */
  enableAsyncProcessing?: boolean;
}

/**
 * Main interface for message structure preservation configuration
 * 
 * This interface replaces the '__preserveStructure' magic property with
 * a strongly-typed, comprehensive configuration system.
 * 
 * @example
 * ```typescript
 * const preservationConfig: MessageStructureOptions = {
 *   strategy: 'semantic',
 *   partRules: {
 *     text: true,
 *     toolCall: true,
 *     toolResult: false
 *   },
 *   metadata: {
 *     timestamps: true,
 *     messageIds: true
 *   },
 *   performance: {
 *     enableCaching: true,
 *     cacheTtlMs: 300000
 *   }
 * };
 * ```
 */
export interface MessageStructureOptions {
  /** Whether preservation is enabled */
  enabled?: boolean;
  
  /** Overall preservation strategy */
  strategy?: PreservationStrategy;
  
  /** Rules for preserving different message part types */
  partRules?: MessagePartPreservationRules;
  
  /** Metadata preservation configuration */
  metadata?: MetadataPreservationOptions;
  
  /** Content transformation options */
  contentTransformation?: ContentTransformationOptions;
  
  /** Tool-specific preservation rules */
  toolRules?: ToolPreservationRules;
  
  /** Context-aware preservation options */
  contextual?: ContextualPreservationOptions;
  
  /** Performance optimization settings */
  performance?: PerformanceOptions;
  
  /** Custom validation function for preserved messages */
  validator?: (preservedMessage: UIMessage) => boolean;
  
  /** Debug mode for logging preservation decisions */
  debug?: boolean;
}

/**
 * Result of message structure preservation operation
 */
export interface MessagePreservationResult {
  /** Successfully preserved messages */
  preserved: UIMessage[];
  
  /** Messages that were filtered out */
  filtered: UIMessage[];
  
  /** Preservation statistics */
  stats: {
    originalCount: number;
    preservedCount: number;
    filteredCount: number;
    processingTimeMs: number;
    cacheHits?: number;
    cacheMisses?: number;
  };
  
  /** Any warnings or issues during preservation */
  warnings?: string[];
  
  /** Debug information (if debug mode enabled) */
  debugInfo?: {
    decisions: Array<{
      messageId: string;
      preserved: boolean;
      reason: string;
      strategy: PreservationStrategy;
    }>;
  };
}

/**
 * Type guard to check if an object has message structure options
 */
export function hasMessageStructureOptions(
  obj: unknown
): obj is { messageStructure: MessageStructureOptions } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'messageStructure' in obj &&
    typeof (obj as any).messageStructure === 'object'
  );
}

/**
 * Type guard to check if preservation is enabled in options
 */
export function isPreservationEnabled(options: MessageStructureOptions): boolean {
  return options.enabled !== false; // Default to true if not explicitly disabled
}

/**
 * Default preservation configuration
 */
export const DEFAULT_MESSAGE_STRUCTURE_OPTIONS: MessageStructureOptions = {
  enabled: true,
  strategy: 'semantic',
  partRules: {
    text: true,
    toolCall: true,
    toolResult: true,
    file: true,
    image: true,
    dynamic: false,
  },
  metadata: {
    timestamps: true,
    userIds: true,
    messageIds: true,
    toolMetadata: true,
    customFields: [],
  },
  contentTransformation: {
    maxContentLength: 2000,
    truncateContent: true,
    truncationSuffix: '...',
    summarizeContent: false,
  },
  contextual: {
    recentInteractionCount: 5,
  },
  performance: {
    enableCaching: true,
    cacheTtlMs: 300000, // 5 minutes
    maxCacheSize: 1000,
    enableAsyncProcessing: false,
  },
  debug: false,
} as const;

/**
 * Utility type to create partial preservation options with type checking
 */
export type PartialMessageStructureOptions = Partial<MessageStructureOptions>;

/**
 * Factory function to create preservation options with defaults
 */
export function createMessageStructureOptions(
  options: PartialMessageStructureOptions = {}
): MessageStructureOptions {
  return {
    ...DEFAULT_MESSAGE_STRUCTURE_OPTIONS,
    ...options,
    partRules: {
      ...DEFAULT_MESSAGE_STRUCTURE_OPTIONS.partRules,
      ...options.partRules,
    },
    metadata: {
      ...DEFAULT_MESSAGE_STRUCTURE_OPTIONS.metadata,
      ...options.metadata,
    },
    contentTransformation: {
      ...DEFAULT_MESSAGE_STRUCTURE_OPTIONS.contentTransformation,
      ...options.contentTransformation,
    },
    contextual: {
      ...DEFAULT_MESSAGE_STRUCTURE_OPTIONS.contextual,
      ...options.contextual,
    },
    performance: {
      ...DEFAULT_MESSAGE_STRUCTURE_OPTIONS.performance,
      ...options.performance,
    },
  };
}