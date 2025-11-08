/**
 * @fileoverview Chat Health Check Hook
 *
 * This module provides React Query hooks for monitoring chat service health status.
 *
 * @module lib/hooks/use-chat-health
 * @version 1.0.0
 */

import { Query, useQuery } from '@tanstack/react-query';
import { fetch } from '@/lib/nextjs-util/fetch';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { ChatHealthData, ChatHealthHookResponse } from './types';

/**
 * Chat health status type
 */
type ChatHealthStatus = 'ok' | 'warning' | 'error';

/**
 * Chat health response structure from the /api/health endpoint
 */
interface ChatHealthResponse {
  status: ChatHealthStatus;
  cache?: { status: ChatHealthStatus };
  queue?: { status: ChatHealthStatus };
}

/**
 * Complete health check response structure
 */
interface HealthCheckResponse {
  chat?: ChatHealthResponse;
}

/**
 * Fetches chat health status from the API health endpoint
 */
const fetchChatHealth = async (): Promise<ChatHealthData> => {
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
    const chatData = data.chat;

    if (!chatData) {
      throw new Error('Chat health status not available in response');
    }

    return {
      status: chatData.status,
      subsystems: {
        cache: chatData.cache?.status || 'error',
        queue: chatData.queue?.status || 'error',
      },
    };
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      context: 'Fetching chat health status',
    });
    throw error;
  }
};

/**
 * Get refresh interval based on health status (in milliseconds)
 */
const getRefreshInterval = (status: ChatHealthStatus): number => {
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
  query: Query<ChatHealthData, Error, ChatHealthData, readonly unknown[]>,
) => getRefreshInterval(query.state.data?.status || 'warning');

/**
 * Stable retry delay calculator with exponential backoff
 */
const stableRetryDelay = (attemptIndex: number) =>
  Math.min(1000 * 2 ** attemptIndex, 30000);

/**
 * Stable query key for React Query caching
 */
const stableQueryKey = ['chatHealth'] as const;


export const useChatHealth = (): ChatHealthHookResponse => {
  const query = useQuery<ChatHealthData, Error>({
    queryKey: stableQueryKey,
    queryFn: fetchChatHealth,
    staleTime: 1000,
    refetchOnWindowFocus: false,
    refetchInterval: stableGetRefreshInterval,
    retry: 3,
    retryDelay: stableRetryDelay,
  });

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
