/**
 * Tests for TanStack React Query integration with chat panel
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { createChatFetchWrapper } from '@/lib/components/ai/chat-fetch-wrapper';

// Mock Response for test environment
const mockResponse = (body: string | object, init: ResponseInit = {}) => ({
  ok: init.status ? init.status >= 200 && init.status < 300 : true,
  status: init.status || 200,
  statusText: init.statusText || 'OK',
  headers: new Map(Object.entries(init.headers || {})),
  text: () =>
    Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  json: () =>
    Promise.resolve(
      typeof body === 'object' ? body : JSON.parse(body as string),
    ),
});

// Override the global fetch mock for our tests
const mockFetch = jest.fn();

// Create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

// Test wrapper component
const TestQueryProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('TanStack React Query Chat Integration', () => {
  beforeEach(() => {
    // jest.clearAllMocks();
    global.fetch = mockFetch;
  });

  describe('createChatFetchWrapper', () => {
    it('should create a fetch wrapper with timeout functionality', async () => {
      const mockResponseData = { message: 'success' };
      mockFetch.mockResolvedValueOnce(mockResponse(mockResponseData));

      const chatFetch = createChatFetchWrapper();
      const response = await chatFetch('/api/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ test: 'data' }),
          signal: expect.any(AbortSignal),
        }),
      );
      expect(response).toBeDefined();
    });

    it('should handle fetch errors gracefully', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValueOnce(error);

      const chatFetch = createChatFetchWrapper();

      await expect(chatFetch('/api/test')).rejects.toThrow('Network error');
    });
  });
});
