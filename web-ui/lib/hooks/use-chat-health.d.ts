/**
 * React Query hook for monitoring AI chat service health
 * @module @/lib/hooks/use-chat-health
 */

declare module '@/lib/hooks/use-chat-health' {
  import type { UseQueryResult } from '@tanstack/react-query';
  import type { HealthCheckResult } from './types';

  /**
   * Hook for monitoring chat service health status.
   *
   * Polls the health endpoint and returns structured health data.
   *
   * @param options - Query configuration options
   * @returns React Query result with health check data
   */
  export const useChatHealth: (options?: {
    refetchInterval?: number;
    enabled?: boolean;
  }) => UseQueryResult<HealthCheckResult, Error>;
}
