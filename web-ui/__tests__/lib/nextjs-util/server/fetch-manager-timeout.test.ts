
import { FetchManager } from '@/lib/nextjs-util/server/fetch/fetch-server';
import got from 'got';

// Mock got
jest.mock('got', () => {
  const mockGot = jest.fn().mockResolvedValue({
    body: Buffer.from('ok'),
    headers: {},
    statusCode: 200,
    rawBody: Buffer.from('ok')
  });
  // Mock stream method
  (mockGot as any).stream = jest.fn().mockReturnValue({
    on: jest.fn(),
    pipe: jest.fn(),
  });
  return {
    __esModule: true,
    default: mockGot,
  };
});

describe('FetchManager Timeout Normalization', () => {
  it('should normalize number timeout to object in doGotFetch (POST)', async () => {
    const fetchManager = new FetchManager({ concurrency: 8 });
    const url = 'http://example.com/api';
    const timeoutVal = 30000;

    await fetchManager.fetch(url, {
      method: 'POST',
      timeout: timeoutVal,
      body: JSON.stringify({ test: true })
    });

    // Verify got was called with correct timeout object
    const mockGot = got as unknown as jest.Mock;
    expect(mockGot).toHaveBeenCalled();
    const callArgs = mockGot.mock.calls[0];
    const options = callArgs[1];

    expect(options.timeout).toBeDefined();
    expect(options.timeout).toEqual({ request: timeoutVal });
  });

  it('should handle existing object timeout correctly', async () => {
    const fetchManager = new FetchManager({ concurrency: 8 });
    const url = 'http://example.com/api';
    const timeoutObj = { request: 15000 };

    await fetchManager.fetch(url, {
      method: 'POST',
      timeout: timeoutObj as any, // Cast to any as RequestInit timeout is number
      body: JSON.stringify({ test: true })
    });

    const mockGot = got as unknown as jest.Mock;
    const lastCall = mockGot.mock.calls[mockGot.mock.calls.length - 1];
    const options = lastCall[1];

    expect(options.timeout).toEqual({ request: 15000 });
  });
});
