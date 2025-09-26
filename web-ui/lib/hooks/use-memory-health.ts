/**
 * Memory Health Check Hook
 * =======================
 * 
 * React Query hook for monitoring memory service health status with automatic
 * refresh intervals based on health status.
 */

import { useQuery } from '@tanstack/react-query';
import { fetch } from '@/lib/nextjs-util/fetch';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { 
  getRefreshInterval, 
  type HealthStatus 
} from '@/lib/ai/mem0/types/health-check';

/**
 * Memory health response structure from /api/health endpoint
 */
interface MemoryHealthResponse {
  status: 'ok' | 'warning' | 'error';
}

/**
 * Complete health check response structure
 */
interface HealthCheckResponse {
  memory?: MemoryHealthResponse;
  database?: { status: string };
  chat?: { status: string };
}

/**
 * Fetches memory health status from the API health endpoint
 */
const fetchMemoryHealth = async (): Promise<HealthStatus> => {
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Health check API request failed with status ${response.status}`);
    }

    const data: HealthCheckResponse = await response.json();
    
    // Extract memory status from the response
    const memoryStatus = data.memory?.status;
    
    if (!memoryStatus) {
      throw new Error('Memory health status not available in response');
    }

    // Map the status code to health status
    switch (memoryStatus) {
      case 'ok':
        return 'healthy';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'warning'; // Default to warning for unknown status
    }
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      context: 'Fetching memory health status',
    });
    throw error;
  }
};

/**
 * React Query hook for memory health monitoring with dynamic refresh intervals
 * 
 * @returns Query result with health status and dynamic refresh behavior
 */
export function useMemoryHealth() {
  const query = useQuery<HealthStatus, Error>({
    queryKey: ['memoryHealth'],
    queryFn: fetchMemoryHealth,
    staleTime: 1000, // Consider data stale after 1 second
    refetchOnWindowFocus: false,
    refetchInterval: (data) => getRefreshInterval(data || 'warning'),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const healthStatus = query.data || 'warning';
  const refreshInterval = getRefreshInterval(healthStatus);

  return {
    ...query,
    healthStatus,
    refreshInterval,
  };
}