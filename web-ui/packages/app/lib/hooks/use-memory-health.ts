/**
 * @fileoverview Memory Health Check Hook
 *
 * This module provides React Query hooks for monitoring memory service health status
 * with automatic refresh intervals that adapt based on the current health status.
 * The health monitoring system tracks multiple subsystems including database,
 * vector store, graph store, history store, and authentication service.
 *
 * @module lib/hooks/use-memory-health
 * @version 1.0.0
 * @since 2025-09-27
 *
 * @example
 * ```typescript
 * import { useMemoryHealth } from '@/lib/hooks/use-memory-health';
 *
 * function HealthMonitor() {
 *   const { healthStatus, subsystems, isLoading, error } = useMemoryHealth();
 *
 *   if (isLoading) return <div>Checking health...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       <p>Overall Status: {healthStatus}</p>
 *       <p>Database: {subsystems?.db}</p>
 *       <p>Vector Store: {subsystems?.vectorStore}</p>
 *     </div>
 *   );
 * }
 * ```
 */

import { useQuery } from '@tanstack/react-query';
import { fetch } from '@compliance-theater/nextjs/fetch';
import { LoggedError } from '@compliance-theater/logger';
import type {
  MemoryStatusHookResult,
  HealthCheckResponse,
  ChatHealthData,
} from '@/lib/hooks/types';
import { useFlagState } from '@compliance-theater/feature-flags';
import { useCallback } from 'react';

/**
 * Fetches memory health status from the API health endpoint
 *
 * @async
 * @function fetchMemoryHealth
 * @description Retrieves current health status for memory services and all subsystems.
 * Performs API request to /api/health endpoint, processes the response, and normalizes
 * status values. Missing subsystems are defaulted to 'error' status to ensure proper
 * error indication in the UI.
 *
 * @returns {Promise<MemoryHealthData>} Promise that resolves to processed health data
 * @throws {Error} When API request fails or memory data is unavailable
 *
 * @example
 * ```typescript
 * try {
 *   const health = await fetchMemoryHealth();
 *   console.log('Overall status:', health.status);
 *   console.log('DB status:', health.subsystems.db);
 * } catch (error) {
 *   console.error('Health check failed:', error.message);
 * }
 * ```
 *
 * @see {@link MemoryStatusHookResult} for return type structure
 * @see {@link HealthCheckResponse} for raw API response structure
 */
const fetchMemoryHealth = async (): Promise<MemoryStatusHookResult['health']> => {
  try {
    // Fetch health status with no-cache to ensure fresh data
    const response = await fetch('/api/health', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(
        `Health check API request failed with status ${response.status}`,
      );
    }

    const data: HealthCheckResponse = await response.json();
    const { memory: memoryDataRaw, chat: chatDataRaw, database: databaseDataRaw } = data;
    if (!memoryDataRaw) {
      throw new Error('Memory health status not available in response');
    }

    // Extract memory status from the response
    const memoryData = {
      status: memoryDataRaw.status || 'error',
      subsystems: {
        db: memoryDataRaw.db?.status || 'error',
        vectorStore: memoryDataRaw.vectorStore?.status || 'error',
        graphStore: memoryDataRaw.graphStore?.status || 'error',
        historyStore: memoryDataRaw.historyStore?.status || 'error',
        authService: memoryDataRaw.authService?.status || 'error',
      },
    };

    const chatData: ChatHealthData = {
      status: chatDataRaw?.status || 'error',
      subsystems: {
        cache: chatDataRaw?.cache?.status || 'error',
        queue: chatDataRaw?.queue?.status || 'error',
        tools: chatDataRaw?.tools?.status || 'error',
      }
    };

    const databaseStatus = databaseDataRaw?.status || 'error';

    return {
      memory: memoryData,
      chat: chatData,
      database: databaseStatus,
    };
  } catch (error) {
    // Log error with context for debugging purposes
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      context: 'Fetching memory health status',
    });
    throw error;
  }
};

