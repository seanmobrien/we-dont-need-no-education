import {
    DEFAULT_MESSAGE_STRUCTURE_OPTIONS,
    clearPreservationCache,
    createMessageStructureOptions,
    createPresetConfiguration,
    getPreservationCacheStats,
    hasMessageStructureOptions,
    isPreservationEnabled,
    preserveMessageStructure,
    validateMessageStructureOptions,
} from '../../src/lib/ai/message-structure-preservation';

type TestMessage = {
    id: string;
    role: string;
    parts: Array<Record<string, unknown>>;
};

const textPart = (text: string): Record<string, unknown> => ({
    type: 'text',
    text,
});

const toolCallPart = (): Record<string, unknown> => ({
    type: 'tool-call',
    toolName: 'lookup',
});

const toolResultPart = (): Record<string, unknown> => ({
    type: 'tool-result',
    toolName: 'lookup',
});

const unknownPart = (): Record<string, unknown> => ({
    type: 'dynamic-unknown',
});

const message = (id: string, parts: Array<Record<string, unknown>>): TestMessage => ({
    id,
    role: 'user',
    parts,
});

describe('lib/ai/message-structure-preservation', () => {
    beforeEach(() => {
        clearPreservationCache();
    });

    it('hasMessageStructureOptions detects valid option container', () => {
        expect(hasMessageStructureOptions({ messageStructure: {} })).toBe(true);
        expect(hasMessageStructureOptions({ messageStructure: null })).toBe(true);
        expect(hasMessageStructureOptions({})).toBe(false);
        expect(hasMessageStructureOptions(null)).toBe(false);
    });

    it('isPreservationEnabled defaults true and honors explicit false', () => {
        expect(isPreservationEnabled({})).toBe(true);
        expect(isPreservationEnabled({ enabled: true })).toBe(true);
        expect(isPreservationEnabled({ enabled: false })).toBe(false);
    });

    it('createMessageStructureOptions merges nested options with defaults', () => {
        const options = createMessageStructureOptions({
            strategy: 'minimal',
            partRules: { text: false, dynamic: true },
            metadata: { messageIds: false },
            performance: { maxCacheSize: 7 },
        });

        expect(options.strategy).toBe('minimal');
        expect(options.partRules?.text).toBe(false);
        expect(options.partRules?.dynamic).toBe(true);
        expect(options.partRules?.toolCall).toBe(true);
        expect(options.metadata?.messageIds).toBe(false);
        expect(options.metadata?.timestamps).toBe(true);
        expect(options.performance?.maxCacheSize).toBe(7);
        expect(options.performance?.enableCaching).toBe(true);
    });

    it('validates options and reports invalid values', () => {
        const valid = validateMessageStructureOptions({
            strategy: 'semantic',
            performance: { cacheTtlMs: 1, maxCacheSize: 1 },
            contentTransformation: { maxContentLength: 1 },
            contextual: { recentInteractionCount: 1 },
        });
        expect(valid.valid).toBe(true);
        expect(valid.errors).toEqual([]);

        const invalid = validateMessageStructureOptions({
            strategy: 'invalid-strategy' as never,
            performance: { cacheTtlMs: 0, maxCacheSize: 0 },
            contentTransformation: { maxContentLength: 0 },
            contextual: { recentInteractionCount: 0 },
        });

        expect(invalid.valid).toBe(false);
        expect(invalid.errors.join(' | ')).toContain('Invalid strategy: invalid-strategy');
        expect(invalid.errors).toContain('cacheTtlMs must be positive');
        expect(invalid.errors).toContain('maxCacheSize must be positive');
        expect(invalid.errors).toContain('maxContentLength must be positive');
        expect(invalid.errors).toContain('recentInteractionCount must be positive');
    });

    it('returns all messages when preservation is disabled', () => {
        const messages = [message('m1', [textPart('alpha')])];

        const result = preserveMessageStructure(messages as never, { enabled: false });

        expect(result.preserved).toEqual(messages);
        expect(result.filtered).toEqual([]);
        expect(result.stats.originalCount).toBe(1);
        expect(result.stats.preservedCount).toBe(1);
        expect(result.warnings?.[0]).toContain('Preservation is disabled');
    });

    it('supports minimal and content-only strategies', () => {
        const messages = [
            message('essential', [toolCallPart()]),
            message('non-essential', [unknownPart()]),
            message('textual', [textPart('content')]),
        ];

        const minimal = preserveMessageStructure(messages as never, {
            strategy: 'minimal',
        });
        expect(minimal.preserved.map((m) => m.id)).toEqual(['essential', 'textual']);
        expect(minimal.filtered.map((m) => m.id)).toEqual(['non-essential']);

        const contentOnly = preserveMessageStructure(messages as never, {
            strategy: 'content-only',
        });
        expect(contentOnly.preserved.map((m) => m.id)).toContain('textual');
        expect(contentOnly.preserved.map((m) => m.id)).not.toContain('non-essential');

        const contentOnlyNoText = preserveMessageStructure(
            [message('no-text', [toolCallPart(), toolResultPart()])] as never,
            { strategy: 'content-only' }
        );
        expect(contentOnlyNoText.preserved).toEqual([]);
        expect(contentOnlyNoText.filtered.map((m) => m.id)).toEqual(['no-text']);
    });

    it('supports semantic contextual evaluation by recency, keyword, and regex', () => {
        const messages = [
            message('m1', [textPart('regular text')]),
            message('m2', [textPart('contains preserve keyword')]),
            message('m3', [textPart('pattern: KEEP-ME')]),
            message('m4', [textPart('recent entry')]),
        ];

        const result = preserveMessageStructure(messages as never, {
            strategy: 'semantic',
            contextual: {
                recentInteractionCount: 1,
                preserveKeywords: ['preserve keyword'],
                preservePatterns: [/KEEP-ME/],
            },
            debug: true,
        });

        expect(result.preserved.map((m) => m.id)).toEqual(['m2', 'm3', 'm4']);
        expect(result.filtered.map((m) => m.id)).toEqual(['m1']);
        expect(result.debugInfo?.decisions.length).toBe(4);
    });

    it('supports custom strategy validator and captures validator errors', () => {
        const messages = [
            message('ok', [textPart('ok')]),
            message('boom', [textPart('boom')]),
        ];

        const result = preserveMessageStructure(messages as never, {
            strategy: 'custom',
            validator: (msg) => {
                if (msg.id === 'boom') {
                    throw new Error('validator explosion');
                }
                return true;
            },
        });

        expect(result.preserved.map((m) => m.id)).toEqual(['ok']);
        expect(result.filtered.map((m) => m.id)).toEqual(['boom']);
        expect(result.warnings?.join(' | ')).toContain('validator explosion');
    });

    it('transforms content with custom transformer and truncation', () => {
        const messages = [message('m1', [textPart('abcdefg')])];

        const result = preserveMessageStructure(messages as never, {
            strategy: 'full',
            contentTransformation: {
                contentTransformer: (text) => text.toUpperCase(),
                maxContentLength: 4,
                truncateContent: true,
                truncationSuffix: '..',
            },
        });

        const part = result.preserved[0]?.parts[0] as { text: string };
        expect(part.text).toBe('ABCD..');
    });

    it('uses summarizeContent branch when enabled', () => {
        const messages = [message('m-summary', [textPart('abcdefghij')])];

        const result = preserveMessageStructure(messages as never, {
            strategy: 'full',
            contentTransformation: {
                maxContentLength: 6,
                summarizeContent: true,
                truncationSuffix: '~~',
            },
        });

        const part = result.preserved[0]?.parts[0] as { text: string };
        expect(part.text).toBe('abc~~');
    });

    it('filters parts by rules and emits warning when none remain', () => {
        const messages = [message('m1', [textPart('x'), toolResultPart()])];

        const result = preserveMessageStructure(messages as never, {
            strategy: 'full',
            partRules: {
                text: false,
                toolResult: false,
            },
        });

        expect(result.preserved).toEqual([]);
        expect(result.filtered.map((m) => m.id)).toEqual(['m1']);
        expect(result.warnings?.join(' | ')).toContain('has no valid parts');
    });

    it('tracks cache hit/miss statistics and supports cache reset', () => {
        const messages = [message('m-cache', [textPart('cache me')])];

        const first = preserveMessageStructure(messages as never, {
            strategy: 'semantic',
            performance: {
                enableCaching: true,
                maxCacheSize: 5,
            },
        });
        expect(first.stats.cacheMisses).toBeGreaterThanOrEqual(1);

        const second = preserveMessageStructure(messages as never, {
            strategy: 'semantic',
            performance: {
                enableCaching: true,
                maxCacheSize: 5,
            },
        });
        expect(second.stats.cacheHits).toBeGreaterThanOrEqual(1);

        const statsBeforeClear = getPreservationCacheStats();
        expect(statsBeforeClear.size).toBeGreaterThan(0);

        clearPreservationCache();
        const statsAfterClear = getPreservationCacheStats();
        expect(statsAfterClear.size).toBe(0);
        expect(statsAfterClear.hits).toBe(0);
        expect(statsAfterClear.misses).toBe(0);
    });

    it('evicts cache entries when maxCacheSize threshold is exceeded', () => {
        const manyMessages = Array.from({ length: 120 }, (_, i) =>
            message(`m-${i}`, [textPart(`value-${i}`)])
        );

        preserveMessageStructure(manyMessages as never, {
            strategy: 'semantic',
            performance: {
                enableCaching: true,
                maxCacheSize: 50,
            },
        });

        const stats = getPreservationCacheStats();
        expect(stats.size).toBeLessThanOrEqual(100);
    });

    it('creates expected preset configurations', () => {
        const minimal = createPresetConfiguration('minimal');
        expect(minimal.strategy).toBe('minimal');
        expect(minimal.partRules?.toolCall).toBe(false);

        const balanced = createPresetConfiguration('balanced');
        expect(balanced.strategy).toBe('semantic');
        expect(balanced.contextual?.recentInteractionCount).toBe(3);

        const comprehensive = createPresetConfiguration('comprehensive');
        expect(comprehensive.strategy).toBe('full');
        expect(comprehensive.debug).toBe(true);
        expect(comprehensive.performance?.enableAsyncProcessing).toBe(true);

        const performance = createPresetConfiguration('performance');
        expect(performance.strategy).toBe('content-only');
        expect(performance.performance?.cacheTtlMs).toBe(600000);

        const fallback = createPresetConfiguration('not-a-preset' as never);
        expect(fallback.strategy).toBe('semantic');

        expect(DEFAULT_MESSAGE_STRUCTURE_OPTIONS.strategy).toBe('semantic');
    });
});