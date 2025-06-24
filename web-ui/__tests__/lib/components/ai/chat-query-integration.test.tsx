/**
 * Tests for TanStack React Query integration with chat panel
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useChatFetch, useChatQueryMetrics } from '@/lib/components/ai/chat-fetch';
import { createChatFetchWrapper } from '@/lib/components/ai/chat-fetch-wrapper';

// Mock Response for test environment
const mockResponse = (body: string | object, init: ResponseInit = {}) => ({
  ok: init.status ? init.status >= 200 && init.status < 300 : true,
  status: init.status || 200,
  statusText: init.statusText || 'OK',
  headers: new Map(Object.entries(init.headers || {})),
  text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  json: () => Promise.resolve(typeof body === 'object' ? body : JSON.parse(body as string)),
  body: init.headers?.['content-type']?.includes('stream') ? 
    mockReadableStream() : null,
});

// Mock ReadableStream for test environment
const mockReadableStream = () => ({
  getReader: () => ({
    read: jest.fn()
      .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('chunk1') })
      .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('chunk2') })
      .mockResolvedValueOnce({ done: true, value: undefined }),
  }),
  tee: () => [mockReadableStream(), mockReadableStream()],
});

// Override the global fetch mock for our tests
const mockFetch = jest.fn();

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Test wrapper component
const TestQueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Chat React Query Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    // Override the global fetch for our specific tests
    global.fetch = mockFetch;
  });

  describe('useChatFetch', () => {
    it('should handle successful chat API calls', async () => {
      const mockResponseData = mockResponse({ message: 'success' }, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      mockFetch.mockResolvedValueOnce(mockResponseData);

      const { result } = renderHook(() => useChatFetch(), {
        wrapper: TestQueryProvider,
      });

      const response = await result.current.executeChatFetch({
        api: '/api/ai/chat',
        data: { message: 'test' },
        headers: { 'x-test': 'true' },
      });

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test': 'true',
        },
        body: JSON.stringify({ message: 'test' }),
      });
    });

    it('should handle API errors with status codes', async () => {
      const mockErrorResponse = mockResponse('Rate limit exceeded', {
        status: 429,
        statusText: 'Too Many Requests',
      });
      mockFetch.mockResolvedValueOnce(mockErrorResponse);

      const { result } = renderHook(() => useChatFetch(), {
        wrapper: TestQueryProvider,
      });

      await expect(
        result.current.executeChatFetch({
          api: '/api/ai/chat',
          data: { message: 'test' },
        })
      ).rejects.toThrow('HTTP 429');

      // Wait for the error state to be updated
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });

    it('should call lifecycle callbacks', async () => {
      const mockResponseData = mockResponse('{}', { status: 200 });
      mockFetch.mockResolvedValueOnce(mockResponseData);

      const onStart = jest.fn();
      const onSuccess = jest.fn();
      const onError = jest.fn();

      const { result } = renderHook(() => useChatFetch(), {
        wrapper: TestQueryProvider,
      });

      await result.current.executeChatFetch({
        api: '/api/ai/chat',
        data: { message: 'test' },
        onStart,
        onSuccess,
        onError,
      });

      expect(onStart).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith(mockResponseData);
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('useChatQueryMetrics', () => {
    it('should provide query metrics', () => {
      const { result } = renderHook(() => useChatQueryMetrics(), {
        wrapper: TestQueryProvider,
      });

      const metrics = result.current.getChatMetrics();

      expect(metrics).toHaveProperty('totalQueries');
      expect(metrics).toHaveProperty('activeQueries');
      expect(metrics).toHaveProperty('errorQueries');
      expect(metrics).toHaveProperty('successQueries');
      expect(metrics).toHaveProperty('lastActivity');
      expect(typeof metrics.totalQueries).toBe('number');
    });
  });

  describe('createChatFetchWrapper', () => {
    it('should create a fetch wrapper with custom options', async () => {
      const onRequestStart = jest.fn();
      const onRequestSuccess = jest.fn();
      const enableLogging = false;

      const chatFetch = createChatFetchWrapper({
        onRequestStart,
        onRequestSuccess,
        enableLogging,
      });

      const mockResponseData = mockResponse('{}', { status: 200 });
      mockFetch.mockResolvedValueOnce(mockResponseData);

      await chatFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ test: true }),
      });

      expect(onRequestStart).toHaveBeenCalledWith('/api/ai/chat', expect.any(Object));
      expect(onRequestSuccess).toHaveBeenCalledWith(mockResponseData, '/api/ai/chat');
      expect(mockFetch).toHaveBeenCalledWith('/api/ai/chat', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }),
      }));
    });

    it('should handle streaming responses correctly', async () => {
      const mockStreamResponse = mockResponse('', {
        status: 200,
        headers: { 'content-type': 'text/stream' },
      });
      mockFetch.mockResolvedValueOnce(mockStreamResponse);

      const chatFetch = createChatFetchWrapper();
      const response = await chatFetch('/api/ai/chat', { method: 'POST' });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('should add request timeout and proper headers', async () => {
      const mockResponseData = mockResponse('{}', { status: 200 });
      mockFetch.mockResolvedValueOnce(mockResponseData);

      const chatFetch = createChatFetchWrapper();
      await chatFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'x-custom': 'value' },
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/ai/chat', expect.objectContaining({
        signal: expect.any(Object), // AbortSignal
        headers: expect.objectContaining({
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'x-custom': 'value',
        }),
      }));
    });
  });
});