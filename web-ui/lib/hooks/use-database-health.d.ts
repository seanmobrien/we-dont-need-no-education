/**
 * React Query hook for monitoring database health
 * @module @/lib/hooks/use-database-health
 */

declare module '@/lib/hooks/use-database-health' {
  import type { UseQueryResult } from '@tanstack/react-query';
  import type { HealthCheckResult } from './types';

  /**
   * Hook for monitoring database health status.
   *
   * @param options - Query configuration options
   * @returns React Query result with database health data
   */
  export const useDatabaseHealth: (options?: {
    refetchInterval?: number;
    enabled?: boolean;
  }) => UseQueryResult<HealthCheckResult, Error>;
}
