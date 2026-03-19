import type {
  MutationOptions as CompatMutationOptions,
  QueryKey as CompatQueryKey,
  QueryOptions as CompatQueryOptions,
  UseMutationResult,
  UseQueryResult,
  UseSuspenseQueryResult,
} from './contracts';
import type {
  QueryFunctionContext as TanstackQueryFunctionContext,
  QueryKey as TanstackQueryKey,
  UseMutationResult as TanstackUseMutationResult,
  UseQueryOptions as TanstackUseQueryOptions,
  UseQueryResult as TanstackUseQueryResult,
  UseSuspenseQueryOptions as TanstackUseSuspenseQueryOptions,
  UseSuspenseQueryResult as TanstackUseSuspenseQueryResult,
} from '@tanstack/react-query';

export const toTanstackQueryKey = (
  queryKey: CompatQueryKey,
): TanstackQueryKey => queryKey as TanstackQueryKey;

export const toTanstackQueryOptions = <
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends CompatQueryKey = CompatQueryKey,
>(
  options: CompatQueryOptions<TQueryFnData, TError, TQueryKey>,
): TanstackUseQueryOptions<TQueryFnData, TError, TData, TanstackQueryKey> => {
  const refetchIntervalCallback =
    typeof options.refetchInterval === 'function'
      ? options.refetchInterval
      : undefined;
  const refetchInterval =
    refetchIntervalCallback
      ? (query: { state: { data?: TQueryFnData } }) =>
          refetchIntervalCallback({
            state: {
              data: query.state.data,
            },
          })
      : options.refetchInterval;

  return {
    ...options,
    queryKey: toTanstackQueryKey(options.queryKey),
    refetchInterval,
    queryFn: (context: TanstackQueryFunctionContext<TanstackQueryKey>) =>
      Promise.resolve(
        options.queryFn({
          queryKey: context.queryKey as TQueryKey,
          signal: context.signal,
        }),
      ),
  };
};

export const toTanstackSuspenseQueryOptions = <
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends CompatQueryKey = CompatQueryKey,
>(
  options: CompatQueryOptions<TQueryFnData, TError, TQueryKey>,
): TanstackUseSuspenseQueryOptions<
  TQueryFnData,
  TError,
  TData,
  TanstackQueryKey
> => {
  return toTanstackQueryOptions(options) as TanstackUseSuspenseQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TanstackQueryKey
  >;
};

export const toTanstackMutationOptions = <
  TData,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: CompatMutationOptions<TData, TError, TVariables, TContext>,
) => {
  return {
    ...options,
    mutationKey: options.mutationKey
      ? toTanstackQueryKey(options.mutationKey)
      : undefined,
  };
};

export const adaptQueryResult = <TData, TError>(
  result: TanstackUseQueryResult<TData, TError>,
): UseQueryResult<TData, TError> => {
  if (result.isSuccess) {
    return {
      data: result.data,
      error: null,
      isError: false,
      isFetching: result.isFetching,
      isLoading: false,
      isPending: false,
      isSuccess: true,
      refetch: result.refetch,
      status: 'success',
    };
  }

  if (result.isError) {
    return {
      data: result.data,
      error: result.error,
      isError: true,
      isFetching: result.isFetching,
      isLoading: false,
      isPending: false,
      isSuccess: false,
      refetch: result.refetch,
      status: 'error',
    };
  }

  return {
    data: result.data,
    error: null,
    isError: false,
    isFetching: result.isFetching,
    isLoading: true,
    isPending: true,
    isSuccess: false,
    refetch: result.refetch,
    status: 'pending',
  };
};

export const adaptSuspenseQueryResult = <TData, TError>(
  result: TanstackUseSuspenseQueryResult<TData, TError>,
): UseSuspenseQueryResult<TData, TError> => ({
  data: result.data,
  error: result.error,
  isError: false,
  isFetching: result.isFetching,
  isLoading: false,
  isPending: false,
  isSuccess: true,
  refetch: result.refetch,
  status: 'success',
});

export const adaptMutationResult = <TData, TError, TVariables, TContext>(
  result: TanstackUseMutationResult<TData, TError, TVariables, TContext>,
): UseMutationResult<TData, TError, TVariables, TContext> => ({
  data: result.data,
  error: result.error,
  isError: result.isError,
  isPending: result.isPending,
  isSuccess: result.isSuccess,
  mutate: result.mutate,
  mutateAsync: result.mutateAsync,
  reset: result.reset,
  status: result.status,
});
