/* eslint-disable @typescript-eslint/no-explicit-any */
import { ensureCreateResult } from '/lib/ai/middleware/chat-history/stream-handler-result';
import { processStreamChunk } from '/lib/ai/middleware/chat-history/stream-handlers';
import type { StreamHandlerContext } from '/lib/ai/middleware/chat-history/types';

// Synthetic chunk test interfaces (subset of real provider types)
interface SyntheticStartChunk {
  type: string;
  id: string;
  toolName?: string;
  [k: string]: unknown;
}

// Minimal helper to build a baseline context
const makeContext = (overrides: Partial<StreamHandlerContext> = {}) =>
  ensureCreateResult({
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
    const chunk: SyntheticStartChunk = {
      type: 'mybag-start',
      id: 'abc123',
      prop1: 'value1',
      nested: { a: 1 },
    };

    await processStreamChunk(chunk as any, context);

    expect(context.generatedJSON.length).toBe(0);
    expect(context.generatedText).toContain('mybag-start');
    expect(context.generatedText).toContain('abc123');
  });

  test('tool-input-start opens streaming object and does not immediately close', async () => {
    const context = makeContext();
    const chunk: SyntheticStartChunk = {
      type: 'tool-input-start',
      id: 'tool-1',
      toolName: 'search',
    };

    await processStreamChunk(chunk as any, context);

    // Should start with opening diagnostic object and trailing input: (no closing brace yet)
    // No object pushed yet; awaiting *-end
    expect(context.generatedJSON.length).toBe(0);
  });

  test('tool-input-delta appends raw delta into open input', async () => {
    const context = makeContext();
    await processStreamChunk(
      {
        type: 'tool-input-start',
        id: 'tool-1',
        toolName: 'calc',
      },
      context,
    );
    await processStreamChunk(
      { type: 'tool-input-start', toolName: 'tool', id: 'tool-2' },
      context,
    );
    await processStreamChunk(
      {
        type: 'tool-input-delta',
        id: 'tool-2',
        delta: '{"a":',
      },
      context,
    );
    await processStreamChunk(
      {
        type: 'tool-input-delta',
        id: 'tool-2',
        delta: '1}',
      },
      context,
    );
    await processStreamChunk({ type: 'tool-input-end', id: 'tool-2' }, context);
    await processStreamChunk({ type: 'tool-input-end', id: 'tool-1' }, context);
    expect(context.generatedJSON.length).toBe(1);
    expect(context.generatedJSON[0]).toMatchObject({
      type: 'tool-input',
      id: 'tool-2',
      toolName: 'tool',
      input: { a: 1 },
    });
    const first = context.generatedJSON[0] as { input?: unknown };
    expect(first.input).toEqual({ a: 1 });
  });
});
