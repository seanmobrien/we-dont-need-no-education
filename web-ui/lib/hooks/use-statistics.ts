import { useQuery } from '@tanstack/react-query';
import type {
  ApiResponse,
  ModelStat,
  QueueInfo,
  QueueSummary,
} from '@/types/statistics';
import { fetch } from '@/lib/nextjs-util/fetch';
import { LoggedError } from '../react-util';

const STATISTICS_STALE_TIME = 30 * 1000; // 30 seconds
const STATISTICS_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches model statistics from the API
 */
const fetchModelStatistics = async (
  source: 'database' | 'redis' = 'database',
): Promise<ModelStat[]> => {
  const params = new URLSearchParams({ source });
  try {
    const response = await fetch(`/api/ai/chat/stats/models?${params}`);

    if (!response.ok) {
      throw new Error('Failed to fetch model statistics');
    }

    const data: ApiResponse<ModelStat[]> = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'API returned error response');
    }

    return data.data;
  } catch (error) {
    throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'fetchModelStatistics',
    });
  }
};

/**
 * Fetches queue statistics from the API
 */
const fetchQueueStatistics = async (): Promise<{
  summary: QueueSummary;
  queues: QueueInfo[];
}> => {
  const response = await fetch('/api/ai/chat/stats/queues');

  if (!response.ok) {
    throw new Error('Failed to fetch queue statistics');
  }

  const data: ApiResponse<{ summary: QueueSummary; queues: QueueInfo[] }> =
    await response.json();

  if (!data.success) {
    throw new Error(data.error || 'API returned error response');
  }

  return data.data;
};


export const useModelStatistics = (
  source: 'database' | 'redis' = 'database',
) => {
  return useQuery({
    queryKey: ['modelStatistics', source],
    queryFn: () => fetchModelStatistics(source),
    staleTime: STATISTICS_STALE_TIME,
    gcTime: STATISTICS_CACHE_TIME,
    refetchInterval: STATISTICS_STALE_TIME,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};


export const useQueueStatistics = () => {
  return useQuery({
    queryKey: ['queueStatistics'],
    queryFn: fetchQueueStatistics,
    staleTime: STATISTICS_STALE_TIME,
    gcTime: STATISTICS_CACHE_TIME,
    refetchInterval: STATISTICS_STALE_TIME,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};


export const useStatistics = (
  modelSource: 'database' | 'redis' = 'database',
) => {
  const modelQuery = useModelStatistics(modelSource);
  const queueQuery = useQueueStatistics();

  return {
    models: modelQuery,
    queues: queueQuery,
    isLoading: modelQuery.isLoading || queueQuery.isLoading,
    isError: modelQuery.isError || queueQuery.isError,
    error: modelQuery.error || queueQuery.error,
    refetch: () => {
      modelQuery.refetch();
      queueQuery.refetch();
    },
  };
};
