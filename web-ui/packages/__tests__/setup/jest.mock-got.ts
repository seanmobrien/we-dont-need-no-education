
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

try{
  jest.mock('@compliance-theater/nextjs/fetch', () => {
    let mockFetch = jest.fn().mockImplementation(() => {
      return makeResponse();
    });
    return {
      fetch: mockFetch
    };
  });
}catch{

}

try{
  jest.mock('@compliance-theater/nextjs/server/fetch', () => {
    let mockFetch = jest.fn().mockImplementation(() => {
      return makeResponse();
    });
    return {
      fetch: mockFetch
    };
  });
}catch{

}

try{
  jest.mock('@compliance-theater/nextjs/dynamic-fetch', () => {
    let mockFetch = jest.fn().mockImplementation(() => {
      return makeResponse();
    });
    return {
      fetch: mockFetch
    };
  });  
} catch {

}

import { fetch as clientFetch } from '@compliance-theater/nextjs/fetch';
import { fetch as serverFetch } from '@compliance-theater/nextjs/server/fetch';
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
