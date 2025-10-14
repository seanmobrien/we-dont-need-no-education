/**
 * React Query hooks for email operations
 * @module @/lib/hooks/use-email
 */

declare module '@/lib/hooks/use-email' {
  import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
  import type { EmailMessage } from '@/data-models';

  /**
   * Query keys for email-related queries
   */
  export const emailKeys: {
    all: readonly ['email'];
    email: (id: string) => readonly ['email', 'detail', string];
    stats: () => readonly ['email', 'stats'];
    search: (params: object) => readonly ['email', 'search', object];
  };

  /**
   * Hook for fetching a single email by ID using React Query.
   *
   * @param emailId - The ID of the email to fetch
   * @param options - React Query options for caching and refetch behavior
   * @returns React Query result with email data, loading state, and error state
   */
  export const useEmail: (
    emailId: string | null,
    options?: {
      enabled?: boolean;
      staleTime?: number;
      gcTime?: number;
    },
  ) => UseQueryResult<EmailMessage, Error>;

  /**
   * Hook for updating an email record using React Query mutation.
   *
   * Automatically invalidates related queries on success.
   *
   * @returns React Query mutation result for updating email records
   */
  export const useUpdateEmail: () => UseMutationResult<
    EmailMessage,
    Error,
    { id: string; data: Partial<EmailMessage> },
    unknown
  >;
}
