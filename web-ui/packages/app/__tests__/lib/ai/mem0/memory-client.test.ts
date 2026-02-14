import MemoryClient from '@/lib/ai/mem0/lib/client/mem0';
import {
  memoryClientFactory,
  type ExtendedMemoryClient,
} from '@/lib/ai/mem0/memoryclient-factory';
import { fetch as mockedFetch } from '@compliance-theater/nextjs/server/fetch';

jest.mock('@/lib/nextjs-util/server/utils', () => ({
  createInstrumentedSpan: jest.fn(async () => ({
    executeWithContext: async <T>(fn: (span: unknown) => Promise<T>) => fn({}),
  })),
  reportEvent: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/auth/impersonation', () => {
  class MockImpersonationService {
    async getImpersonatedToken(): Promise<string> {
      return 'bearer-token';
    }

    getUserContext(): { userId: string } {
      return { userId: 'user-123' };
    }
  }

  return {
    fromRequest: jest.fn(),
    ImpersonationService: MockImpersonationService,
  };
});

const {
  fromRequest: mockFromRequest,
  ImpersonationService: MockImpersonationService,
} = jest.requireMock('@/lib/auth/impersonation');

type FetchResponse = {
  ok: boolean;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

const fetchMock = mockedFetch as unknown as jest.Mock<
  Promise<FetchResponse>,
  Parameters<typeof mockedFetch>
>;

const createJsonResponse = (data: unknown): FetchResponse => ({
  ok: true,
  json: async () => data,
  text: async () => JSON.stringify(data),
});

const createTextResponse = (payload: string): FetchResponse => ({
  ok: true,
  json: async () => JSON.parse(payload),
  text: async () => payload,
});

describe('MemoryClient configurable base path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockReset();
    mockFromRequest.mockReset();
    process.env.MEM0_API_HOST = 'https://mem0.test';
    process.env.MEM0_API_BASE_PATH = 'api/v1';
    process.env.MEM0_API_KEY = 'test-key';
  });

  const queuePingAndReturn = (response: FetchResponse) => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        status: 'ok',
        email: 'user@example.com',
        orgId: 'org',
        projectId: 'proj',
      }),
    );
    fetchMock.mockResolvedValueOnce(response);
  };

  it('prefixes the configured base path for relative endpoints', async () => {
    const client = new MemoryClient({
      apiKey: 'token',
      host: 'https://mem0.test/',
    });
    queuePingAndReturn(createJsonResponse({ status: 'ok' }));

    await client._fetchWithErrorHandling('memories/', {
      method: 'GET',
      headers: {},
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, options] = fetchMock.mock.calls[1];
    expect(String(url)).toEqual('https://mem0.test/api/v1/memories/');
    expect(options).toEqual(
      expect.objectContaining({
        method: 'GET',
      }),
    );
    expect(
      (options?.headers as Record<string, string>)['X-Mem0-User-ID'],
    ).toBeTruthy();
  });

  it('skips the base path for docs requests', async () => {
    const client = new MemoryClient({
      apiKey: 'token',
      host: 'https://mem0.test/',
    });
    queuePingAndReturn(createTextResponse('{}'));

    const result = await client._fetchWithErrorHandling('docs', {
      method: 'GET',
      headers: {},
    });

    expect(result).toBe('{}');
    const [url] = fetchMock.mock.calls[1];
    expect(String(url)).toEqual('https://mem0.test/docs');
  });

  it('does not apply the base path to versioned v2 routes', async () => {
    const client = new MemoryClient({
      apiKey: 'token',
      host: 'https://mem0.test/',
    });
    queuePingAndReturn(createJsonResponse({ status: 'ok' }));

    await client._fetchWithErrorHandling('v2/memories/', {
      method: 'POST',
      headers: {},
    });

    const [url] = fetchMock.mock.calls[1];
    expect(String(url)).toEqual('https://mem0.test/v2/memories/');
  });

  it('uses custom base path values from the environment', async () => {
    process.env.MEM0_API_BASE_PATH = 'api/v9';
    const client = new MemoryClient({
      apiKey: 'token',
      host: 'https://mem0.test/',
    });
    queuePingAndReturn(createJsonResponse({ status: 'ok' }));

    await client._fetchWithErrorHandling('memories/', {
      method: 'GET',
      headers: {},
    });

    const [url] = fetchMock.mock.calls[1];
    expect(String(url)).toEqual('https://mem0.test/api/v9/memories/');
  });

  it('applies the base path when invoking memoryClientFactory healthCheck', async () => {
    const ping = createJsonResponse({
      status: 'ok',
      email: 'user@example.com',
      orgId: 'org',
      projectId: 'proj',
    });
    const health = createJsonResponse({ status: 'ok' });
    fetchMock.mockResolvedValueOnce(ping);
    fetchMock.mockResolvedValueOnce(health);
    mockFromRequest.mockResolvedValueOnce(new MockImpersonationService());

    const client = await memoryClientFactory<ExtendedMemoryClient>({});
    await client.healthCheck();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url] = fetchMock.mock.calls[1];
    expect(String(url)).toEqual(
      'https://mem0.test/api/v1/stats/health-check?strict=false&verbose=1',
    );
  });
});
