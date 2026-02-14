import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEmail, writeEmailRecord } from '@/lib/api/client';
import { LoggedError } from '@compliance-theater/logger';
export const emailKeys = {
    all: ['email'],
    email: (id) => [...emailKeys.all, 'detail', id],
    stats: () => [...emailKeys.all, 'stats'],
    search: (params) => [...emailKeys.all, 'search', params],
};
export const useEmail = (emailId, options) => {
    return useQuery({
        queryKey: emailId ? emailKeys.email(emailId) : [],
        queryFn: async () => {
            if (!emailId) {
                throw new Error('Email ID is required');
            }
            try {
                return await getEmail(emailId);
            }
            catch (error) {
                throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'useEmail',
                    data: { emailId },
                });
            }
        },
        enabled: !!emailId && (options?.enabled ?? true),
        staleTime: options?.staleTime ?? 30 * 1000,
        gcTime: options?.gcTime ?? 5 * 60 * 1000,
        retry: (failureCount, error) => {
            if (error instanceof Error && 'status' in error) {
                const status = error.status;
                if (status >= 400 && status < 500) {
                    return false;
                }
            }
            return failureCount < 3;
        },
    });
};
export const useWriteEmail = (options) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (email) => {
            try {
                return await writeEmailRecord(email);
            }
            catch (error) {
                throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'useWriteEmail',
                    data: { emailId: email.emailId },
                });
            }
        },
        onSuccess: (data) => {
            queryClient.setQueryData(emailKeys.email(data.emailId), data);
            queryClient.invalidateQueries({
                queryKey: emailKeys.all,
                predicate: (query) => {
                    return !query.queryKey.includes(data.emailId);
                },
            });
            options?.onSuccess?.(data);
        },
        onError: (error) => {
            options?.onError?.(error);
        },
        retry: (failureCount, error) => {
            if (error instanceof Error && 'status' in error) {
                const status = error.status;
                if (status >= 400 && status < 500) {
                    return false;
                }
            }
            return failureCount < 2;
        },
    });
};
export const usePrefetchEmail = () => {
    const queryClient = useQueryClient();
    return (emailId) => {
        queryClient.prefetchQuery({
            queryKey: emailKeys.email(emailId),
            queryFn: () => getEmail(emailId),
            staleTime: 30 * 1000,
        });
    };
};
//# sourceMappingURL=use-email.js.map