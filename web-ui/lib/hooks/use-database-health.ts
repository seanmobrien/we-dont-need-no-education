/**
 * @fileoverview Database Health Check Hook
 *
 * This module provides React Query hooks for monitoring database service health status.
 * 
 * @module lib/hooks/use-database-health
 * @version 1.0.0
 */

import { Query, useQuery } from '@tanstack/react-query';
import { fetch } from '/lib/nextjs-util/fetch';
import { LoggedError } from '/lib/react-util/errors/logged-error';

/**
 * Database health status type
 */
type DatabaseHealthStatus = 'ok' | 'warning' | 'error';

/**
 * Database health response structure from the /api/health endpoint
 */
interface DatabaseHealthResponse {
  status: DatabaseHealthStatus;
}

/**
 * Complete health check response structure
 */
interface HealthCheckResponse {
  database?: DatabaseHealthResponse;
}

/**
 * Fetches database health status from the API health endpoint
 */
const fetchDatabaseHealth = async (): Promise<DatabaseHealthStatus> => {
  try {
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
    const databaseData = data.database;

    if (!databaseData) {
      throw new Error('Database health status not available in response');
    }

    return databaseData.status;
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      context: 'Fetching database health status',
    });
    throw error;
  }
};

/**
 * Get refresh interval based on health status (in milliseconds)
 */
const getRefreshInterval = (status: DatabaseHealthStatus): number => {
  switch (status) {
    case 'ok':
      return 180000; // 3 minutes
    case 'warning':
      return 30000; // 30 seconds
    case 'error':
      return 5000; // 5 seconds
    default:
      return 30000; // Default to 30 seconds
  }
};

/**
 * Stable function to calculate refresh interval
 */
const stableGetRefreshInterval = (
  query: Query<DatabaseHealthStatus, Error, DatabaseHealthStatus, readonly unknown[]>,
) => getRefreshInterval(query.state.data || 'warning');

/**
 * Stable retry delay calculator with exponential backoff
 */
const stableRetryDelay = (attemptIndex: number) =>
  Math.min(1000 * 2 ** attemptIndex, 30000);

/**
 * Stable query key for React Query caching
 */
const stableQueryKey = ['databaseHealth'] as const;

/**
 * React Query hook for database health monitoring
 */
export function useDatabaseHealth() {
  const query = useQuery<DatabaseHealthStatus, Error>({
    queryKey: stableQueryKey,
    queryFn: fetchDatabaseHealth,
    staleTime: 1000,
    refetchOnWindowFocus: false,
    refetchInterval: stableGetRefreshInterval,
    retry: 3,
    retryDelay: stableRetryDelay,
  });

  const healthStatus = query.data || 'warning';
  const refreshInterval = getRefreshInterval(healthStatus);

  return {
    ...query,
    healthStatus,
    refreshInterval,
  };
}
