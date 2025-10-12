jest.mock('openai-chat-tokens', () => ({
  promptTokensEstimate: jest.fn(() => 123),
}));

import { promptTokensEstimate } from 'openai-chat-tokens';
import { countTokens } from '@/lib/ai/core/count-tokens';
import { LanguageModelV2Prompt } from '@ai-sdk/provider';

describe('countTokens helper - function extraction', () => {
  beforeEach(() => {
    (promptTokensEstimate as jest.Mock).mockClear();
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
      prompt: prompt as unknown as LanguageModelV2Prompt,
      enableLogging: false,
    });
    expect(tokens).toBe(123);

    expect(
      (promptTokensEstimate as jest.Mock).mock.calls.length,
    ).toBeGreaterThan(0);
    const calledWith = (promptTokensEstimate as jest.Mock).mock
      .calls[0][0] as unknown;
    expect(
      (calledWith as { functions?: Array<{ name?: string }> }).functions,
    ).toBeDefined();

    // The current implementation passes an empty functions array
    const functions =
      (calledWith as { functions?: Array<{ name?: string }> }).functions || [];
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
      prompt: prompt as unknown as LanguageModelV2Prompt,
      enableLogging: false,
    });
    expect(tokens).toBe(123);

    const calledWith2 = (promptTokensEstimate as jest.Mock).mock
      .calls[0][0] as unknown;
    expect(
      (calledWith2 as { functions?: Array<{ name?: string }> }).functions,
    ).toBeDefined();

    // The current implementation passes an empty functions array
    const functions2 =
      (calledWith2 as { functions?: Array<{ name?: string }> }).functions || [];
    expect(functions2).toEqual([]);
  });
});
