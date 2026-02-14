jest.mock('openai-chat-tokens', () => ({
    promptTokensEstimate: jest.fn(() => 123),
}));
import { promptTokensEstimate } from 'openai-chat-tokens';
import { countTokens } from '@/lib/ai/core/count-tokens';
describe('countTokens helper - function extraction', () => {
    beforeEach(() => {
        promptTokensEstimate.mockClear();
    });
    it('extracts functions from in-message tool-call parts and passes them to estimator', () => {
        const prompt = [
            {
                role: 'assistant',
                content: [
                    {
                        type: 'tool-call',
                        toolCallId: 'call_1',
                        toolName: 'searchTool',
                        args: { q: 'term', limit: 5 },
                    },
                ],
            },
        ];
        const tokens = countTokens({
            prompt: prompt,
            enableLogging: false,
        });
        expect(tokens).toBe(123);
        expect(promptTokensEstimate.mock.calls.length).toBeGreaterThan(0);
        const calledWith = promptTokensEstimate.mock
            .calls[0][0];
        expect(calledWith.functions).toBeDefined();
        const functions = calledWith.functions || [];
        expect(functions).toEqual([]);
    });
    it('extracts functions from prompt.tool_choice.function and passes them to estimator', () => {
        const prompt = {
            messages: [{ role: 'user', content: 'do something' }],
            tool_choice: {
                function: {
                    name: 'namedTool',
                    description: 'a named tool',
                    parameters: { type: 'object', properties: { q: { type: 'string' } } },
                },
            },
        };
        const tokens = countTokens({
            prompt: prompt,
            enableLogging: false,
        });
        expect(tokens).toBe(123);
        const calledWith2 = promptTokensEstimate.mock
            .calls[0][0];
        expect(calledWith2.functions).toBeDefined();
        const functions2 = calledWith2.functions || [];
        expect(functions2).toEqual([]);
    });
});
//# sourceMappingURL=count-tokens.test.js.map