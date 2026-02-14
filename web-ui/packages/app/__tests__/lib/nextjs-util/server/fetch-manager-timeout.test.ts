/* @jest-environment node */

import { FetchManager } from '@compliance-theater/nextjs/server/fetch/fetch-server';
import got from 'got';

describe('FetchManager Timeout Normalization', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should normalize number timeout to object in doGotFetch (POST)', async () => {
    const fetchManager = new FetchManager({ concurrency: 8 });
    const url = 'http://example.com/api';
    const timeoutVal = 30000;

    await fetchManager.fetch(url, {
      method: 'POST',
      timeout: timeoutVal,
      body: JSON.stringify({ test: true }),
    });

    // Verify got was called with correct timeout object
    const mockGot = got as unknown as jest.Mock;
    expect(mockGot).toHaveBeenCalled();
    const callArgs = mockGot.mock.calls[0];
    const options = callArgs[1];

    expect(options.timeout).toBeDefined();
    expect(options.timeout).toEqual({
      connect: 30000,
      lookup: 200,
      request: 60000,
      response: 30000,
      secureConnect: 1000,
      send: 10000,
      socket: 30000,
    });
  });

  it('should handle existing object timeout correctly', async () => {
    const fetchManager = new FetchManager({ concurrency: 8 });
    const url = 'http://example.com/api';
    const timeoutObj = { request: 15000 };

    await fetchManager.fetch(url, {
      method: 'POST',
      timeout: timeoutObj,
      body: JSON.stringify({ test: true }),
    });

    const mockGot = got as unknown as jest.Mock;
    const lastCall = mockGot.mock.calls[mockGot.mock.calls.length - 1];
    const options = lastCall[1];

    expect(options.timeout).toEqual({
      connect: 1000,
      lookup: 200,
      request: 15000,
      response: 30000,
      secureConnect: 1000,
      send: 10000,
      socket: 60000,
    });
  });

  it('should support overriding default with undefined', async () => {
    const fetchManager = new FetchManager({ concurrency: 8 });
    const url = 'http://example.com/api';
    const timeoutObj = { lookup: 0 };

    await fetchManager.fetch(url, {
      method: 'POST',
      timeout: timeoutObj as any, // Cast to any as RequestInit timeout is number
      body: JSON.stringify({ test: true }),
    });

    const mockGot = got as unknown as jest.Mock;
    const lastCall = mockGot.mock.calls[mockGot.mock.calls.length - 1];
    const options = lastCall[1];

    expect(options.timeout).toEqual({
      connect: 1000,
      lookup: 200,
      request: 60000,
      response: 30000,
      secureConnect: 1000,
      send: 10000,
      socket: 60000,
    });
  });
});
