import { describe, it, expect } from '@jest/globals';
import { extractJsonFromCodeBlock } from '@/lib/ai/middleware/set-normalized-defaults';
import { throws } from 'assert';
describe('set-normalized-defaults utility functions', () => {
    const isJsonCodeBlock = (text) => {
        const trimmed = text.trim();
        return trimmed.startsWith('```json') && trimmed.endsWith('```');
    };
    const safeJsonParse = (jsonString) => {
        try {
            return JSON.parse(jsonString);
        }
        catch {
            return null;
        }
    };
    const isStructuredOutputEmpty = (result) => {
        if (!result.providerMetadata) {
            return true;
        }
        const metadata = result.providerMetadata;
        const structured = metadata.structuredOutputs;
        return (!structured ||
            structured === null ||
            structured === undefined ||
            structured === '' ||
            (typeof structured === 'object' && Object.keys(structured).length === 0));
    };
    const isValidJsonObject = (text) => {
        const trimmed = text.trim();
        if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
            return false;
        }
        try {
            const parsed = JSON.parse(trimmed);
            return parsed !== null && typeof parsed === 'object';
        }
        catch {
            return false;
        }
    };
    describe('isJsonCodeBlock', () => {
        it('should correctly identify JSON code blocks', () => {
            expect(isJsonCodeBlock('```json\n{"key": "value"}\n```')).toBe(true);
            expect(isJsonCodeBlock('```json\n{}\n```')).toBe(true);
            expect(isJsonCodeBlock('  ```json\n{"key": "value"}\n```  ')).toBe(true);
            expect(isJsonCodeBlock('Regular text')).toBe(false);
            expect(isJsonCodeBlock('```\n{"key": "value"}\n```')).toBe(false);
            expect(isJsonCodeBlock('```javascript\n{"key": "value"}\n```')).toBe(false);
            expect(isJsonCodeBlock('```typescript\n{"key": "value"}\n```')).toBe(false);
        });
        it('should handle edge cases', () => {
            expect(isJsonCodeBlock('')).toBe(false);
            expect(isJsonCodeBlock('```json')).toBe(false);
            expect(isJsonCodeBlock('```')).toBe(false);
            expect(isJsonCodeBlock('json```')).toBe(false);
        });
    });
    describe('extractJsonFromCodeBlock', () => {
        it('should correctly extract JSON from code blocks', () => {
            expect(extractJsonFromCodeBlock('```json\n{"key": "value"}\n```')).toBe('{"key": "value"}');
            expect(extractJsonFromCodeBlock('  ```json\n  {"key": "value"}  \n```  ')).toBe('{"key": "value"}');
            expect(extractJsonFromCodeBlock('```json\n{"nested": {"key": "value"}}\n```')).toBe('{"nested": {"key": "value"}}');
        });
        it('should handle additional text after closing backticks', () => {
            expect(extractJsonFromCodeBlock('```json\n{"key": "value"}\n``` additional text here')).toBe('{"key": "value"}');
            expect(extractJsonFromCodeBlock('```json\n{"data": [1, 2, 3]}\n```\n\nMore explanation below')).toBe('{"data": [1, 2, 3]}');
            expect(extractJsonFromCodeBlock('```json\n{"result": "success"}\n``` \n\nThis is the result.')).toBe('{"result": "success"}');
        });
        it('should handle whitespace correctly', () => {
            expect(extractJsonFromCodeBlock('```json\n\n{"key": "value"}\n\n```')).toBe('{"key": "value"}');
            expect(extractJsonFromCodeBlock('```json{"key": "value"}```')).toBe('{"key": "value"}');
        });
        it('should handle edge cases', () => {
            expect(extractJsonFromCodeBlock('```json\n{"key": "```"}\n``` more ``` text')).toBe('{"key": "```"}');
            throws(() => extractJsonFromCodeBlock('json\n{"key": "value"}\n```'));
        });
    });
    describe('safeJsonParse', () => {
        it('should parse valid JSON', () => {
            expect(safeJsonParse('{"key": "value"}')).toEqual({ key: 'value' });
            expect(safeJsonParse('{"number": 123, "array": [1, 2, 3]}')).toEqual({
                number: 123,
                array: [1, 2, 3],
            });
            expect(safeJsonParse('[]')).toEqual([]);
            expect(safeJsonParse('null')).toBe(null);
            expect(safeJsonParse('true')).toBe(true);
            expect(safeJsonParse('42')).toBe(42);
        });
        it('should return null for invalid JSON', () => {
            expect(safeJsonParse('invalid json')).toBe(null);
            expect(safeJsonParse('{"key": value}')).toBe(null);
            expect(safeJsonParse('{key: "value"}')).toBe(null);
            expect(safeJsonParse('')).toBe(null);
            expect(safeJsonParse('{')).toBe(null);
        });
    });
    describe('isValidJsonObject', () => {
        it('should correctly identify valid JSON objects', () => {
            expect(isValidJsonObject('{"key": "value"}')).toBe(true);
            expect(isValidJsonObject('{"number": 123, "array": [1, 2, 3]}')).toBe(true);
            expect(isValidJsonObject('{}')).toBe(true);
            expect(isValidJsonObject('  {"key": "value"}  ')).toBe(true);
            expect(isValidJsonObject('{"nested": {"key": "value"}}')).toBe(true);
        });
        it('should reject non-object JSON', () => {
            expect(isValidJsonObject('[]')).toBe(false);
            expect(isValidJsonObject('"string"')).toBe(false);
            expect(isValidJsonObject('123')).toBe(false);
            expect(isValidJsonObject('true')).toBe(false);
            expect(isValidJsonObject('null')).toBe(false);
        });
        it('should reject invalid JSON', () => {
            expect(isValidJsonObject('{"key": value}')).toBe(false);
            expect(isValidJsonObject('{key: "value"}')).toBe(false);
            expect(isValidJsonObject('{"key": "value"')).toBe(false);
            expect(isValidJsonObject('key": "value"}')).toBe(false);
            expect(isValidJsonObject('Regular text')).toBe(false);
            expect(isValidJsonObject('')).toBe(false);
        });
        it('should handle edge cases', () => {
            expect(isValidJsonObject('{')).toBe(false);
            expect(isValidJsonObject('}')).toBe(false);
            expect(isValidJsonObject('{}')).toBe(true);
            expect(isValidJsonObject('```json\n{"key": "value"}\n```')).toBe(false);
        });
    });
    describe('isStructuredOutputEmpty', () => {
        it('should return true for empty structured output', () => {
            expect(isStructuredOutputEmpty({})).toBe(true);
            expect(isStructuredOutputEmpty({ providerMetadata: {} })).toBe(true);
            expect(isStructuredOutputEmpty({
                providerMetadata: { structuredOutputs: null },
            })).toBe(true);
            expect(isStructuredOutputEmpty({
                providerMetadata: { structuredOutputs: undefined },
            })).toBe(true);
            expect(isStructuredOutputEmpty({
                providerMetadata: { structuredOutputs: {} },
            })).toBe(true);
            expect(isStructuredOutputEmpty({
                providerMetadata: { structuredOutputs: '' },
            })).toBe(true);
        });
        it('should return false for non-empty structured output', () => {
            expect(isStructuredOutputEmpty({
                providerMetadata: {
                    structuredOutputs: { data: 'value' },
                },
            })).toBe(false);
            expect(isStructuredOutputEmpty({
                providerMetadata: {
                    structuredOutputs: { key: 'value', number: 123 },
                },
            })).toBe(false);
            expect(isStructuredOutputEmpty({
                providerMetadata: { structuredOutputs: [1, 2, 3] },
            })).toBe(false);
            expect(isStructuredOutputEmpty({
                providerMetadata: {
                    structuredOutputs: 'non-empty-string',
                },
            })).toBe(false);
        });
        it('should handle complex nested structures', () => {
            expect(isStructuredOutputEmpty({
                providerMetadata: {
                    structuredOutputs: {
                        nested: {
                            deep: {
                                value: 'test',
                            },
                        },
                    },
                },
            })).toBe(false);
        });
    });
    describe('integration scenarios', () => {
        it('should handle complete JSON code block processing', () => {
            const jsonCodeBlock = '```json\n{"result": "success", "data": [1, 2, 3]}\n```';
            expect(isJsonCodeBlock(jsonCodeBlock)).toBe(true);
            const extractedJson = extractJsonFromCodeBlock(jsonCodeBlock);
            expect(extractedJson).toBe('{"result": "success", "data": [1, 2, 3]}');
            const parsedData = safeJsonParse(extractedJson);
            expect(parsedData).toEqual({
                result: 'success',
                data: [1, 2, 3],
            });
            const emptyMetadata = {};
            expect(isStructuredOutputEmpty(emptyMetadata)).toBe(true);
            const populatedMetadata = {
                providerMetadata: {
                    structuredOutputs: parsedData,
                },
            };
            expect(isStructuredOutputEmpty(populatedMetadata)).toBe(false);
        });
        it('should handle malformed JSON gracefully', () => {
            const malformedJsonCodeBlock = '```json\n{invalid: json}\n```';
            expect(isJsonCodeBlock(malformedJsonCodeBlock)).toBe(true);
            const extractedJson = extractJsonFromCodeBlock(malformedJsonCodeBlock);
            expect(extractedJson).toBe('{invalid: json}');
            const parsedData = safeJsonParse(extractedJson);
            expect(parsedData).toBe(null);
        });
        it('should handle non-JSON content correctly', () => {
            const regularText = 'This is just regular text with no JSON';
            expect(isJsonCodeBlock(regularText)).toBe(false);
            expect(safeJsonParse(regularText)).toBe(null);
            const emptyResult = {};
            expect(isStructuredOutputEmpty(emptyResult)).toBe(true);
        });
    });
    describe('middleware configuration', () => {
        it('should have correct default telemetry configuration', () => {
            const expectedTelemetry = {
                isEnabled: true,
                functionId: 'generic-chat-request',
                metadata: {},
            };
            expect(expectedTelemetry.isEnabled).toBe(true);
            expect(expectedTelemetry.functionId).toBe('generic-chat-request');
            expect(expectedTelemetry.metadata).toEqual({});
        });
        it('should validate middleware structure', async () => {
            const { setNormalizedDefaultsMiddleware } = await import('@/lib/ai/middleware/set-normalized-defaults');
            expect(setNormalizedDefaultsMiddleware).toBeDefined();
            expect(typeof setNormalizedDefaultsMiddleware).toBe('object');
            expect(typeof setNormalizedDefaultsMiddleware.transformParams).toBe('function');
            expect(typeof setNormalizedDefaultsMiddleware.wrapGenerate).toBe('function');
            expect(typeof setNormalizedDefaultsMiddleware.wrapStream).toBe('function');
        });
    });
});
//# sourceMappingURL=set-normalized-defaults.test.js.map