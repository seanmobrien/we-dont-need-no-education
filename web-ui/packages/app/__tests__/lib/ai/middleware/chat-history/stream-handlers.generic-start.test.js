import { ensureCreateResult } from '@/lib/ai/middleware/chat-history/stream-handler-result';
import { processStreamChunk } from '@/lib/ai/middleware/chat-history/stream-handlers';
const makeContext = (overrides = {}) => ensureCreateResult({
    chatId: 'chat-1',
    turnId: 1,
    messageId: undefined,
    currentMessageOrder: 1,
    generatedText: '',
    generatedJSON: [],
    toolCalls: new Map(),
    ...overrides,
});
describe('processStreamChunk generic *-start handling', () => {
    test('unknown "*-start" chunk is appended to generatedText (fallback), not pushed to generatedJSON', async () => {
        const context = makeContext();
        const chunk = {
            type: 'mybag-start',
            id: 'abc123',
            prop1: 'value1',
            nested: { a: 1 },
        };
        await processStreamChunk(chunk, context);
        expect(context.generatedJSON.length).toBe(0);
        expect(context.generatedText).toContain('mybag-start');
        expect(context.generatedText).toContain('abc123');
    });
    test('tool-input-start opens streaming object and does not immediately close', async () => {
        const context = makeContext();
        const chunk = {
            type: 'tool-input-start',
            id: 'tool-1',
            toolName: 'search',
        };
        await processStreamChunk(chunk, context);
        expect(context.generatedJSON.length).toBe(0);
    });
    test('tool-input-delta appends raw delta into open input', async () => {
        const context = makeContext();
        await processStreamChunk({
            type: 'tool-input-start',
            id: 'tool-1',
            toolName: 'calc',
        }, context);
        await processStreamChunk({ type: 'tool-input-start', toolName: 'tool', id: 'tool-2' }, context);
        await processStreamChunk({
            type: 'tool-input-delta',
            id: 'tool-2',
            delta: '{"a":',
        }, context);
        await processStreamChunk({
            type: 'tool-input-delta',
            id: 'tool-2',
            delta: '1}',
        }, context);
        await processStreamChunk({ type: 'tool-input-end', id: 'tool-2' }, context);
        await processStreamChunk({ type: 'tool-input-end', id: 'tool-1' }, context);
        expect(context.generatedJSON.length).toBe(1);
        expect(context.generatedJSON[0]).toMatchObject({
            type: 'tool-input',
            id: 'tool-2',
            toolName: 'tool',
            input: { a: 1 },
        });
        const first = context.generatedJSON[0];
        expect(first.input).toEqual({ a: 1 });
    });
});
//# sourceMappingURL=stream-handlers.generic-start.test.js.map