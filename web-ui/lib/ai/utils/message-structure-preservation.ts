/**
 * @fileoverview Utility functions for message structure preservation
 const shouldPreservePart = (
  part: UIMessagePart<UIDataTypes, UITools>,
  rules: MessagePartPreservationRules
): boolean => { This module provides utility functions for working with the MessageStructureOptions
 * interface, including message filtering, preservation logic, and performance optimizations.
 *
 * @module lib/ai/utils/message-structure-preservation
 */

import type { UIMessage, UIMessagePart, UIDataTypes, UITools } from 'ai';
import type {
  MessageStructureOptions,
  MessagePreservationResult,
  PreservationStrategy,
  MessagePartPreservationRules,
} from '@/lib/ai/types/message-structure-preservation';
import {
  createMessageStructureOptions,
  isPreservationEnabled,
} from '@/lib/ai/types/message-structure-preservation';
import { log } from '@/lib/logger';

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
  options: MessageStructureOptions,
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
  rules: MessagePartPreservationRules,
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
  options: MessageStructureOptions,
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
  options: MessageStructureOptions,
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
      messages,
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
          textPart.text.toLowerCase().includes(keyword.toLowerCase()),
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
          pattern.test(textPart.text),
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
function evaluateMessagePreservation(
  message: UIMessage,
  index: number,
  messages: UIMessage[],
  options: MessageStructureOptions,
): { preserve: boolean; reason: string; strategy: PreservationStrategy } {
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
        (part) => part.type === 'text' || part.type === 'tool-call',
      );
      reason = preserve ? 'Has essential content' : 'No essential content';
      break;

    case 'content-only':
      // Preserve if it has text content
      preserve = message.parts.some((part) => part.type === 'text');
      reason = preserve ? 'Has text content' : 'No text content';
      break;

    case 'semantic':
      // Contextual evaluation for semantic preservation
      const contextResult = evaluateContextualPreservation(
        message,
        index,
        messages,
        options,
      );
      preserve = contextResult.preserve;
      reason = contextResult.reason;
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
}

/**
 * Process and filter messages based on preservation options
 */
export function preserveMessageStructure(
  messages: UIMessage[],
  options: MessageStructureOptions = {},
): MessagePreservationResult {
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
        fullOptions,
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
            shouldPreservePart(part, fullOptions.partRules || {}),
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
            `Message ${message.id} preserved but has no valid parts after filtering`,
          );
        }
      } else {
        filtered.push(message);
      }
    } catch (error) {
      filtered.push(message);
      warnings.push(`Error processing message ${message.id}: ${error}`);

      if (fullOptions.debug) {
        log((l) =>
          l.warn('Message preservation error', {
            messageId: message.id,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
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

  // Log performance information if debug is enabled
  if (fullOptions.debug) {
    log((l) =>
      l.debug('Message structure preservation completed', {
        originalCount: messages.length,
        preservedCount: preserved.length,
        filteredCount: filtered.length,
        processingTimeMs: result.stats.processingTimeMs,
        strategy: fullOptions.strategy,
      }),
    );
  }

  return result;
}

/**
 * Validate message structure options
 */
export function validateMessageStructureOptions(
  options: MessageStructureOptions,
): { valid: boolean; errors: string[] } {
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
      `Invalid strategy: ${options.strategy}. Must be one of: ${validStrategies.join(', ')}`,
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
}

/**
 * Create a preset configuration for common use cases
 */
export function createPresetConfiguration(
  preset: 'minimal' | 'balanced' | 'comprehensive' | 'performance',
): MessageStructureOptions {
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
}
