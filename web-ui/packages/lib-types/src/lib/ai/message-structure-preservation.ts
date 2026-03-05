/* global Buffer */

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
  | 'full' // Preserve complete message structure including metadata
  | 'content-only' // Preserve only text content, strip metadata
  | 'semantic' // Preserve semantic meaning while allowing format changes
  | 'minimal' // Preserve only essential fields for functionality
  | 'custom'; // Use custom preservation rules

/**
 * Configuration for preserving message parts based on type
 */
export type MessagePartPreservationRules = {
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
};

/**
 * Metadata preservation configuration
 */
export type MetadataPreservationOptions = {
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
};

/**
 * Content transformation options for preserved messages
 */
export type ContentTransformationOptions = {
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
};

/**
 * Tool-specific preservation rules
 */
export type ToolPreservationRules = {
  /** Tools to always preserve */
  alwaysPreserve?: string[];
  /** Tools to never preserve */
  neverPreserve?: string[];
  /** Custom preservation logic for specific tools */
  customRules?: Record<
    string,
    (part: UIMessagePart<UIDataTypes, UITools>) => boolean
  >;
};

/**
 * Context-aware preservation options
 */
export type ContextualPreservationOptions = {
  /** Preserve messages within this many recent interactions */
  recentInteractionCount?: number;
  /** Preserve messages containing these keywords */
  preserveKeywords?: string[];
  /** Preserve messages matching these patterns */
  preservePatterns?: RegExp[];
  /** Custom context evaluation function */
  contextEvaluator?: (
    message: UIMessage,
    index: number,
    messages: UIMessage[],
  ) => boolean;
};

/**
 * Performance optimization options
 */
export type PerformanceOptions = {
  /** Enable caching of preservation decisions */
  enableCaching?: boolean;
  /** Cache TTL in milliseconds */
  cacheTtlMs?: number;
  /** Maximum number of items to cache */
  maxCacheSize?: number;
  /** Enable async processing for large message sets */
  enableAsyncProcessing?: boolean;
};

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
export type MessageStructureOptions = {
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
};

/**
 * Result of message structure preservation operation
 */
export type MessagePreservationResult = {
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
};

/**
 * Type guard to check if an object has message structure options
 */
export function hasMessageStructureOptions(
  obj: unknown,
): obj is { messageStructure: MessageStructureOptions } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'messageStructure' in obj &&
    typeof obj.messageStructure === 'object'
  );
}

/**
 * Type guard to check if preservation is enabled in options
 */
