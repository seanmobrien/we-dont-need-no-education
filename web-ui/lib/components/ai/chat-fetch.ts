import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { log } from '@/lib/logger';

interface ChatFetchOptions {
  api: string;
  headers?: Record<string, string>;
  data?: Record<string, unknown>;
  onSuccess?: (response: Response) => void;
  onError?: (error: Error) => void;
  onStart?: () => void;
}

/**
 * Custom fetch implementation for chat operations using TanStack React Query.
 * 
 * This provides enhanced reliability, reporting, and caching for chat API calls
 * while maintaining compatibility with streaming responses and existing error handling.
 */
export const useChatFetch = () => {
  const queryClient = useQueryClient();

  const chatMutation = useMutation({
    mutationFn: async ({ 
      api, 
      headers = {}, 
      data = {} 
    }: Pick<ChatFetchOptions, 'api' | 'headers' | 'data'>) => {
      log((l) => l.info('Chat fetch initiated', { api, data: Object.keys(data) }));
      
      const response = await fetch(api, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`HTTP ${response.status}: ${errorText}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any).status = response.status;
        throw error;
      }

      return response;
    },
    onSuccess: (response, variables) => {
      log((l) => l.info('Chat fetch successful', { 
        api: variables.api, 
        status: response.status 
      }));
      
      // Invalidate any related chat queries to ensure fresh data
      queryClient.invalidateQueries({ 
        queryKey: ['chat'], 
        exact: false 
      });
    },
    onError: (error, variables) => {
      log((l) => l.error('Chat fetch failed', { 
        api: variables.api, 
        error: error.message,
        status: (error as { status?: number })?.status 
      }));
    },
    // Set a reasonable timeout for chat operations
    meta: {
      timeout: 180000, // 3 minutes to match API maxDuration
    },
  });

  const executeChatFetch = useCallback(
    async (options: ChatFetchOptions): Promise<Response> => {
      const { api, headers, data, onSuccess, onError, onStart } = options;
      
      try {
        onStart?.();
        
        const response = await chatMutation.mutateAsync({
          api,
          headers,
          data,
        });
        
        onSuccess?.(response);
        return response;
        
      } catch (error) {
        const chatError = error instanceof Error ? error : new Error(String(error));
        onError?.(chatError);
        throw chatError;
      }
    },
    [chatMutation]
  );

  return {
    executeChatFetch,
    isLoading: chatMutation.isPending,
    error: chatMutation.error,
    reset: chatMutation.reset,
    // Expose mutation state for advanced use cases
    mutation: chatMutation,
  };
};

/**
 * Hook to get chat query metrics and status for monitoring/reporting
 */
export const useChatQueryMetrics = () => {
  const queryClient = useQueryClient();
  
  const getChatMetrics = useCallback(() => {
    const queryCache = queryClient.getQueryCache();
    const chatQueries = queryCache.findAll({ 
      queryKey: ['chat'],
      exact: false 
    });
    
    const metrics = {
      totalQueries: chatQueries.length,
      activeQueries: chatQueries.filter(q => q.state.fetchStatus === 'fetching').length,
      errorQueries: chatQueries.filter(q => q.state.status === 'error').length,
      successQueries: chatQueries.filter(q => q.state.status === 'success').length,
      lastActivity: Math.max(...chatQueries.map(q => q.state.dataUpdatedAt)),
    };
    
    return metrics;
  }, [queryClient]);
  
  return { getChatMetrics };
};