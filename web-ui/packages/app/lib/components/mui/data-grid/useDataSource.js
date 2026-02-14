import { isTruthy } from '@/lib/react-util/utility-methods';
import { isError, LoggedError, log } from '@compliance-theater/logger';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetch } from '@/lib/nextjs-util/fetch';
import { useQuery, useMutation, useQueryClient, } from '@tanstack/react-query';
const createQueryKey = (url, page, pageSize, sortModel, filterModel) => {
    return ['dataGrid', url, page, pageSize, sortModel, filterModel];
};
const fetchGridData = async (url, page, pageSize, sortModel, filterModel) => {
    const urlWithParams = new URL(url);
    if (pageSize) {
        urlWithParams.searchParams.set('num', pageSize.toString());
    }
    if (page) {
        urlWithParams.searchParams.set('page', (page + 1).toString());
    }
    if (sortModel?.length) {
        const sortParams = sortModel
            .map(({ field, sort }) => `${field}:${sort}`)
            .join(',');
        urlWithParams.searchParams.set('sort', sortParams);
    }
    if (filterModel?.items?.length ?? filterModel?.quickFilterValues?.length) {
        urlWithParams.searchParams.set('filter', JSON.stringify(filterModel));
    }
    const response = await fetch(urlWithParams.toString());
    if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
    }
    const parsed = await response.json();
    if (!parsed) {
        throw new Error('No data returned from API');
    }
    if (typeof parsed === 'object') {
        if ('rows' in parsed) {
            return parsed;
        }
        if ('results' in parsed) {
            const result = {
                rows: parsed.results,
            };
            if ('pageStats' in parsed &&
                typeof parsed.pageStats === 'object' &&
                !!parsed.pageStats &&
                'total' in parsed.pageStats) {
                result.rowCount = Number(parsed.pageStats.total);
            }
            return result;
        }
    }
    throw new Error('Unexpected data format received from API', {
        cause: parsed,
    });
};
export const useDataSource = ({ url: urlFromProps, }) => {
    const [currentQueryParams, setCurrentQueryParams] = useState(null);
    let url = urlFromProps;
    if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const isDrizzle = isTruthy(searchParams.get('drizzle'));
        if (isDrizzle) {
            const baseUrl = new URL(urlFromProps, window.location.origin);
            url = new URL(new URL(baseUrl.pathname + '/drizzle', window.location.origin));
        }
        else {
            url = urlFromProps;
        }
    }
    const [hasMounted, setHasMounted] = useState(false);
    const pendingQueries = useRef([]);
    useEffect(() => {
        if (!hasMounted) {
            setHasMounted(true);
        }
    }, [hasMounted]);
    const queryClient = useQueryClient();
    const { isLoading, isSuccess, isPending, error: queryError, data, } = useQuery({
        queryKey: currentQueryParams
            ? createQueryKey(String(url), currentQueryParams?.page, currentQueryParams?.pageSize, currentQueryParams?.sortModel, currentQueryParams?.filterModel)
            : ['dataGrid', String(url)],
        queryFn: async () => {
            return await fetchGridData(String(url), currentQueryParams?.page, currentQueryParams?.pageSize, currentQueryParams?.sortModel, currentQueryParams?.filterModel);
        },
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        enabled: hasMounted && !!currentQueryParams && !!url,
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: (failureCount, error) => {
            let willRetry = failureCount < 3;
            if (error instanceof Error && 'status' in error) {
                const status = error.status;
                if (status >= 400 && status < 500) {
                    willRetry = false;
                }
            }
            if (willRetry) {
                log((l) => l.warn({
                    message: `An unexpected error occurred while loading data; there are ${3 - failureCount} retries remaining.  Details: ${isError(error) ? error.message : String(error)}`,
                    source: 'grid::dataSource',
                    data: error,
                }));
            }
            else {
                LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'grid::dataSource',
                    data: error,
                });
            }
            return willRetry;
        },
    });
    useEffect(() => {
        if (isPending) {
            return;
        }
        const cancelQueries = (error) => {
            log((l) => l.verbose('Cleaning up pending queries', 'error', error, 'url', url, 'currentQueryParams', currentQueryParams));
            pendingQueries.current.forEach(([, reject]) => {
                try {
                    reject(error);
                }
                catch (noOp) {
                }
            });
            pendingQueries.current = [];
        };
        if (isSuccess && data) {
            log((l) => l.verbose('useDataSource::query resolved with data', data, 'url', url, 'currentQueryParams', currentQueryParams));
            pendingQueries.current.forEach(([resolve]) => resolve(data));
            pendingQueries.current = [];
            return;
        }
        if (queryError && pendingQueries.current.length > 0) {
            cancelQueries(queryError);
            return;
        }
        return () => {
            if (!pendingQueries.current?.length) {
                return;
            }
            cancelQueries(new Error('Component unmounted or query state changed'));
        };
    }, [isSuccess, queryError, data, url, currentQueryParams, isPending]);
    const updateRowMutation = useMutation({
        mutationFn: async (params) => {
            const response = await fetch(String(url), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params.updatedRow),
            });
            if (!response.ok) {
                throw new Error(`Failed to update row: ${response.statusText}`);
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['dataGrid', String(url)],
            });
        },
        onError: (error) => {
            const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: false,
                source: 'grid::dataSource::update',
            });
            log((l) => l.error('useDataSource::updateRowMutation::error', le.message, 'url', url));
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
    const updateRow = useCallback(async (params) => {
        try {
            return await updateRowMutation.mutateAsync(params);
        }
        catch (err) {
            throw err;
        }
    }, [updateRowMutation]);
    const onDataSourceError = useCallback((error) => {
        if (!Object.is(error, queryError)) {
            log((l) => l.warn('onDataSourceError::error is not query error...', { error }));
        }
    }, [queryError]);
    const getRows = useCallback((props) => {
        try {
            const { paginationModel: { pageSize = 10, page = 0, } = {}, sortModel = [], filterModel = { items: [] }, } = props;
            setCurrentQueryParams((current) => {
                if (!current ||
                    current.page !== page ||
                    current.pageSize !== pageSize ||
                    JSON.stringify(current.sortModel) !== JSON.stringify(sortModel) ||
                    JSON.stringify(current.filterModel) !== JSON.stringify(filterModel)) {
                    return {
                        page,
                        pageSize,
                        sortModel,
                        filterModel,
                    };
                }
                return current;
            });
            const queryKey = createQueryKey(String(url), page, pageSize, sortModel, filterModel);
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    try {
                        if (isSuccess) {
                            log((l) => l.warn('getRows::query timed out - resolving with last known good data to prevent promise memory leak', 'queryKey', queryKey, 'url', url));
                            resolve(data);
                        }
                        log((l) => l.warn('getRows::query timed out - rejecting promise', 'queryKey', queryKey, 'url', url));
                        reject(new Error(`Query for ${queryKey.join(', ')} timed out after 30 seconds`));
                    }
                    catch (err) {
                        log((l) => l.warn('Unexpected error caught in getRows proxy resolution.', err));
                    }
                }, 60 * 1000);
                const wrapCleanup = (cb) => {
                    return (arg) => {
                        clearTimeout(timeout);
                        return cb(arg);
                    };
                };
                pendingQueries.current.push([
                    wrapCleanup(resolve),
                    wrapCleanup(reject),
                ]);
            });
        }
        catch (err) {
            log((l) => l.verbose('getRows::error occurred - rethrowing to react query for disposition', err));
            throw err;
        }
    }, [url, isSuccess, data, setCurrentQueryParams]);
    return useMemo(() => {
        return {
            getRows,
            updateRow,
            onDataSourceError,
            isLoading: isLoading || updateRowMutation.isPending,
            loadError: queryError ? queryError.message : null,
        };
    }, [
        getRows,
        updateRow,
        onDataSourceError,
        isLoading,
        updateRowMutation.isPending,
        queryError,
    ]);
};
//# sourceMappingURL=useDataSource.js.map