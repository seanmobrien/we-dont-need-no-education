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

import { Query, useQuery } from '@tanstack/react-query';
import { fetch } from '@/lib/nextjs-util/fetch';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import {
  getRefreshInterval,
  type HealthStatus,
} from '@/lib/ai/mem0/types/health-check';

import type {
  MemoryHealthData,
  MemorySubsystemStatus,
  MemoryStatusHookResult,
  HealthCheckResponse,
} from '@/lib/hooks/types';

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
 * @see {@link MemoryHealthData} for return type structure
 * @see {@link HealthCheckResponse} for raw API response structure
 */
const fetchMemoryHealth = async (): Promise<MemoryHealthData> => {
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

    // Extract memory status from the response
    const memoryData = data.memory;

    if (!memoryData) {
      throw new Error('Memory health status not available in response');
    }

    // Map the API status code to standardized health status enum
    const healthStatus: HealthStatus = (() => {
      switch (memoryData.status as HealthStatus | 'ok') {
        case 'ok':
          return 'healthy';
        case 'warning':
          return 'warning';
        case 'error':
          return 'error';
        default:
          return 'warning'; // Default to warning for unknown status codes
      }
    })();

    // Extract subsystem statuses with error fallbacks for missing services
    const subsystems: MemorySubsystemStatus = {
      db: memoryData.db?.status || 'error',
      vectorStore: memoryData.vectorStore?.status || 'error',
      graphStore: memoryData.graphStore?.status || 'error',
      historyStore: memoryData.historyStore?.status || 'error',
      authService: memoryData.authService?.status || 'error',
    };

    return {
      status: healthStatus,
      subsystems,
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
 * Stable function to calculate refresh interval based on current health status
 *
 * @function stableGetRefreshInterval
 * @description React Query callback that determines how often to refetch health data
 * based on the current health status. Uses stable reference to prevent unnecessary
 * re-renders and query restarts.
 *
 * @param {Query<MemoryHealthData, Error, MemoryHealthData, readonly unknown[]>} query - React Query instance
 * @returns {number} Refresh interval in milliseconds
 *
 * @see {@link getRefreshInterval} for interval calculation logic
 */
const stableGetRefreshInterval = (
  query: Query<MemoryHealthData, Error, MemoryHealthData, readonly unknown[]>,
) => getRefreshInterval(query.state.data?.status || 'warning');

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
 * // Attempt 5+: 30000ms (30s) - capped
 * ```
 */
const stableRetryDelay = (attemptIndex: number) =>
  Math.min(1000 * 2 ** attemptIndex, 30000);

/**
 * Stable query key for React Query caching
 *
 * @constant {readonly ['memoryHealth']} stableQueryKey
 * @description Immutable query key used by React Query for cache identification.
 * Uses const assertion to ensure type safety and reference stability.
 */
const stableQueryKey = ['memoryHealth'] as const;

/**
 * React Query hook for memory health monitoring with adaptive refresh intervals
 *
 * @function useMemoryHealth
 * @description Primary hook for monitoring memory service health status. Automatically
 * adjusts refresh frequency based on current health status - more frequent polling
 * when services are unhealthy, less frequent when all systems are healthy.
 *
 * Features:
 * - Dynamic refresh intervals based on health status
 * - Exponential backoff retry strategy
 * - Automatic error logging and recovery
 * - Stable references to prevent unnecessary re-renders
 * - Window focus refetch disabled to prevent excessive API calls
 *
 * @returns {MemoryStatusHookResult} Enhanced query result with additional health-specific properties
 * @example
 * ```typescript
 * function HealthIndicator() {
 *   const {
 *     healthStatus,
 *     subsystems,
 *     isLoading,
 *     isError,
 *     error,
 *     refreshInterval
 *   } = useMemoryHealth();
 *
 *   if (isLoading) return <Spinner />;
 *   if (isError) return <ErrorAlert error={error} />;
 *
 *   return (
 *     <HealthDashboard
 *       status={healthStatus}
 *       subsystems={subsystems}
 *       refreshRate={refreshInterval}
 *     />
 *   );
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Using in a status badge component
 * function StatusBadge() {
 *   const { healthStatus, subsystems } = useMemoryHealth();
 *
 *   const failingServices = Object.entries(subsystems || {})
 *     .filter(([, status]) => status === 'error')
 *     .map(([name]) => name);
 *
 *   return (
 *     <Badge
 *       color={healthStatus === 'healthy' ? 'success' : 'error'}
 *       tooltip={
 *         failingServices.length > 0
 *           ? `Failing: ${failingServices.join(', ')}`
 *           : 'All systems operational'
 *       }
 *     >
 *       {healthStatus}
 *     </Badge>
 *   );
 * }
 * ```
 *
 * @see {@link MemoryHealthData} for data structure details
 * @see {@link fetchMemoryHealth} for underlying API call implementation
 * @see {@link getRefreshInterval} for refresh interval calculation
 */
export const useMemoryHealth = (): MemoryStatusHookResult => {
  const query = useQuery<MemoryHealthData, Error>({
    queryKey: stableQueryKey,
    queryFn: fetchMemoryHealth,
    staleTime: 1000, // Consider data stale after 1 second for real-time monitoring
    refetchOnWindowFocus: false, // Prevent excessive API calls on window focus
    refetchInterval: stableGetRefreshInterval, // Dynamic refresh based on health status
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: stableRetryDelay, // Exponential backoff with 30s maximum
  });

  // Extract commonly used values with safe defaults
  const healthStatus = query.data?.status || 'warning';
  const subsystems = query.data?.subsystems;
  const refreshInterval = getRefreshInterval(healthStatus);

  return {
    ...query,
    healthStatus,
    subsystems,
    refreshInterval,
  };
};
