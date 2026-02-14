import { useQuery } from '@tanstack/react-query';
import { fetch } from '@/lib/nextjs-util/fetch';
import { LoggedError } from '@compliance-theater/logger';
import { useFlagState } from '../site-util/feature-flags';
import { useCallback } from 'react';
const fetchMemoryHealth = async () => {
    try {
        const response = await fetch('/api/health', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
        });
        if (!response.ok) {
            throw new Error(`Health check API request failed with status ${response.status}`);
        }
        const data = await response.json();
        const { memory: memoryDataRaw, chat: chatDataRaw, database: databaseDataRaw } = data;
        if (!memoryDataRaw) {
            throw new Error('Memory health status not available in response');
        }
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
        const chatData = {
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
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            context: 'Fetching memory health status',
        });
        throw error;
    }
};
const stableRetryDelay = (attemptIndex) => {
    const baseExponential = Math.min(1000 * 2 ** attemptIndex, 30000);
    const linearIncrease = Math.max(0, attemptIndex - 4) * 30000;
    return baseExponential + Math.min(linearIncrease, 90000);
};
const stableQueryKey = ['memoryHealth'];
export const useMemoryHealth = () => {
    const { enabled: healthCheckEnabled, value: healthCheckConfig, isLoading, } = useFlagState('health_checks');
    const refetchInterval = useCallback((query) => {
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
                return healthCheckConfig?.refresh?.healthy ?? 3 * 60 * 1000;
            case 'warning':
                return healthCheckConfig?.refresh?.warning ?? 30 * 1000;
            case 'error':
                return healthCheckConfig?.refresh?.error ?? 10 * 1000;
            default:
                return 30 * 1000;
        }
    }, [healthCheckConfig?.refresh?.healthy, healthCheckConfig?.refresh?.warning, healthCheckConfig?.refresh?.error]);
    const query = useQuery({
        enabled: !isLoading && healthCheckEnabled === true && healthCheckConfig != null,
        queryKey: stableQueryKey,
        queryFn: fetchMemoryHealth,
        staleTime: healthCheckConfig.staleTime,
        refetchOnWindowFocus: false,
        refetchInterval,
        retry: 3,
        retryDelay: stableRetryDelay,
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
//# sourceMappingURL=use-memory-health.js.map