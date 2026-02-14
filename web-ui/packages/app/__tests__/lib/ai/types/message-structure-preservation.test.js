import { createMessageStructureOptions, isPreservationEnabled, hasMessageStructureOptions, } from '@/lib/ai/types/message-structure-preservation';
import { preserveMessageStructure, validateMessageStructureOptions, createPresetConfiguration, clearPreservationCache, getPreservationCacheStats, } from '@/lib/ai/utils/message-structure-preservation';
describe('Message Structure Preservation Interface', () => {
    describe('MessageStructureOptions Interface', () => {
        it('should create default options', () => {
            const options = createMessageStructureOptions();
            expect(options.enabled).toBe(true);
            expect(options.strategy).toBe('semantic');
            expect(options.partRules?.text).toBe(true);
            expect(options.metadata?.timestamps).toBe(true);
            expect(options.performance?.enableCaching).toBe(true);
        });
        it('should merge partial options with defaults', () => {
            const customOptions = createMessageStructureOptions({
                strategy: 'minimal',
                partRules: {
                    text: true,
                    toolCall: false,
                },
                debug: true,
            });
            expect(customOptions.strategy).toBe('minimal');
            expect(customOptions.partRules?.text).toBe(true);
            expect(customOptions.partRules?.toolCall).toBe(false);
            expect(customOptions.partRules?.toolResult).toBe(true);
            expect(customOptions.debug).toBe(true);
            expect(customOptions.performance?.enableCaching).toBe(true);
        });
        it('should validate deep merging of nested options', () => {
            const options = createMessageStructureOptions({
                metadata: {
                    timestamps: false,
                    userIds: true,
                },
                performance: {
                    enableCaching: false,
                },
            });
            expect(options.metadata?.timestamps).toBe(false);
            expect(options.metadata?.userIds).toBe(true);
            expect(options.metadata?.messageIds).toBe(true);
            expect(options.performance?.enableCaching).toBe(false);
            expect(options.performance?.cacheTtlMs).toBe(300000);
        });
    });
    describe('Type Guards', () => {
        it('should identify objects with message structure options', () => {
            const objWithOptions = {
                messageStructure: createMessageStructureOptions(),
                otherProp: 'value',
            };
            const objWithoutOptions = {
                otherProp: 'value',
            };
            expect(hasMessageStructureOptions(objWithOptions)).toBe(true);
            expect(hasMessageStructureOptions(objWithoutOptions)).toBe(false);
            expect(hasMessageStructureOptions(null)).toBe(false);
            expect(hasMessageStructureOptions(undefined)).toBe(false);
        });
        it('should check if preservation is enabled', () => {
            expect(isPreservationEnabled({ enabled: true })).toBe(true);
            expect(isPreservationEnabled({ enabled: false })).toBe(false);
            expect(isPreservationEnabled({})).toBe(true);
        });
    });
    describe('Option Validation', () => {
        it('should validate valid options', () => {
            const options = {
                strategy: 'semantic',
                performance: {
                    cacheTtlMs: 300000,
                    maxCacheSize: 1000,
                },
                contentTransformation: {
                    maxContentLength: 2000,
                },
                contextual: {
                    recentInteractionCount: 5,
                },
            };
            const result = validateMessageStructureOptions(options);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        it('should catch invalid strategy', () => {
            const options = {
                strategy: 'invalid-strategy',
            };
            const result = validateMessageStructureOptions(options);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Invalid strategy: invalid-strategy. Must be one of: full, content-only, semantic, minimal, custom');
        });
        it('should catch invalid performance options', () => {
            const options = {
                performance: {
                    cacheTtlMs: -1,
                    maxCacheSize: 0,
                },
            };
            const result = validateMessageStructureOptions(options);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('cacheTtlMs must be positive');
            expect(result.errors).toContain('maxCacheSize must be positive');
        });
        it('should catch invalid content transformation options', () => {
            const options = {
                contentTransformation: {
                    maxContentLength: -100,
                },
            };
            const result = validateMessageStructureOptions(options);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('maxContentLength must be positive');
        });
        it('should catch invalid contextual options', () => {
            const options = {
                contextual: {
                    recentInteractionCount: -1,
                },
            };
            const result = validateMessageStructureOptions(options);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('recentInteractionCount must be positive');
        });
    });
    describe('Preset Configurations', () => {
        it('should create minimal preset', () => {
            const preset = createPresetConfiguration('minimal');
            expect(preset.strategy).toBe('minimal');
            expect(preset.partRules?.text).toBe(true);
            expect(preset.partRules?.toolCall).toBe(false);
            expect(preset.performance?.enableCaching).toBe(false);
        });
        it('should create balanced preset', () => {
            const preset = createPresetConfiguration('balanced');
            expect(preset.strategy).toBe('semantic');
            expect(preset.contextual?.recentInteractionCount).toBe(3);
            expect(preset.contentTransformation?.maxContentLength).toBe(1000);
        });
        it('should create comprehensive preset', () => {
            const preset = createPresetConfiguration('comprehensive');
            expect(preset.strategy).toBe('full');
            expect(preset.debug).toBe(true);
            expect(preset.performance?.enableCaching).toBe(true);
            expect(preset.performance?.enableAsyncProcessing).toBe(true);
        });
        it('should create performance preset', () => {
            const preset = createPresetConfiguration('performance');
            expect(preset.strategy).toBe('content-only');
            expect(preset.performance?.enableCaching).toBe(true);
            expect(preset.performance?.cacheTtlMs).toBe(600000);
            expect(preset.contentTransformation?.maxContentLength).toBe(500);
        });
    });
});
describe('Message Structure Preservation Utilities', () => {
    const createTestMessage = (id, role, text, additionalParts = []) => ({
        id,
        role,
        parts: [{ type: 'text', text }, ...additionalParts],
    });
    beforeEach(() => {
        clearPreservationCache();
    });
    describe('Basic Message Preservation', () => {
        it('should preserve all messages when disabled', () => {
            const messages = [
                createTestMessage('1', 'user', 'Hello'),
                createTestMessage('2', 'assistant', 'Hi there'),
            ];
            const result = preserveMessageStructure(messages, { enabled: false });
            expect(result.preserved).toHaveLength(2);
            expect(result.filtered).toHaveLength(0);
            expect(result.stats.originalCount).toBe(2);
            expect(result.stats.preservedCount).toBe(2);
            expect(result.warnings).toContain('Preservation is disabled - returning all messages');
        });
        it('should preserve all messages with full strategy', () => {
            const messages = [
                createTestMessage('1', 'user', 'Hello'),
                createTestMessage('2', 'assistant', 'Hi there'),
            ];
            const result = preserveMessageStructure(messages, { strategy: 'full' });
            expect(result.preserved).toHaveLength(2);
            expect(result.filtered).toHaveLength(0);
            expect(result.stats.originalCount).toBe(2);
            expect(result.stats.preservedCount).toBe(2);
        });
        it('should filter messages with minimal strategy', () => {
            const messages = [
                createTestMessage('1', 'user', 'Hello'),
                createTestMessage('2', 'assistant', 'Hi there'),
                {
                    id: '3',
                    role: 'system',
                    parts: [{ type: 'data-image', data: { alt: 'An image' } }],
                },
            ];
            const result = preserveMessageStructure(messages, {
                strategy: 'minimal',
            });
            expect(result.preserved).toHaveLength(2);
            expect(result.filtered).toHaveLength(1);
        });
        it('should preserve only text content with content-only strategy', () => {
            const messages = [
                createTestMessage('1', 'user', 'Hello'),
                {
                    id: '2',
                    role: 'assistant',
                    parts: [
                        {
                            type: 'tool-test',
                            toolCallId: 'call_123',
                            state: 'input-streaming',
                            input: {},
                        },
                    ],
                },
                createTestMessage('3', 'user', 'World'),
            ];
            const result = preserveMessageStructure(messages, {
                strategy: 'content-only',
            });
            expect(result.preserved).toHaveLength(2);
            expect(result.filtered).toHaveLength(1);
        });
    });
    describe('Contextual Preservation', () => {
        it('should preserve recent interactions', () => {
            const messages = Array.from({ length: 10 }, (_, i) => createTestMessage(`${i + 1}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i + 1}`));
            const result = preserveMessageStructure(messages, {
                strategy: 'semantic',
                contextual: {
                    recentInteractionCount: 3,
                },
            });
            expect(result.preserved).toHaveLength(3);
            expect(result.filtered).toHaveLength(7);
        });
        it('should preserve messages with keywords', () => {
            const messages = [
                createTestMessage('1', 'user', 'Hello world'),
                createTestMessage('2', 'assistant', 'How can I help?'),
                createTestMessage('3', 'user', 'This is important information'),
                createTestMessage('4', 'assistant', 'Got it'),
            ];
            const result = preserveMessageStructure(messages, {
                strategy: 'semantic',
                contextual: {
                    recentInteractionCount: 1,
                    preserveKeywords: ['important'],
                },
            });
            expect(result.preserved).toHaveLength(2);
            expect(result.preserved.some((msg) => msg.id === '3')).toBe(true);
            expect(result.preserved.some((msg) => msg.id === '4')).toBe(true);
        });
        it('should preserve messages matching patterns', () => {
            const messages = [
                createTestMessage('1', 'user', 'Hello world'),
                createTestMessage('2', 'assistant', 'ERROR: Something went wrong'),
                createTestMessage('3', 'user', 'What happened?'),
            ];
            const result = preserveMessageStructure(messages, {
                strategy: 'semantic',
                contextual: {
                    recentInteractionCount: 1,
                    preservePatterns: [/ERROR:/],
                },
            });
            expect(result.preserved).toHaveLength(2);
            expect(result.preserved.some((msg) => msg.id === '2')).toBe(true);
            expect(result.preserved.some((msg) => msg.id === '3')).toBe(true);
        });
        it('should use custom context evaluator', () => {
            const messages = [
                createTestMessage('1', 'user', 'Hello'),
                createTestMessage('2', 'assistant', 'Hi'),
                createTestMessage('3', 'user', 'Goodbye'),
            ];
            const result = preserveMessageStructure(messages, {
                strategy: 'semantic',
                contextual: {
                    contextEvaluator: (message) => message.role === 'user',
                },
            });
            expect(result.preserved).toHaveLength(2);
            expect(result.preserved.every((msg) => msg.role === 'user')).toBe(true);
        });
    });
    describe('Content Transformation', () => {
        it('should truncate long content', () => {
            const longText = 'A'.repeat(1000);
            const messages = [createTestMessage('1', 'user', longText)];
            const result = preserveMessageStructure(messages, {
                contentTransformation: {
                    maxContentLength: 100,
                    truncateContent: true,
                    truncationSuffix: '...',
                },
            });
            const preservedText = result.preserved[0].parts[0]
                .text;
            expect(preservedText.length).toBe(103);
            expect(preservedText.endsWith('...')).toBe(true);
        });
        it('should use custom content transformer', () => {
            const messages = [createTestMessage('1', 'user', 'hello world')];
            const result = preserveMessageStructure(messages, {
                contentTransformation: {
                    contentTransformer: (text) => text.toUpperCase(),
                },
            });
            const preservedText = result.preserved[0].parts[0]
                .text;
            expect(preservedText).toBe('HELLO WORLD');
        });
    });
    describe('Part Filtering', () => {
        it('should filter parts based on rules', () => {
            const messages = [
                {
                    id: '1',
                    role: 'assistant',
                    parts: [
                        { type: 'text', text: 'Hello' },
                        {
                            type: 'tool-call',
                            toolCallId: 'call_123',
                            state: 'input-streaming',
                            input: {},
                        },
                        { type: 'data-image', data: { alt: 'An image' } },
                    ],
                },
            ];
            const result = preserveMessageStructure(messages, {
                partRules: {
                    text: true,
                    toolCall: false,
                    file: false,
                },
            });
            expect(result.preserved[0].parts).toHaveLength(1);
            expect(result.preserved[0].parts[0].type).toBe('text');
        });
    });
    describe('Custom Validation', () => {
        it('should use custom validator', () => {
            const messages = [
                createTestMessage('1', 'user', 'Hello'),
                createTestMessage('2', 'assistant', 'Hi'),
                createTestMessage('3', 'system', 'System message'),
            ];
            const result = preserveMessageStructure(messages, {
                strategy: 'custom',
                validator: (message) => message.role !== 'system',
            });
            expect(result.preserved).toHaveLength(2);
            expect(result.preserved.every((msg) => msg.role !== 'system')).toBe(true);
        });
    });
    describe('Performance and Caching', () => {
        it('should cache preservation decisions', () => {
            const messages = [createTestMessage('1', 'user', 'Hello')];
            const options = {
                performance: { enableCaching: true },
            };
            preserveMessageStructure(messages, options);
            const stats1 = getPreservationCacheStats();
            expect(stats1.misses).toBeGreaterThan(0);
            preserveMessageStructure(messages, options);
            const stats2 = getPreservationCacheStats();
            expect(stats2.hits).toBeGreaterThan(stats1.hits);
        });
        it('should track cache statistics', () => {
            const stats = getPreservationCacheStats();
            expect(stats).toHaveProperty('size');
            expect(stats).toHaveProperty('hits');
            expect(stats).toHaveProperty('misses');
            expect(stats).toHaveProperty('hitRate');
            expect(stats).toHaveProperty('ageMs');
        });
    });
    describe('Debug Information', () => {
        it('should provide debug information when enabled', () => {
            const messages = [
                createTestMessage('1', 'user', 'Hello'),
                createTestMessage('2', 'assistant', 'Hi'),
            ];
            const result = preserveMessageStructure(messages, { debug: true });
            expect(result.debugInfo).toBeDefined();
            expect(result.debugInfo?.decisions).toHaveLength(2);
            expect(result.debugInfo?.decisions[0]).toHaveProperty('messageId');
            expect(result.debugInfo?.decisions[0]).toHaveProperty('preserved');
            expect(result.debugInfo?.decisions[0]).toHaveProperty('reason');
            expect(result.debugInfo?.decisions[0]).toHaveProperty('strategy');
        });
    });
    describe('Error Handling', () => {
        it('should handle invalid messages gracefully', () => {
            const invalidMessage = {
                id: '1',
                role: 'user',
                parts: null,
            };
            const result = preserveMessageStructure([invalidMessage]);
            expect(result.filtered).toHaveLength(1);
            expect(result.warnings).toBeDefined();
            expect(result.warnings?.[0]).toContain('Error processing message');
        });
        it('should handle validator errors gracefully', () => {
            const messages = [createTestMessage('1', 'user', 'Hello')];
            const result = preserveMessageStructure(messages, {
                strategy: 'custom',
                validator: () => {
                    throw new Error('Validator error');
                },
                debug: true,
            });
            expect(result.filtered).toHaveLength(1);
            expect(result.warnings).toBeDefined();
        });
    });
    describe('Statistics and Metrics', () => {
        it('should provide accurate statistics', () => {
            const messages = Array.from({ length: 10 }, (_, i) => createTestMessage(`${i + 1}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i + 1}`));
            const result = preserveMessageStructure(messages, {
                strategy: 'semantic',
                contextual: { recentInteractionCount: 3 },
            });
            expect(result.stats.originalCount).toBe(10);
            expect(result.stats.preservedCount).toBe(3);
            expect(result.stats.filteredCount).toBe(7);
            expect(result.stats.processingTimeMs).toBeGreaterThanOrEqual(0);
        });
        it('should include cache statistics when caching is enabled', () => {
            const messages = [createTestMessage('1', 'user', 'Hello')];
            const result = preserveMessageStructure(messages, {
                performance: { enableCaching: true },
            });
            expect(result.stats).toHaveProperty('cacheHits');
            expect(result.stats).toHaveProperty('cacheMisses');
        });
    });
});
//# sourceMappingURL=message-structure-preservation.test.js.map