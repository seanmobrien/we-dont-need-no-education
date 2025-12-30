/* @jest-environment node */
import {
  memoryMiddlewareFactory,
  memoryMiddlewareContextFactory,
} from '../../../../../lib/ai/middleware/memory-middleware';
import { generateTextWithRetry } from '../../../../../lib/ai/core/generate-text-with-retry';

const warnMock = jest.fn();
const verboseMock = jest.fn();
const debugMock = jest.fn();

// Mocks for external dependencies (use same module IDs as implementation)
jest.mock('../../../../../lib/ai/core/generate-text-with-retry', () => ({
  generateTextWithRetry: jest.fn(),
  generatorFactory: jest.fn(),
  generateObjectWithRetryFactory: jest.fn(),
}));

jest.mock('@semanticencoding/core', () => ({
  getDefinitionsFromText: jest.fn(() => []),
}));

jest.mock('../../../../../lib/ai/aiModelFactory', () => ({
  aiModelFactory: jest.fn(async () => ({ id: 'mock-model' })),
}));

jest.mock('../../../../../lib/ai/middleware/tool-proxy', () => ({
  wrapWithToolProxyMiddleware: jest.fn(({ model }) => model),
}));

jest.mock('../../../../../lib/ai/middleware/chat-history', () => ({
  chatIdFromParams: jest.fn(() => ({
    chatId: 'chat',
    turnId: 'turn',
    messageId: 'msg',
  })),
  createAgentHistoryContext: jest.fn(() => ({ ctx: true })),
  wrapChatHistoryMiddleware: jest.fn(({ model }) => model),
}));

jest.mock('@compliance-theater/logger', () => ({
  log: jest.fn((fn) =>
    fn({ verbose: verboseMock, warn: warnMock, debug: debugMock }),
  ),
  safeSerialize: jest.fn((value) => JSON.stringify(value)),
}));

jest.mock('../../../../../lib/react-util/errors/logged-error', () => ({
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn((err) => err as Error),
    isLoggedError: jest.fn(() => false),
  },
}));

describe('memoryMiddleware.transformParams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    warnMock.mockClear();
    verboseMock.mockClear();
    debugMock.mockClear();
  });

  it('returns params unchanged when mem0 is disabled', async () => {
    const context = memoryMiddlewareContextFactory({
      mem0Enabled: false,
      directAccess: false,
      projectId: undefined,
      orgId: undefined,
      impersonation: undefined,
      userId: 'user-321',
      chatId: 'chat-123',
      messageId: 'msg-123',
    });

    const params = { prompt: [{ role: 'user', content: 'hi' }] } as any;
    const middleware = memoryMiddlewareFactory(context);

    const result = await middleware.transformParams!({
      type: 'generate',
      model: {} as any,
      params,
    });

    expect(result).toBe(params);
    expect(generateTextWithRetry).not.toHaveBeenCalled();
  });

  it('injects system prompt for tool-based memory when directAccess is false', async () => {
    const context = memoryMiddlewareContextFactory({
      mem0Enabled: true,
      directAccess: false,
      projectId: undefined,
      orgId: undefined,
      impersonation: undefined,
      userId: 'user-123',
      chatId: 'chat-123',
      messageId: 'msg-123',
    });

    const params = { prompt: [{ role: 'user', content: 'hello' }] } as any;
    const middleware = memoryMiddlewareFactory(context);

    const result = await middleware.transformParams!({
      type: 'generate',
      model: {} as any,
      params,
    });

    expect(result.prompt).toHaveLength(2);
    expect(result.prompt?.[0].role).toBe('system');
    expect(result.prompt?.[0].content).toContain('search_memory');
    expect(generateTextWithRetry).not.toHaveBeenCalled();
  });

  it('returns original params when directAccess retrieval yields no memories', async () => {
    (generateTextWithRetry as jest.Mock).mockResolvedValue({
      experimental_output: {
        search_terms_used: ['term'],
        top_memories_verbatim: [],
        additional_memories_summarized: [],
        truncated: false,
      },
    });

    const context = memoryMiddlewareContextFactory({
      mem0Enabled: true,
      directAccess: true,
      projectId: undefined,
      orgId: undefined,
      impersonation: undefined,
      userId: 'user-123',
      chatId: 'chat-123',
      messageId: 'msg-123',
    });

    const params = { prompt: [{ role: 'user', content: 'hi' }] } as any;
    const middleware = memoryMiddlewareFactory(context);

    const result = await middleware.transformParams!({
      type: 'generate',
      model: {} as any,
      params,
    });

    expect(jest.isMockFunction(generateTextWithRetry)).toBe(true);
    expect(result.prompt).toHaveLength(1);
    expect(result.prompt?.[0]).toEqual(params.prompt[0]);
    expect(warnMock).not.toHaveBeenCalled();
  });
});
