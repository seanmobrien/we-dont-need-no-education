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
 * import { useMemoryHealth } from '/lib/hooks/use-memory-health';
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
import { fetch } from '/lib/nextjs-util/fetch';
import { LoggedError } from '/lib/react-util/errors/logged-error';
import {
  getRefreshInterval,
  type HealthStatus,
} from '/lib/ai/mem0/types/health-check';

/**
 * @typedef {('ok'|'warning'|'error')} SystemHealthStatus
 * Health status values that can be returned by individual subsystems
 */

/**
 * Memory health response structure from the /api/health endpoint
 *
 * @interface MemoryHealthResponse
 * @description Raw response structure returned by the health check API for memory services.
 * Each subsystem property is optional to handle cases where specific services are unavailable.
 *
 * @example
 * ```typescript
 * // Example API response
 * {
 *   status: 'ok',
 *   db: { status: 'ok' },
 *   vectorStore: { status: 'warning' },
 *   graphStore: { status: 'ok' },
 *   historyStore: { status: 'error' },
 *   authService: { status: 'ok' }
 * }
 * ```
 */
interface MemoryHealthResponse {
  /** Overall memory system health status */
  status: 'ok' | 'warning' | 'error';

  /** Database subsystem health status - optional as service may be unavailable */
  db?: { status: 'ok' | 'warning' | 'error' };

  /** Vector store subsystem health status - optional as service may be unavailable */
  vectorStore?: { status: 'ok' | 'warning' | 'error' };

  /** Graph store subsystem health status - optional as service may be unavailable */
  graphStore?: { status: 'ok' | 'warning' | 'error' };

  /** History store subsystem health status - optional as service may be unavailable */
  historyStore?: { status: 'ok' | 'warning' | 'error' };

  /** Authentication service health status - optional as service may be unavailable */
  authService?: { status: 'ok' | 'warning' | 'error' };
}

/**
 * Detailed memory subsystem status information with guaranteed status values
 *
 * @interface MemorySubsystemStatus
 * @description Normalized subsystem status structure where all properties are required.
 * Missing subsystems from the API response are defaulted to 'error' status to ensure
 * proper error indication in the UI.
 *
 * @example
 * ```typescript
 * const subsystems: MemorySubsystemStatus = {
 *   db: 'ok',
 *   vectorStore: 'warning',
 *   graphStore: 'ok',
 *   historyStore: 'error',
 *   authService: 'ok'
 * };
 * ```
 */
interface MemorySubsystemStatus {
  /** Database connection and query execution status */
  db: 'ok' | 'warning' | 'error';

  /** Vector embedding storage and retrieval status */
  vectorStore: 'ok' | 'warning' | 'error';

  /** Knowledge graph storage and traversal status */
  graphStore: 'ok' | 'warning' | 'error';

  /** Conversation history persistence status */
  historyStore: 'ok' | 'warning' | 'error';

  /** Authentication service availability status */
  authService: 'ok' | 'warning' | 'error';
}

/**
 * Complete health check response structure from the /api/health endpoint
 *
 * @interface HealthCheckResponse
 * @description Top-level health check response that may contain multiple service categories.
 * Currently focused on memory services, but extensible for database, chat, and other services.
 *
 * @example
 * ```typescript
 * const response: HealthCheckResponse = {
 *   memory: {
 *     status: 'ok',
 *     db: { status: 'ok' },
 *     vectorStore: { status: 'warning' }
 *   },
 *   database: { status: 'ok' },
 *   chat: { status: 'warning' }
 * };
 * ```
 */
interface HealthCheckResponse {
  /** Memory service health details - primary focus of this hook */
  memory?: MemoryHealthResponse;

  /** General database service status - future extension point */
  database?: { status: string };

  /** Chat service status - future extension point */
  chat?: { status: string };
}

/**
 * Processed memory health data with normalized status and subsystem details
 *
 * @interface MemoryHealthData
 * @description Final data structure returned by the useMemoryHealth hook after processing
 * the raw API response. Converts API status codes to standard HealthStatus enum values
 * and ensures all subsystems have defined status values.
 *
 * @example
 * ```typescript
 * const healthData: MemoryHealthData = {
 *   status: 'healthy',
 *   subsystems: {
 *     db: 'ok',
 *     vectorStore: 'warning',
 *     graphStore: 'ok',
 *     historyStore: 'error',
 *     authService: 'ok'
 *   }
 * };
 * ```
 */
interface MemoryHealthData {
  /** Overall health status using standardized HealthStatus enum */
  status: HealthStatus;

  /** Detailed status for each memory subsystem */
  subsystems: MemorySubsystemStatus;
}

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
      switch (memoryData.status) {
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
 * @returns {Object} Enhanced query result with additional health-specific properties
 * @returns {HealthStatus} returns.healthStatus - Current overall health status
 * @returns {MemorySubsystemStatus|undefined} returns.subsystems - Individual subsystem statuses
 * @returns {number} returns.refreshInterval - Current refresh interval in milliseconds
 * @returns {boolean} returns.isLoading - True when initial data is being fetched
 * @returns {boolean} returns.isFetching - True when any fetch is in progress
 * @returns {boolean} returns.isError - True when query has encountered an error
 * @returns {Error|null} returns.error - Current error object if query failed
 * @returns {MemoryHealthData|undefined} returns.data - Full health data when available
 *
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
export function useMemoryHealth() {
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
}
