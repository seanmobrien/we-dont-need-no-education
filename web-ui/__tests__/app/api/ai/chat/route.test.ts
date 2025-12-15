/**
 * @jest-environment node
 */
import { POST } from '@/app/api/ai/chat/route';
import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { streamText } from 'ai';

// Mock dependencies
jest.mock('@/auth');
jest.mock('ai', () => ({
  ...jest.requireActual('ai'),
  streamText: jest.fn(),
  convertToModelMessages: jest.fn((msgs) => msgs),
}));
jest.mock('@/lib/ai/aiModelFactory', () => ({
  aiModelFactory: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/lib/ai/middleware/chat-history', () => ({
  wrapChatHistoryMiddleware: jest.fn((props) => props.model),
}));
jest.mock('@/lib/ai/middleware/chat-history/create-chat-history-context', () => ({
  createUserChatHistoryContext: jest.fn(() => ({
    dispose: jest.fn(),
  })),
}));
jest.mock('@/lib/ai/mcp/providers', () => ({
  setupDefaultTools: jest.fn().mockResolvedValue({ tools: {} }),
}));
jest.mock('@/lib/site-util/feature-flags/server', () => ({
  getFeatureFlag: jest.fn().mockResolvedValue(false),
}));

// Use real wrapRouteRequest
jest.unmock('@/lib/nextjs-util/server');

jest.mock('@/lib/react-util/utility-methods', () => {
  const originalModule = jest.requireActual('@/lib/react-util/utility-methods');
  return {
    ...originalModule,
    isAbortError: jest.fn().mockReturnValue(false),
    isTruthy: jest.fn().mockReturnValue(true),
  };
});

describe('/api/ai/chat route', () => {
  beforeEach(() => {
    // jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user-1' },
    });
  });

  it('should stream response correctly', async () => {
    const mockStream = {
      toUIMessageStream: jest.fn().mockReturnValue((async function* () {
        yield { type: 'text', content: 'Hello' };
        yield { type: 'text', content: ' World' };
      })()),
    };
    (streamText as jest.Mock).mockReturnValue(mockStream);

    const req = new NextRequest('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hi' }],
        id: 'chat-1',
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream;charset=utf-8');

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let result = '';

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      result += decoder.decode(value);
    }

    expect(result).toContain('data: {"type":"text","content":"Hello"}');
    expect(result).toContain('data: {"type":"text","content":" World"}');
  });
});
