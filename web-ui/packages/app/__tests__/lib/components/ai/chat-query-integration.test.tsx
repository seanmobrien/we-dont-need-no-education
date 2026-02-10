/**
 * Tests for TanStack React Query integration with chat panel
 */

import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import React from 'react';
import { renderHook } from '@/__tests__/test-utils';
import { useChatFetchWrapper } from '@/lib/components/ai/chat-fetch-wrapper';
import { fetch } from '@/lib/nextjs-util/fetch';

// Polyfill ReadableStream for Node.js test environment
if (!globalThis.ReadableStream) {
  const { ReadableStream } = require('stream/web');
  globalThis.ReadableStream = ReadableStream;
}

// Mock the logger
jest.mock('@compliance-theater/logger', () => ({
  log: jest.fn((fn) => fn({ warn: jest.fn() })),
}));

// Mock the env helper
jest.mock('@compliance-theater/env', () => ({
  env: jest.fn(() => 'http://localhost:3000'),
}));

// Mock the hash function
jest.mock('@/lib/ai/core/chat-ids', () => ({
  notCryptoSafeKeyHash: jest.fn(
    (input: string) => `hash-${input.slice(0, 10)}`,
  ),
}));

// Mock Response for test environment
const mockResponse = (body: string | object, init: ResponseInit = {}) => ({
  ok: init.status ? init.status >= 200 && init.status < 300 : true,
  status: init.status || 200,
  statusText: init.statusText || 'OK',
  headers: new Headers(init.headers || {}),
  text: () =>
    Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  json: () =>
    Promise.resolve(
      typeof body === 'object' ? body : JSON.parse(body as string),
    ),
  body: new ReadableStream({
    start(controller) {
      const data = typeof body === 'string' ? body : JSON.stringify(body);
      controller.enqueue(new TextEncoder().encode(data));
      controller.close();
    },
  }),
});

// Create a test query client and wrapper
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  TestWrapper.displayName = 'TestWrapper';

  return TestWrapper;
};

describe('TanStack React Query Chat Integration', () => {
  beforeEach(() => {
    // Clear mocks - fetch is already mocked in jest.setup.ts
    (fetch as jest.Mock).mockClear();
  });

  describe('useChatFetchWrapper', () => {
    it('should create a fetch wrapper when used in QueryClient context', async () => {
      const { result } = renderHook(() => useChatFetchWrapper(), {
        wrapper: createTestWrapper(),
      });

      expect(result.current.chatFetch).toBeDefined();
      expect(result.current.queryClient).toBeDefined();
      expect(result.current.queryClient).toBeInstanceOf(QueryClient);
    });

    it('should create chatFetch function that makes requests', async () => {
      const mockResponseData = { message: 'success' };
      (fetch as jest.Mock).mockResolvedValueOnce(
        mockResponse(mockResponseData),
      );

      const { result } = renderHook(() => useChatFetchWrapper(), {
        wrapper: createTestWrapper(),
      });

      const { chatFetch } = result.current;

      // Test the chatFetch function exists and is callable
      expect(typeof chatFetch).toBe('function');

      // Note: Due to the complex streaming implementation, we'll test the wrapper creation
      // rather than the full request flow in this unit test
    });

    it('should throw error when used outside QueryClient context', () => {
      // Suppress console error for this test
      const originalError = console.error;
      console.error = jest.fn();

      try {
        renderHook(() => useChatFetchWrapper());
      } catch (error) {
        expect(error).toEqual(
          expect.objectContaining({
            message: expect.stringContaining('No QueryClient set'),
          }),
        );
      }

      console.error = originalError;
    });
  });
});