/**
 * Stable exponential backoff retry delay calculator
 *
 * @function stableRetryDelay
 * @description Calculates retry delay using exponential backoff with maximum cap.
 * Uses stable reference to prevent React Query from recreating retry configuration.
 *
 * @param {number} attemptIndex - Zero-based retry attempt number
 * @returns {number} Delay in milliseconds before next retry attempt
 *
 * @example
 * ```typescript
 * // Attempt 0: 1000ms (1s)
 * // Attempt 1: 2000ms (2s)
 * // Attempt 2: 4000ms (4s)
 * // Attempt 3: 8000ms (8s)
 * // Attempt 4: 16000ms (16s)
 * // Attempt 5: 30000ms (30s) 
 * // Attempt 6: 60000ms (60s)
 * // Attempt 7: 90000ms (90s)
 * // Attempt 8: 120000ms (120s) (capped)
 * ```
 */
const stableRetryDelay = (attemptIndex: number) => {
  const baseExponential = Math.min(1000 * 2 ** attemptIndex, 30000); // Caps at 30s
  const linearIncrease = Math.max(0, attemptIndex - 4) * 30000; // Starts adding 30s (60s total) from attempt 5 (index 4)
  return baseExponential + Math.min(linearIncrease, 90000); // Caps linear increase at 90s (120s total)
};

/**
 * Stable query key for React Query caching
 *
 * @constant {readonly ['memoryHealth']} stableQueryKey
 * @description Immutable query key used by React Query for cache identification.
 * Uses const assertion to ensure type safety and reference stability.
 */
const stableQueryKey = ['memoryHealth'] as const;

export const useMemoryHealth = (): MemoryStatusHookResult => {
  const {
    enabled: healthCheckEnabled,
    value: healthCheckConfig,
    isLoading,
  } = useFlagState('health_checks');
  const refetchInterval = useCallback((query: { state: { data?: { [key: string]: { status: string } | string } } }) => {
    const mostSevereStatus = Object.values(query.state.data ?? {})
      .reduce((acc, x) => {
        const check = typeof x === 'string' ? x : x.status;
        switch (check) {
          case 'healthy':
            return acc;
          case 'warning':
            return acc === 'error' ? acc : check;
          case 'error':
            return check;
          default:
            return acc === 'healthy' ? 'warning' : acc;
        }
      }, 'healthy');

    switch (mostSevereStatus) {
      case 'healthy':
        return healthCheckConfig?.refresh?.healthy ?? 3 * 60 * 1000; // 3 minutes
      case 'warning':
        return healthCheckConfig?.refresh?.warning ?? 30 * 1000; // 30 seconds
      case 'error':
        return healthCheckConfig?.refresh?.error ?? 10 * 1000; // 5 seconds
      default:
        return 30 * 1000; // Default to 30 seconds
    }
  }, [healthCheckConfig?.refresh?.healthy, healthCheckConfig?.refresh?.warning, healthCheckConfig?.refresh?.error]);

  const query = useQuery<MemoryStatusHookResult['health'], Error>({
    enabled: !isLoading && healthCheckEnabled === true && healthCheckConfig != null,
    queryKey: stableQueryKey,
    queryFn: fetchMemoryHealth,
    staleTime: healthCheckConfig!.staleTime,
    refetchOnWindowFocus: false, // Prevent excessive API calls on window focus
    refetchInterval, // Dynamic refresh based on health status
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: stableRetryDelay, // Exponential backoff with 30s maximum
  });



  if (!healthCheckEnabled || !healthCheckConfig) {
    return {
      health: {
        memory: {
          status: 'healthy',
          subsystems: {
            db: 'healthy',
            vectorStore: 'healthy',
            graphStore: 'healthy',
            historyStore: 'healthy',
            authService: 'healthy',
          },
        },
        chat: {
          status: 'healthy',
          subsystems: {
            cache: 'healthy',
            queue: 'healthy',
            tools: 'healthy',
          },
        },
        database: 'healthy'
      },
      refreshInterval: Infinity,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    };
  }
  const thisRefreshInterval = refetchInterval({ state: { data: query.data } });
  return {
    ...query,
    health: {
      memory: query.data?.memory ?? { status: 'error', subsystems: { db: 'error', vectorStore: 'error', graphStore: 'error', historyStore: 'error', authService: 'error' } },
      chat: query.data?.chat ?? { status: 'error', subsystems: { cache: 'error', queue: 'error', tools: 'error' } },
      database: query.data?.database ?? 'error',
    },
    refreshInterval: thisRefreshInterval,
  };
};
