import { repairTopMemoriesToolCall } from '../../../../../lib/ai/middleware/memory-middleware/repair-top-memories';
import { InvalidToolInputError, NoSuchToolError } from 'ai';
const baseOptions = (overrides = {}) => ({
    system: undefined,
    messages: [],
    toolCall: {
        type: 'tool-call',
        toolCallId: 'call-1',
        toolName: 'search_memory',
        input: '{}',
    },
    tools: {},
    inputSchema: () => ({ type: 'object' }),
    error: new InvalidToolInputError({ toolInput: '{}', toolName: 'search_memory', cause: new Error('invalid') }),
    ...overrides,
});
describe('repairTopMemoriesToolCall', () => {
    it('returns null for NoSuchToolError', async () => {
        const result = await repairTopMemoriesToolCall(baseOptions({
            error: new NoSuchToolError({ toolName: 'missing', availableTools: ['search_memory'] }),
            toolCall: { type: 'tool-call', toolCallId: '1', toolName: 'missing', input: '{}' },
        }));
        expect(result).toBeNull();
    });
    it('returns null when toolCall input is invalid JSON', async () => {
        const result = await repairTopMemoriesToolCall(baseOptions({ toolCall: { type: 'tool-call', toolCallId: '1', toolName: 'search_memory', input: '{' } }));
        expect(result).toBeNull();
    });
    it('returns null when topMemories is missing', async () => {
        const result = await repairTopMemoriesToolCall(baseOptions({ toolCall: { type: 'tool-call', toolCallId: '1', toolName: 'search_memory', input: JSON.stringify({ foo: [] }) } }));
        expect(result).toBeNull();
    });
    it('returns null when createdAt cannot be parsed', async () => {
        const result = await repairTopMemoriesToolCall(baseOptions({
            toolCall: {
                type: 'tool-call',
                toolCallId: '1',
                toolName: 'search_memory',
                input: JSON.stringify({ topMemories: [{ createdAt: 'not-a-date' }] }),
            },
        }));
        expect(result).toBeNull();
    });
    it('normalizes createdAt with missing offset colon and trims seconds', async () => {
        const result = await repairTopMemoriesToolCall(baseOptions({
            toolCall: {
                type: 'tool-call',
                toolCallId: '1',
                toolName: 'search_memory',
                input: JSON.stringify({
                    topMemories: [
                        { id: '1', createdAt: '2025-12-05T07:31:23.917846-0800' },
                        { id: '2', createdAt: '2025-12-05 07:31-08:00' },
                    ],
                }),
            },
        }));
        expect(result).not.toBeNull();
        const parsed = JSON.parse(result.input);
        expect(parsed.topMemories[0].createdAt).toBe('2025-12-05T07:31-08:00');
        expect(parsed.topMemories[1].createdAt).toBe('2025-12-05T07:31-08:00');
    });
    it('returns null when createdAt is already normalized', async () => {
        const result = await repairTopMemoriesToolCall(baseOptions({
            toolCall: {
                type: 'tool-call',
                toolCallId: '1',
                toolName: 'search_memory',
                input: JSON.stringify({ topMemories: [{ createdAt: '2025-12-05T07:31-08:00' }] }),
            },
        }));
        expect(result).toBeNull();
    });
});
//# sourceMappingURL=memory-middleware.repairToolCall.test.js.map