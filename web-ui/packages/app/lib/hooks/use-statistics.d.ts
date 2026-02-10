/**
 * React Query hooks for fetching AI model and queue statistics
 * @module @/lib/hooks/use-statistics
 */

import type {
  ModelStat,
  QueueInfo,
  QueueSummary,
} from '../../types/statistics';
import type { UseQueryResult } from '@tanstack/react-query';

declare module '@/lib/hooks/use-statistics' {
  /**
   * Hook for fetching model statistics using React Query.
   *
   * Automatically refetches every 30 seconds and provides retry logic with exponential backoff.
   *
   * @param source - Data source: 'database' for real-time or 'redis' for cached stats
   * @returns React Query result with model statistics data
   */
  export function useModelStatistics(
    source?: 'database' | 'redis',
  ): UseQueryResult<ModelStat[], Error>;

  /**
   * Hook for fetching queue statistics using React Query.
   *
   * Automatically refetches every 30 seconds with retry logic.
   *
   * @returns React Query result with queue statistics data
   */
  export function useQueueStatistics(): UseQueryResult<
    {
      summary: QueueSummary;
      queues: QueueInfo[];
    },
    Error
  >;

  /**
   * Hook for fetching both model and queue statistics.
   *
   * Combines useModelStatistics and useQueueStatistics into a single interface.
   *
   * @param modelSource - Data source for model stats: 'database' or 'redis'
   * @returns Combined query results with loading states and refetch function
   */
  export function useStatistics(modelSource?: 'database' | 'redis'): {
    models: UseQueryResult<ModelStat[], Error>;
    queues: UseQueryResult<
      {
        summary: QueueSummary;
        queues: QueueInfo[];
      },
      Error
    >;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
  };
}