export function isPreservationEnabled(
  options: MessageStructureOptions,
): boolean {
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
  options: PartialMessageStructureOptions = {},
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
/**
 * Validate message structure options
 */
export const validateMessageStructureOptions = (
  options: MessageStructureOptions
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validate strategy
  const validStrategies: PreservationStrategy[] = [
    'full',
    'content-only',
    'semantic',
    'minimal',
    'custom',
  ];
  if (options.strategy && !validStrategies.includes(options.strategy)) {
    errors.push(
      `Invalid strategy: ${options.strategy
      }. Must be one of: ${validStrategies.join(', ')}`
    );
  }

  // Validate performance options
  if (options.performance) {
    const perf = options.performance;
    if (perf.cacheTtlMs !== undefined && perf.cacheTtlMs <= 0) {
      errors.push('cacheTtlMs must be positive');
    }
    if (perf.maxCacheSize !== undefined && perf.maxCacheSize <= 0) {
      errors.push('maxCacheSize must be positive');
    }
  }

  // Validate content transformation
  if (options.contentTransformation) {
    const content = options.contentTransformation;
    if (
      content.maxContentLength !== undefined &&
      content.maxContentLength <= 0
    ) {
      errors.push('maxContentLength must be positive');
    }
  }

  // Validate contextual options
  if (options.contextual) {
    const contextual = options.contextual;
    if (
      contextual.recentInteractionCount !== undefined &&
      contextual.recentInteractionCount <= 0
    ) {
      errors.push('recentInteractionCount must be positive');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};


/**
 * Cache for preservation decisions to improve performance
 */
const preservationCache = new Map<string, boolean>();
const cacheStats = {
  hits: 0,
  misses: 0,
  created: Date.now(),
};

/**
 * Generate a cache key for a message preservation decision
 */
const generateCacheKey = (
  message: UIMessage,
  options: MessageStructureOptions
): string => {
  const messageHash = JSON.stringify({
    id: message.id,
    role: message.role,
    partsLength: message.parts.length,
    strategy: options.strategy,
  });
  return `preserve_${Buffer.from(messageHash).toString('base64').slice(0, 16)}`;
};

/**
 * Clear the preservation cache
 */
export function clearPreservationCache(): void {
  preservationCache.clear();
  cacheStats.hits = 0;
  cacheStats.misses = 0;
  cacheStats.created = Date.now();
}

/**
 * Get cache statistics
 */
export function getPreservationCacheStats() {
  const total = cacheStats.hits + cacheStats.misses;
  return {
    size: preservationCache.size,
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    hitRate: total > 0 ? cacheStats.hits / total : 0,
    ageMs: Date.now() - cacheStats.created,
  };
}

/**
 * Evaluate whether a message part should be preserved based on rules
 */
function shouldPreservePart(
  part: UIMessagePart<UIDataTypes, UITools>,
  rules: MessagePartPreservationRules
): boolean {
  switch (part.type) {
    case 'text':
      return rules.text ?? true;
    case 'tool-call':
      return rules.toolCall ?? true;
    case 'tool-result':
      return rules.toolResult ?? true;
    case 'file':
      return rules.file ?? true;
    default:
      // Handle dynamic/unknown parts including image and others
      return rules.dynamic ?? false;
  }
}

/**
 * Apply content transformation to a message part
 */
function transformMessageContent(
  part: UIMessagePart<UIDataTypes, UITools>,
  options: MessageStructureOptions
): UIMessagePart<UIDataTypes, UITools> {
  const transformation = options.contentTransformation;

  if (!transformation || part.type !== 'text') {
    return part;
  }

  const textPart = part as { type: 'text'; text: string };
  let content = textPart.text;

  // Apply custom transformer first
  if (transformation.contentTransformer) {
    content = transformation.contentTransformer(content);
  }

  // Apply length limits
  if (
    transformation.maxContentLength &&
    content.length > transformation.maxContentLength
  ) {
    if (transformation.summarizeContent) {
      // In a real implementation, you might call a summarization service here
      content =
        content.substring(0, transformation.maxContentLength / 2) +
        (transformation.truncationSuffix || '...');
    } else if (transformation.truncateContent) {
      content =
        content.substring(0, transformation.maxContentLength) +
        (transformation.truncationSuffix || '...');
    }
  }

  return {
    ...part,
    text: content,
  } as UIMessagePart<UIDataTypes, UITools>;
}

/**
 * Check if a message should be preserved based on contextual rules
 */
function evaluateContextualPreservation(
  message: UIMessage,
  index: number,
  messages: UIMessage[],
  options: MessageStructureOptions
): { preserve: boolean; reason: string } {
  const contextual = options.contextual;

  if (!contextual) {
    return { preserve: true, reason: 'No contextual rules' };
  }

  // Apply custom context evaluator first (highest priority)
  if (contextual.contextEvaluator) {
    const shouldPreserve = contextual.contextEvaluator(
      message,
      index,
      messages
    );
    return {
      preserve: shouldPreserve,
      reason: shouldPreserve
        ? 'Custom evaluator: preserve'
        : 'Custom evaluator: filter',
    };
  }

  // Check recent interaction count
  if (
    contextual.recentInteractionCount &&
    index >= messages.length - contextual.recentInteractionCount
  ) {
    return { preserve: true, reason: 'Within recent interaction count' };
  }

  // Check for preserve keywords
  if (contextual.preserveKeywords?.length) {
    const hasKeyword = message.parts.some((part) => {
      if (part.type === 'text') {
        const textPart = part as { type: 'text'; text: string };
        return contextual.preserveKeywords!.some((keyword) =>
          textPart.text.toLowerCase().includes(keyword.toLowerCase())
        );
      }
      return false;
    });

    if (hasKeyword) {
      return { preserve: true, reason: 'Contains preserve keyword' };
    }
  }

  // Check for preserve patterns
  if (contextual.preservePatterns?.length) {
    const matchesPattern = message.parts.some((part) => {
      if (part.type === 'text') {
        const textPart = part as { type: 'text'; text: string };
        return contextual.preservePatterns!.some((pattern) =>
          pattern.test(textPart.text)
        );
      }
      return false;
    });

    if (matchesPattern) {
      return { preserve: true, reason: 'Matches preserve pattern' };
    }
  }

  return {
    preserve: false,
    reason: 'No contextual preservation rules matched',
  };
}



/**
 * Evaluate whether a message should be preserved based on all rules
 */
const evaluateMessagePreservation = (
  message: UIMessage,
  index: number,
  messages: UIMessage[],
  options: MessageStructureOptions
): { preserve: boolean; reason: string; strategy: PreservationStrategy } => {
  const strategy = options.strategy || 'semantic';

  // Check cache first
  const cacheKey = generateCacheKey(message, options);
  if (options.performance?.enableCaching) {
    const cached = preservationCache.get(cacheKey);
    if (cached !== undefined) {
      cacheStats.hits++;
      return {
        preserve: cached,
        reason: 'Cached decision',
        strategy,
      };
    }
    cacheStats.misses++;
  }

  let preserve = true;
  let reason = 'Default preserve';

  // Strategy-based evaluation
  switch (strategy) {
    case 'full':
      preserve = true;
      reason = 'Full preservation strategy';
      break;

    case 'minimal':
      // Only preserve if it has essential content
      preserve = message.parts.some(
        (part) => part.type === 'text' || part.type === 'tool-call'
      );
      reason = preserve ? 'Has essential content' : 'No essential content';
      break;

    case 'content-only':
      // Preserve if it has text content
      preserve = message.parts.some((part) => part.type === 'text');
      reason = preserve ? 'Has text content' : 'No text content';
      break;

    case 'semantic':
      {
        // Contextual evaluation for semantic preservation
        const contextResult = evaluateContextualPreservation(
          message,
          index,
          messages,
          options
        );
        preserve = contextResult.preserve;
        reason = contextResult.reason;
      }
      break;

    case 'custom':
      // Apply custom validator if provided
      if (options.validator) {
        preserve = options.validator(message);
        reason = preserve
          ? 'Custom validator: preserve'
          : 'Custom validator: filter';
      }
      break;
  }

  // Cache the decision
  if (options.performance?.enableCaching) {
    preservationCache.set(cacheKey, preserve);

    // Cleanup cache if it gets too large
    if (preservationCache.size > (options.performance.maxCacheSize || 1000)) {
      const keysToDelete = Array.from(preservationCache.keys()).slice(0, 100);
      keysToDelete.forEach((key) => preservationCache.delete(key));
    }
  }

  return { preserve, reason, strategy };
};

/**
 * Process and filter messages based on preservation options
 */
export const preserveMessageStructure = (
  messages: UIMessage[],
  options: MessageStructureOptions = {}
): MessagePreservationResult => {
  const startTime = Date.now();
  const fullOptions = createMessageStructureOptions(options);

  // Early return if preservation is disabled
  if (!isPreservationEnabled(fullOptions)) {
    return {
      preserved: messages,
      filtered: [],
      stats: {
        originalCount: messages.length,
        preservedCount: messages.length,
        filteredCount: 0,
        processingTimeMs: Date.now() - startTime,
      },
      warnings: ['Preservation is disabled - returning all messages'],
    };
  }

  const preserved: UIMessage[] = [];
  const filtered: UIMessage[] = [];
  const warnings: string[] = [];
  const debugDecisions: Array<{
    messageId: string;
    preserved: boolean;
    reason: string;
    strategy: PreservationStrategy;
  }> = [];

  // Process each message
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    try {
      const evaluation = evaluateMessagePreservation(
        message,
        i,
        messages,
        fullOptions
      );

      if (fullOptions.debug) {
        debugDecisions.push({
          messageId: message.id,
          preserved: evaluation.preserve,
          reason: evaluation.reason,
          strategy: evaluation.strategy,
        });
      }

      if (evaluation.preserve) {
        // Transform message content if needed
        const transformedParts = message.parts
          .filter((part) =>
            shouldPreservePart(part, fullOptions.partRules || {})
          )
          .map((part) => transformMessageContent(part, fullOptions));

        if (transformedParts.length > 0) {
          preserved.push({
            ...message,
            parts: transformedParts,
          });
        } else {
          filtered.push(message);
          warnings.push(
            `Message ${message.id} preserved but has no valid parts after filtering`
          );
        }
      } else {
        filtered.push(message);
      }
    } catch (error) {
      filtered.push(message);
      warnings.push(`Error processing message ${message.id}: ${error}`);
    }
  }

  const result: MessagePreservationResult = {
    preserved,
    filtered,
    stats: {
      originalCount: messages.length,
      preservedCount: preserved.length,
      filteredCount: filtered.length,
      processingTimeMs: Date.now() - startTime,
      ...(fullOptions.performance?.enableCaching && {
        cacheHits: cacheStats.hits,
        cacheMisses: cacheStats.misses,
      }),
    },
    warnings: warnings.length > 0 ? warnings : undefined,
    ...(fullOptions.debug && {
      debugInfo: { decisions: debugDecisions },
    }),
  };

  return result;
};
/**
 * Create a preset configuration for common use cases
 */
export const createPresetConfiguration = (
  preset: 'minimal' | 'balanced' | 'comprehensive' | 'performance'
): MessageStructureOptions => {
  switch (preset) {
    case 'minimal':
      return createMessageStructureOptions({
        strategy: 'minimal',
        partRules: {
          text: true,
          toolCall: false,
          toolResult: false,
          file: false,
          image: false,
          dynamic: false,
        },
        performance: {
          enableCaching: false,
        },
      });

    case 'balanced':
      return createMessageStructureOptions({
        strategy: 'semantic',
        contextual: {
          recentInteractionCount: 3,
        },
        contentTransformation: {
          maxContentLength: 1000,
          truncateContent: true,
        },
      });

    case 'comprehensive':
      return createMessageStructureOptions({
        strategy: 'full',
        debug: true,
        performance: {
          enableCaching: true,
          enableAsyncProcessing: true,
        },
      });

    case 'performance':
      return createMessageStructureOptions({
        strategy: 'content-only',
        performance: {
          enableCaching: true,
          cacheTtlMs: 600000, // 10 minutes
          maxCacheSize: 5000,
        },
        contentTransformation: {
          maxContentLength: 500,
          truncateContent: true,
        },
      });

    default:
      return createMessageStructureOptions();
  }
};