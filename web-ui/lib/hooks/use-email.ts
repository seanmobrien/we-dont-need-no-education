import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { EmailMessage } from '@/data-models';
import { getEmail, writeEmailRecord } from '@/lib/api/client';
import { LoggedError } from '@/lib/react-util';

// Query keys for email-related queries
export const emailKeys = {
  all: ['email'] as const,
  email: (id: string) => [...emailKeys.all, 'detail', id] as const,
  stats: () => [...emailKeys.all, 'stats'] as const,
  search: (params: object) => [...emailKeys.all, 'search', params] as const,
};

/**
 * Hook for fetching a single email by ID using React Query
 * 
 * @param emailId - The ID of the email to fetch
 * @param options - Additional React Query options
 * @returns React Query result with email data, loading state, and error state
 */
export const useEmail = (
  emailId: string | null,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
  }
) => {
  return useQuery({
    queryKey: emailId ? emailKeys.email(emailId) : [],
    queryFn: async () => {
      if (!emailId) {
        throw new Error('Email ID is required');
      }
      
      try {
        return await getEmail(emailId);
      } catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'useEmail',
          data: { emailId },
        });
      }
    },
    enabled: !!emailId && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? 30 * 1000, // 30 seconds
    gcTime: options?.gcTime ?? 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error instanceof Error && 'status' in error) {
        const status = (error as Error & { status: number }).status;
        if (status >= 400 && status < 500) {
          return false;
        }
      }
      return failureCount < 3;
    },
  });
};

/**
 * Hook for writing (creating or updating) email records using React Query mutation
 * 
 * @param options - Configuration options for the mutation
 * @returns React Query mutation result with mutate function and state
 */
export const useWriteEmail = (options?: {
  onSuccess?: (data: EmailMessage) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      email: Omit<EmailMessage, 'emailId'> & Partial<Pick<EmailMessage, 'emailId'>>
    ) => {
      try {
        return await writeEmailRecord(email);
      } catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'useWriteEmail',
          data: { emailId: email.emailId },
        });
      }
    },
    onSuccess: (data) => {
      // Update the email cache with the new data
      queryClient.setQueryData(emailKeys.email(data.emailId), data);
      
      // Invalidate email list queries to ensure they're refreshed
      queryClient.invalidateQueries({
        queryKey: emailKeys.all,
        predicate: (query) => {
          // Don't invalidate the specific email we just updated
          return !query.queryKey.includes(data.emailId);
        },
      });

      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error instanceof Error && 'status' in error) {
        const status = (error as Error & { status: number }).status;
        if (status >= 400 && status < 500) {
          return false;
        }
      }
      return failureCount < 2;
    },
  });
};

/**
 * Hook for prefetching an email
 * Useful for optimistic loading when user hovers over links
 * 
 * @param emailId - The ID of the email to prefetch
 */
export const usePrefetchEmail = () => {
  const queryClient = useQueryClient();

  return (emailId: string) => {
    queryClient.prefetchQuery({
      queryKey: emailKeys.email(emailId),
      queryFn: () => getEmail(emailId),
      staleTime: 30 * 1000, // 30 seconds
    });
  };
};