/**
 * React Query hook for monitoring memory service health
 * @module @/lib/hooks/use-memory-health
 */

declare module '@/lib/hooks/use-memory-health' {
  import type { UseQueryResult } from '@tanstack/react-query';
  import type { HealthCheckResult } from './types';

  /**
   * Hook for monitoring memory service health status.
   *
   * @param options - Query configuration options
   * @returns React Query result with memory service health data
   */
  export const useMemoryHealth: (options?: {
    refetchInterval?: number;
    enabled?: boolean;
  }) => UseQueryResult<HealthCheckResult, Error>;
}
