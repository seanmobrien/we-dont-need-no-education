import { createMessageStructureOptions, isPreservationEnabled, } from '@/lib/ai/types/message-structure-preservation';
import { log } from '@compliance-theater/logger';
const preservationCache = new Map();
const cacheStats = {
    hits: 0,
    misses: 0,
    created: Date.now(),
};
const generateCacheKey = (message, options) => {
    const messageHash = JSON.stringify({
        id: message.id,
        role: message.role,
        partsLength: message.parts.length,
        strategy: options.strategy,
    });
    return `preserve_${Buffer.from(messageHash).toString('base64').slice(0, 16)}`;
};
export function clearPreservationCache() {
    preservationCache.clear();
    cacheStats.hits = 0;
    cacheStats.misses = 0;
    cacheStats.created = Date.now();
}
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
function shouldPreservePart(part, rules) {
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
            return rules.dynamic ?? false;
    }
}
function transformMessageContent(part, options) {
    const transformation = options.contentTransformation;
    if (!transformation || part.type !== 'text') {
        return part;
    }
    const textPart = part;
    let content = textPart.text;
    if (transformation.contentTransformer) {
        content = transformation.contentTransformer(content);
    }
    if (transformation.maxContentLength &&
        content.length > transformation.maxContentLength) {
        if (transformation.summarizeContent) {
            content =
                content.substring(0, transformation.maxContentLength / 2) +
                    (transformation.truncationSuffix || '...');
        }
        else if (transformation.truncateContent) {
            content =
                content.substring(0, transformation.maxContentLength) +
                    (transformation.truncationSuffix || '...');
        }
    }
    return {
        ...part,
        text: content,
    };
}
function evaluateContextualPreservation(message, index, messages, options) {
    const contextual = options.contextual;
    if (!contextual) {
        return { preserve: true, reason: 'No contextual rules' };
    }
    if (contextual.contextEvaluator) {
        const shouldPreserve = contextual.contextEvaluator(message, index, messages);
        return {
            preserve: shouldPreserve,
            reason: shouldPreserve
                ? 'Custom evaluator: preserve'
                : 'Custom evaluator: filter',
        };
    }
    if (contextual.recentInteractionCount &&
        index >= messages.length - contextual.recentInteractionCount) {
        return { preserve: true, reason: 'Within recent interaction count' };
    }
    if (contextual.preserveKeywords?.length) {
        const hasKeyword = message.parts.some((part) => {
            if (part.type === 'text') {
                const textPart = part;
                return contextual.preserveKeywords.some((keyword) => textPart.text.toLowerCase().includes(keyword.toLowerCase()));
            }
            return false;
        });
        if (hasKeyword) {
            return { preserve: true, reason: 'Contains preserve keyword' };
        }
    }
    if (contextual.preservePatterns?.length) {
        const matchesPattern = message.parts.some((part) => {
            if (part.type === 'text') {
                const textPart = part;
                return contextual.preservePatterns.some((pattern) => pattern.test(textPart.text));
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
function evaluateMessagePreservation(message, index, messages, options) {
    const strategy = options.strategy || 'semantic';
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
    switch (strategy) {
        case 'full':
            preserve = true;
            reason = 'Full preservation strategy';
            break;
        case 'minimal':
            preserve = message.parts.some((part) => part.type === 'text' || part.type === 'tool-call');
            reason = preserve ? 'Has essential content' : 'No essential content';
            break;
        case 'content-only':
            preserve = message.parts.some((part) => part.type === 'text');
            reason = preserve ? 'Has text content' : 'No text content';
            break;
        case 'semantic':
            const contextResult = evaluateContextualPreservation(message, index, messages, options);
            preserve = contextResult.preserve;
            reason = contextResult.reason;
            break;
        case 'custom':
            if (options.validator) {
                preserve = options.validator(message);
                reason = preserve
                    ? 'Custom validator: preserve'
                    : 'Custom validator: filter';
            }
            break;
    }
    if (options.performance?.enableCaching) {
        preservationCache.set(cacheKey, preserve);
        if (preservationCache.size > (options.performance.maxCacheSize || 1000)) {
            const keysToDelete = Array.from(preservationCache.keys()).slice(0, 100);
            keysToDelete.forEach((key) => preservationCache.delete(key));
        }
    }
    return { preserve, reason, strategy };
}
export function preserveMessageStructure(messages, options = {}) {
    const startTime = Date.now();
    const fullOptions = createMessageStructureOptions(options);
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
    const preserved = [];
    const filtered = [];
    const warnings = [];
    const debugDecisions = [];
    for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        try {
            const evaluation = evaluateMessagePreservation(message, i, messages, fullOptions);
            if (fullOptions.debug) {
                debugDecisions.push({
                    messageId: message.id,
                    preserved: evaluation.preserve,
                    reason: evaluation.reason,
                    strategy: evaluation.strategy,
                });
            }
            if (evaluation.preserve) {
                const transformedParts = message.parts
                    .filter((part) => shouldPreservePart(part, fullOptions.partRules || {}))
                    .map((part) => transformMessageContent(part, fullOptions));
                if (transformedParts.length > 0) {
                    preserved.push({
                        ...message,
                        parts: transformedParts,
                    });
                }
                else {
                    filtered.push(message);
                    warnings.push(`Message ${message.id} preserved but has no valid parts after filtering`);
                }
            }
            else {
                filtered.push(message);
            }
        }
        catch (error) {
            filtered.push(message);
            warnings.push(`Error processing message ${message.id}: ${error}`);
            if (fullOptions.debug) {
                log((l) => l.warn('Message preservation error', {
                    messageId: message.id,
                    error: error instanceof Error ? error.message : String(error),
                }));
            }
        }
    }
    const result = {
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
    if (fullOptions.debug) {
        log((l) => l.debug('Message structure preservation completed', {
            originalCount: messages.length,
            preservedCount: preserved.length,
            filteredCount: filtered.length,
            processingTimeMs: result.stats.processingTimeMs,
            strategy: fullOptions.strategy,
        }));
    }
    return result;
}
export function validateMessageStructureOptions(options) {
    const errors = [];
    const validStrategies = [
        'full',
        'content-only',
        'semantic',
        'minimal',
        'custom',
    ];
    if (options.strategy && !validStrategies.includes(options.strategy)) {
        errors.push(`Invalid strategy: ${options.strategy}. Must be one of: ${validStrategies.join(', ')}`);
    }
    if (options.performance) {
        const perf = options.performance;
        if (perf.cacheTtlMs !== undefined && perf.cacheTtlMs <= 0) {
            errors.push('cacheTtlMs must be positive');
        }
        if (perf.maxCacheSize !== undefined && perf.maxCacheSize <= 0) {
            errors.push('maxCacheSize must be positive');
        }
    }
    if (options.contentTransformation) {
        const content = options.contentTransformation;
        if (content.maxContentLength !== undefined &&
            content.maxContentLength <= 0) {
            errors.push('maxContentLength must be positive');
        }
    }
    if (options.contextual) {
        const contextual = options.contextual;
        if (contextual.recentInteractionCount !== undefined &&
            contextual.recentInteractionCount <= 0) {
            errors.push('recentInteractionCount must be positive');
        }
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
export function createPresetConfiguration(preset) {
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
                    cacheTtlMs: 600000,
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
//# sourceMappingURL=message-structure-preservation.js.map