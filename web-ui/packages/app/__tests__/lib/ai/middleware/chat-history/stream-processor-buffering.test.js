import { PassthroughStreamProcessor } from '@/lib/ai/middleware/chat-history/passthrough-processor';
import { ensureCreateResult } from '@/lib/ai/middleware/chat-history/stream-handler-result';
jest.mock('@/lib/ai/middleware/chat-history/instrumentation', () => ({
    instrumentStreamChunk: jest.fn((type, context, operation) => operation()),
}));
describe('StreamProcessor', () => {
    let context;
    beforeEach(() => {
        context = ensureCreateResult({
            chatId: 'test-chat',
            turnId: 1,
            currentMessageOrder: 0,
            generatedText: '',
            generatedJSON: [],
            toolCalls: new Map(),
        });
    });
    describe('PassthroughStreamProcessor', () => {
        const processor = new PassthroughStreamProcessor();
        it('should buffer and assemble text-delta chunks', async () => {
            await processor.process({ type: 'text-start', id: '1' }, context);
            let res = await processor.process({ type: 'text-delta', id: '1', delta: 'Hello' }, context);
            context.generatedText = res.generatedText;
            res = await processor.process({ type: 'text-delta', id: '1', delta: ' World' }, context);
            context.generatedText = res.generatedText;
            expect(res.generatedText).toBe('Hello World');
            await processor.process({ type: 'text-end', id: '1' }, context);
            expect(context.generatedJSON).toHaveLength(1);
            expect(context.generatedJSON[0]).toEqual({ type: 'text', text: 'Hello World' });
        });
        it('should buffer and assemble reasoning-delta chunks', async () => {
            await processor.process({ type: 'reasoning-start', id: 'r1' }, context);
            await processor.process({ type: 'reasoning-delta', id: 'r1', delta: 'Thinking' }, context);
            await processor.process({ type: 'reasoning-delta', id: 'r1', delta: '...' }, context);
            await processor.process({ type: 'reasoning-end', id: 'r1' }, context);
            expect(context.generatedJSON).toHaveLength(1);
            expect(context.generatedJSON[0]).toEqual({ type: 'reasoning', text: 'Thinking...' });
        });
        it('should buffer and assemble tool-input chunks', async () => {
            await processor.process({ type: 'tool-input-start', id: 't1', toolName: 'test-tool' }, context);
            await processor.process({ type: 'tool-input-delta', id: 't1', delta: '{"arg":' }, context);
            await processor.process({ type: 'tool-input-delta', id: 't1', delta: '"val"}' }, context);
            await processor.process({ type: 'tool-input-end', id: 't1' }, context);
            expect(context.generatedJSON).toHaveLength(1);
            expect(context.generatedJSON[0]).toMatchObject({
                type: 'tool-input',
                id: 't1',
                toolName: 'test-tool',
                input: { arg: 'val' }
            });
        });
        it('should handle parallel separate buffers', async () => {
            await processor.process({ type: 'text-start', id: 'txt1' }, context);
            await processor.process({ type: 'reasoning-start', id: 'rsn1' }, context);
            await processor.process({ type: 'text-delta', id: 'txt1', delta: 'A' }, context);
            await processor.process({ type: 'reasoning-delta', id: 'rsn1', delta: '1' }, context);
            await processor.process({ type: 'text-delta', id: 'txt1', delta: 'B' }, context);
            await processor.process({ type: 'reasoning-delta', id: 'rsn1', delta: '2' }, context);
            await processor.process({ type: 'text-end', id: 'txt1' }, context);
            await processor.process({ type: 'reasoning-end', id: 'rsn1' }, context);
            expect(context.generatedJSON).toHaveLength(2);
            expect(context.generatedJSON.find(x => x.type === 'text')).toEqual({ type: 'text', text: 'AB' });
            expect(context.generatedJSON.find(x => x.type === 'reasoning')).toEqual({ type: 'reasoning', text: '12' });
        });
        it('should append unknown chunks to generatedText and JSON', async () => {
            const chunk = { type: 'unknown-chunk', data: 123 };
            const res = await processor.process(chunk, context);
            expect(res.generatedText).toContain(JSON.stringify(chunk));
            expect(context.generatedJSON).not.toContainEqual(chunk);
        });
        it('should store metadata chunks in JSON but not text', async () => {
            const chunk = { type: 'response-metadata', meta: 'data' };
            const res = await processor.process(chunk, context);
            expect(res.generatedText).toBe('');
            expect(context.generatedJSON).toContainEqual(chunk);
        });
        it('should append error chunks to text and JSON', async () => {
            const chunk = { type: 'error', error: 'fail' };
            const res = await processor.process(chunk, context);
            expect(res.generatedText).toContain(JSON.stringify(chunk));
            expect(context.generatedJSON).toContainEqual(chunk);
        });
    });
});
//# sourceMappingURL=stream-processor-buffering.test.js.map