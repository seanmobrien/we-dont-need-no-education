
const makeResponse = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    body: Buffer.from('{ "status": "ok" }'),
  });

// Mock got
jest.mock('got', () => {
  const mockGot = jest.fn(() => {
    return {
      body: Buffer.from('ok'),
      headers: { 'Content-Type': 'application/json' },
      statusCode: 200,
      rawBody: Buffer.from('ok')
    };
  });
  // Mock stream method
  (mockGot as any).stream = jest.fn().mockReturnValue({
    on: jest.fn(),
    pipe: jest.fn(),
  });
  (mockGot as any).get = jest.fn();
  (mockGot as any).post = jest.fn();
  (mockGot as any).stream = jest.fn();
  const gotExtended = {
    get: (...args: any[]) => (mockGot as any).get(...args),
    post: (...args: any[]) => (mockGot as any).post(...args),
    stream: (...args: any[]) => (mockGot as any).stream(...args),
  };
  const gotExtend = jest.fn().mockReturnValue(gotExtended);
  (mockGot as any).extend = gotExtend;
  return {
    __esModule: true,
    default: mockGot,
    got: mockGot,
    gotExtended,
  };
});


jest.mock('@/lib/nextjs-util/fetch', () => {
  let mockFetch = jest.fn().mockImplementation(() => {
    return makeResponse();
  });
  return {
    fetch: mockFetch
  };
});

jest.mock('@/lib/nextjs-util/server/fetch', () => {
  let mockFetch = jest.fn().mockImplementation(() => {
    return makeResponse();
  });
  return {
    fetch: mockFetch
  };
});

jest.mock('@/lib/nextjs-util/dynamic-fetch', () => {
  let mockFetch = jest.fn().mockImplementation(() => {
    return makeResponse();
  });
  return {
    fetch: mockFetch
  };
});

import { fetch as clientFetch } from '@/lib/nextjs-util/fetch';
import { fetch as serverFetch } from '@/lib/nextjs-util/server/fetch';
import got from 'got';

let originalFetch: typeof globalThis.fetch | undefined;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  globalThis.fetch = jest.fn().mockImplementation(() => {
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: Buffer.from('{ "status": "ok" }'),
    });
  });
});

afterEach(() => {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }
});
// 
