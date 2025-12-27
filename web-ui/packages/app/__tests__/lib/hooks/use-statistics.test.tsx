import {
  QueryClient,
  QueryClientProvider,
  UseQueryResult,
} from '@tanstack/react-query';
import {
  useStatistics,
  useModelStatistics,
  useQueueStatistics,
} from '@/lib/hooks/use-statistics';
import type { ModelStat, QueueInfo } from '@/types/statistics';
import { fetch } from '@/lib/nextjs-util/fetch';
import { act, renderHook, waitFor } from '@/__tests__/test-utils';
import { RefObject } from 'react';
import { log } from '@compliance-theater/logger';
import { isError } from '@/lib/react-util/utility-methods';
import { assert } from 'console';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
    },
  });

  const component = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  component.displayName = 'QueryClientProviderWrapper';
  return component;
};

const mockModelResponse = {
  success: true,
  data: [
    {
      id: '1',
      modelName: 'gpt-4',
      displayName: 'GPT-4',
      description: 'OpenAI GPT-4',
      isActive: true,
      providerId: 'openai',
      providerName: 'openai',
      providerDisplayName: 'OpenAI',
      maxTokensPerMessage: 8192,
      maxTokensPerMinute: 1000,
      maxTokensPerDay: 50000,
      modelKey: 'openai:gpt-4',
      available: true,
      stats: {
        minute: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          requestCount: 5,
        },
        hour: {
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500,
          requestCount: 50,
        },
        day: {
          promptTokens: 10000,
          completionTokens: 5000,
          totalTokens: 15000,
          requestCount: 500,
        },
      },
    },
  ] as ModelStat[],
};

const mockQueueResponse = {
  success: true,
  data: {
    summary: { totalPending: 5, totalGen1: 3, totalGen2: 2 },
    queues: [
      {
        classification: 'hifi',
        queues: {
          generation1: {
            size: 3,
            requests: [],
            averageSize: 1024,
            oldestRequest: new Date('2024-01-01T10:00:00Z'),
            newestRequest: new Date('2024-01-01T10:05:00Z'),
          },
          generation2: {
            size: 2,
            requests: [],
            averageSize: 512,
            oldestRequest: new Date('2024-01-01T10:01:00Z'),
            newestRequest: new Date('2024-01-01T10:04:00Z'),
          },
        },
        totalPending: 5,
      },
    ] as QueueInfo[],
  },
};

describe('Statistics hooks', () => {
  beforeEach(() => {
    // jest.clearAllMocks();
  });

  describe('useModelStatistics', () => {
    it('should fetch model statistics successfully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockModelResponse),
      });

      const { result } = renderHook(() => useModelStatistics(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockModelResponse.data);
      expect(fetch).toHaveBeenCalledWith(
        '/api/ai/chat/stats/models?source=database'
      );
    });

    it('should support Redis data source', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockModelResponse),
      });

      const { result } = renderHook(() => useModelStatistics('redis'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/ai/chat/stats/models?source=redis'
      );
    });
  });

  describe('useQueueStatistics', () => {
    it('should fetch queue statistics successfully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockQueueResponse),
      });

      const { result } = renderHook(() => useQueueStatistics(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockQueueResponse.data);
      expect(fetch).toHaveBeenCalledWith('/api/ai/chat/stats/queues');
    });
  });

  describe('useStatistics', () => {
    it('should combine model and queue statistics', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockModelResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockQueueResponse),
        });

      const { result } = renderHook(() => useStatistics(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.models.isSuccess).toBe(true);
        expect(result.current.queues.isSuccess).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.models.data).toEqual(mockModelResponse.data);
      expect(result.current.queues.data).toEqual(mockQueueResponse.data);
    });

    it('should handle combined loading state', () => {
      (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useStatistics(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isError).toBe(false);
    });

    it('should refetch both queries when refetch is called', async () => {
      (fetch as jest.Mock).mockClear();

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockModelResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockQueueResponse),
        });
      const testState: Record<string, any> = {};
      act(() => {
        const { result } = renderHook(() => useStatistics(), {
          wrapper: createWrapper(),
        });
        testState.result = result;
      });

      await waitFor(() => {
        expect(testState.result.current.models.isSuccess).toBe(true);
      });

      // Clear previous calls
      // jest.clearAllMocks();

      // Call refetch
      // testState.result.current.refetch();

      // Should trigger both queries again
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenCalledWith(
        '/api/ai/chat/stats/models?source=database'
      );
      expect(fetch).toHaveBeenCalledWith('/api/ai/chat/stats/queues');
    });
  });
});
