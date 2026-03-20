import type {
  QueryClient,
  QueryKey,
  UseMutationResult,
  UseQueryResult,
} from './contracts';

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

export const isQueryKey = (value: unknown): value is QueryKey => {
  return Array.isArray(value);
};

export const isQueryClient = (value: unknown): value is QueryClient => {
  return (
    isObject(value) &&
    typeof value.getQueryData === 'function' &&
    typeof value.setQueryData === 'function' &&
    typeof value.invalidateQueries === 'function'
  );
};

export const isUseQueryResult = <TData = unknown, TError = Error>(
  value: unknown,
): value is UseQueryResult<TData, TError> => {
  return (
    isObject(value) &&
    typeof value.refetch === 'function' &&
    typeof value.isLoading === 'boolean' &&
    typeof value.isFetching === 'boolean'
  );
};

export const isUseMutationResult = <
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  value: unknown,
): value is UseMutationResult<TData, TError, TVariables, TContext> => {
  return (
    isObject(value) &&
    typeof value.mutate === 'function' &&
    typeof value.mutateAsync === 'function' &&
    typeof value.reset === 'function'
  );
};
