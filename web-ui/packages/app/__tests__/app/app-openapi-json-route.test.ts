/**
 * @jest-environment node
 */

/**
 * Tests for app/openapi.json/route.tsx
 * - mocks env() to provide MEM0_API_HOST and NEXT_PUBLIC_HOSTNAME
 * - mocks the internal fetch wrapper to return a Response-like object
 */

import type { NextRequest } from 'next/server';

// hoist-safe mocks
/*
const mockFetch = jest.fn();
jest.mock('@compliance-theater/env', () => ({
  env: (k: string) => {
    if (k === 'MEM0_API_HOST') return 'https://mem0.example';
    if (k === 'MEM0_API_BASE_PATH') return 'api/v1';
    if (k === 'NEXT_PUBLIC_HOSTNAME') return 'https://app.example';
    return '';
  },
}));
*/
/*
jest.mock('@/lib/nextjs-util/fetch', () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
*/
import { fetch as mockFetch } from '@/lib/nextjs-util/server/fetch';

describe('openapi route', () => {
  beforeEach(() => {
    //jest.resetModules();
    process.env.MEM0_API_HOST = 'https://mem0.example';
    process.env.MEM0_API_BASE_PATH = 'api/v1';
    process.env.NEXT_PUBLIC_HOSTNAME = 'https://app.example';
    //mockFetch.mockReset();
  });

  it('replaces MEM0 host in url fields and remaps paths', async () => {
    const original = {
      openapi: '3.0.0',
      url: 'https://mem0.example/api/v1/info',
      paths: {
        '/api/v1/foo': { get: {} },
        '/mcp/internal': { get: {} },
      },
    };

    // mock fetch to return an object with text()
    (mockFetch as jest.Mock).mockResolvedValue({
      text: async () => JSON.stringify(original),
    });

    // import fresh GET (module imports env and fetch lazily via aliases)
    const { GET: handler } = await import('@/app/openapi.json/route');

    const req = new Request(
      'http://localhost/openapi',
    ) as unknown as NextRequest;
    const res = await handler();
    expect(res).toBeDefined();
    const json = await (res as Response).json();

    // url should have mem0 host replaced
    expect(json.url).toBe('https://app.example/api/v1/info');

    // paths should have '/api/v1/foo' mapped to '/api/memory/foo' and '/mcp/internal' removed
    expect(Object.keys(json.paths)).toContain('/api/memory/foo');
    expect(Object.keys(json.paths)).not.toContain('/mcp/internal');
  });

  it('does not modify empty url fields and preserves non-matching paths', async () => {
    const original = {
      openapi: '3.0.0',
      url: '',
      paths: {
        '/api/v1/bar': { get: {} },
        '/other/path': { post: {} },
      },
    };
    (mockFetch as jest.Mock).mockResolvedValueOnce({
      text: async () => JSON.stringify(original),
    });

    const { GET: handler } = await import('@/app/openapi.json/route');
    const req = new Request(
      'http://localhost/openapi',
    ) as unknown as NextRequest;
    const res = await handler();
    const json = await (res as Response).json();

    expect(json.url).toBe('');
    expect(Object.keys(json.paths)).toContain('/api/memory/bar');
    expect(Object.keys(json.paths)).toContain('/other/path');
  });
});
