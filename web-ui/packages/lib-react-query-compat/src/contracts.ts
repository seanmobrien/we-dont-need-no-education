export type QueryKey = readonly unknown[];

export type RetryValue<TError> =
  | number
  | ((failureCount: number, error: TError) => boolean);

export type RetryDelayValue<TError> =
  | number
  | ((attemptIndex: number, error: TError) => number);

export interface QueryState<TData> {
  data?: TData;
}

export interface QueryObserverLike<TData> {
  state: QueryState<TData>;
}

export type Awaitable<TData> = TData | PromiseLike<TData>;

export interface QueryFunctionContext<TQueryKey extends QueryKey = QueryKey> {
  queryKey: TQueryKey;
  signal?: globalThis.AbortSignal;
}

export interface InvalidateQueryFilters {
  queryKey?: QueryKey;
  predicate?: (query: { queryKey: QueryKey }) => boolean;
}

export interface CancelQueryFilters {
  queryKey?: QueryKey;
}

export interface RemoveQueryFilters {
  queryKey?: QueryKey;
}

export interface QueryOptions<
  TQueryFnData = unknown,
  TError = Error,
  TQueryKey extends QueryKey = QueryKey,
> {
  queryKey: TQueryKey;
  queryFn: (
    context: QueryFunctionContext<TQueryKey>,
  ) => Awaitable<TQueryFnData>;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  retry?: RetryValue<TError>;
  retryDelay?: RetryDelayValue<TError>;
  refetchInterval?:
    | number
    | false
    | ((query: QueryObserverLike<TQueryFnData>) => number | false | undefined);
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
  refetchOnMount?: boolean;
}

export interface MutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
> {
  mutationKey?: QueryKey;
  scope?: {
    id: string;
  };
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (
    data: TData,
    variables: TVariables,
    context: TContext | undefined,
  ) => void | Promise<void>;
  onError?: (
    error: TError,
    variables: TVariables,
    context: TContext | undefined,
  ) => void | Promise<void>;
  onMutate?: (variables: TVariables) => TContext | Promise<TContext>;
  onSettled?: (
    data: TData | undefined,
    error: TError | null,
    variables: TVariables,
    context: TContext | undefined,
  ) => void | Promise<void>;
  retry?: RetryValue<TError>;
  retryDelay?: RetryDelayValue<TError>;
}

export interface QueryClientDefaults {
  staleTime?: number;
  gcTime?: number;
  retry?: RetryValue<unknown>;
  retryDelay?: RetryDelayValue<unknown>;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
  refetchOnMount?: boolean;
}

export interface MutationDefaults {
  retry?: RetryValue<unknown>;
  retryDelay?: RetryDelayValue<unknown>;
}

export interface QueryClientConfig {
  defaultOptions?: {
    queries?: QueryClientDefaults;
    mutations?: MutationDefaults;
  };
}

interface QueryResultBase {
  isFetching: boolean;
  refetch: () => Promise<unknown>;
}

export interface UseQueryPendingResult<TData = unknown> extends QueryResultBase {
  data: TData | undefined;
  error: null;
  isError: false;
  /** true when actively fetching; false when query is disabled (enabled: false) */
  isLoading: boolean;
  isPending: true;
  isSuccess: false;
  status: 'pending';
}

export interface UseQueryErrorResult<TData = unknown, TError = Error>
  extends QueryResultBase {
  data: TData | undefined;
  error: TError;
  isError: true;
  isLoading: false;
  isPending: false;
  isSuccess: false;
  status: 'error';
}

export interface UseQuerySuccessResult<TData = unknown> extends QueryResultBase {
  data: TData;
  error: null;
  isError: false;
  isLoading: false;
  isPending: false;
  isSuccess: true;
  status: 'success';
}

export type UseQueryResult<TData = unknown, TError = Error> =
  | UseQueryPendingResult<TData>
  | UseQueryErrorResult<TData, TError>
  | UseQuerySuccessResult<TData>;

export interface UseSuspenseQueryResult<TData = unknown, TError = Error>
  extends QueryResultBase {
  data: TData;
  error: TError | null;
  isError: boolean;
  isLoading: false;
  isPending: false;
  isSuccess: true;
  status: 'success';
}

export interface MutateOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
> {
  onSuccess?: (
    data: TData,
    variables: TVariables,
    context: TContext | undefined,
  ) => void;
  onError?: (
    error: TError,
    variables: TVariables,
    context: TContext | undefined,
  ) => void;
  onSettled?: (
    data: TData | undefined,
    error: TError | null,
    variables: TVariables,
    context: TContext | undefined,
  ) => void;
}

export type UseMutateFunction<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
> = (
  variables: TVariables,
  options?: MutateOptions<TData, TError, TVariables, TContext>,
) => void;

export interface UseMutationResult<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
> {
  data: TData | undefined;
  error: TError | null;
  isError: boolean;
  isPending: boolean;
  isSuccess: boolean;
  mutate: UseMutateFunction<TData, TError, TVariables, TContext>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  reset: () => void;
  status: 'idle' | 'pending' | 'error' | 'success';
}

export interface QueryClient {
  getQueryData<TData>(queryKey: QueryKey): TData | undefined;
  setQueryData<TData>(
    queryKey: QueryKey,
    updater:
      | TData
      | ((current: TData | undefined) => TData | undefined),
  ): TData | undefined;
  invalidateQueries(filters?: InvalidateQueryFilters): Promise<void>;
  cancelQueries(filters?: CancelQueryFilters): Promise<void>;
  removeQueries(filters?: RemoveQueryFilters): void;
  prefetchQuery<TData, TQueryKey extends QueryKey = QueryKey>(
    options: QueryOptions<TData, Error, TQueryKey>,
  ): Promise<void>;
  fetchQuery<TData, TQueryKey extends QueryKey = QueryKey>(
    options: QueryOptions<TData, Error, TQueryKey>,
  ): Promise<TData>;
}

export interface StreamedQueryOptions<TChunk> {
  streamFn: (
    context: { signal?: globalThis.AbortSignal },
  ) => AsyncIterable<TChunk> | Promise<AsyncIterable<TChunk>>;
}

export type StreamedQueryFn<TChunk> = (
  context: QueryFunctionContext,
) => Promise<AsyncIterable<TChunk>>;
