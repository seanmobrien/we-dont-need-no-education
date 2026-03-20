'use client';

import type { ReactNode } from 'react';
import {
  adaptMutationResult,
  adaptQueryResult,
  adaptSuspenseQueryResult,
  toTanstackMutationOptions,
  toTanstackQueryOptions,
  toTanstackSuspenseQueryOptions,
} from './adapters';
import type {
  MutationOptions,
  QueryClient as QueryClientContract,
  QueryClientConfig,
  QueryKey,
  QueryOptions,
  ReactQueryDevtoolsPanelProps,
  ReactQueryDevtoolsProps,
  StreamedQueryFn,
  StreamedQueryOptions,
  UseMutationResult,
  UseQueryResult,
  UseSuspenseQueryResult,
} from './contracts';
import { MissingReactQueryPeerError } from './errors';

const QUERY_CLIENT_SYMBOL = Symbol.for(
  '@compliance-theater/react-query-compat/query-client',
);

type ReactQueryRuntime = {
  QueryClient: new (config?: unknown) => object;
  QueryClientProvider: (props: {
    client: object;
    children?: ReactNode;
  }) => ReactNode;
  QueryErrorResetBoundary: (props: {
    children: (value: { reset: () => void }) => ReactNode;
  }) => ReactNode;
  useMutation: (options: unknown) => unknown;
  useQuery: (options: unknown, queryClient?: object) => unknown;
  useSuspenseQuery: (options: unknown, queryClient?: object) => unknown;
  useQueryClient: () => object;
  experimental_streamedQuery: <TChunk>(
    options: StreamedQueryOptions<TChunk>,
  ) => StreamedQueryFn<TChunk>;
};

type ReactQueryDevtoolsRuntime = {
  ReactQueryDevtools: (props: unknown) => ReactNode;
  ReactQueryDevtoolsPanel: (props: unknown) => ReactNode;
};

let cachedRuntime: ReactQueryRuntime | undefined;
let cachedDevtoolsRuntime: ReactQueryDevtoolsRuntime | null | undefined;
const queryClientCache = new WeakMap<object, QueryClient>();

const loadReactQueryRuntime = (): ReactQueryRuntime => {
  if (cachedRuntime) {
    return cachedRuntime;
  }

  try {
    cachedRuntime = require('@tanstack/react-query') as ReactQueryRuntime;
    return cachedRuntime;
  } catch (error) {
    throw new MissingReactQueryPeerError(error);
  }
};

const loadReactQueryDevtoolsRuntime = ():
  | ReactQueryDevtoolsRuntime
  | undefined => {
  if (cachedDevtoolsRuntime !== undefined) {
    return cachedDevtoolsRuntime ?? undefined;
  }

  try {
    cachedDevtoolsRuntime = require(
      '@tanstack/react-query-devtools'
    ) as ReactQueryDevtoolsRuntime;
    return cachedDevtoolsRuntime;
  } catch {
    cachedDevtoolsRuntime = null;
    return undefined;
  }
};

const unwrapQueryClient = (client?: QueryClient | QueryClientContract) => {
  if (!client) {
    return undefined;
  }

  return (client as QueryClient & { [QUERY_CLIENT_SYMBOL]?: object })[
    QUERY_CLIENT_SYMBOL
  ];
};

export class QueryClient implements QueryClientContract {
  readonly [QUERY_CLIENT_SYMBOL]: object;

  constructor(config?: QueryClientConfig, runtimeClient?: object) {
    const runtime = loadReactQueryRuntime();
    this[QUERY_CLIENT_SYMBOL] =
      runtimeClient ??
      new runtime.QueryClient(config as unknown);
    queryClientCache.set(this[QUERY_CLIENT_SYMBOL], this);
  }

  static fromRuntimeClient(runtimeClient: object): QueryClient {
    const cached = queryClientCache.get(runtimeClient);
    if (cached) {
      return cached;
    }

    return new QueryClient(undefined, runtimeClient);
  }

  getQueryData<TData>(queryKey: QueryKey): TData | undefined {
    const runtimeClient = this[QUERY_CLIENT_SYMBOL] as {
      getQueryData: <T>(queryKey: QueryKey) => T | undefined;
    };
    return runtimeClient.getQueryData<TData>(queryKey);
  }

  setQueryData<TData>(
    queryKey: QueryKey,
    updater:
      | TData
      | ((current: TData | undefined) => TData | undefined),
  ): TData | undefined {
    const runtimeClient = this[QUERY_CLIENT_SYMBOL] as {
      setQueryData: <T>(
        queryKey: QueryKey,
        updater:
          | T
          | ((current: T | undefined) => T | undefined),
      ) => T | undefined;
    };
    return runtimeClient.setQueryData<TData>(queryKey, updater);
  }

  invalidateQueries(filters = {}): Promise<void> {
    const runtimeClient = this[QUERY_CLIENT_SYMBOL] as {
      invalidateQueries: (filters?: unknown) => Promise<void>;
    };
    return runtimeClient.invalidateQueries(filters);
  }

  cancelQueries(filters = {}): Promise<void> {
    const runtimeClient = this[QUERY_CLIENT_SYMBOL] as {
      cancelQueries: (filters?: unknown) => Promise<void>;
    };
    return runtimeClient.cancelQueries(filters);
  }

  removeQueries(filters = {}): void {
    const runtimeClient = this[QUERY_CLIENT_SYMBOL] as {
      removeQueries: (filters?: unknown) => void;
    };
    runtimeClient.removeQueries(filters);
  }

  prefetchQuery<TData, TQueryKey extends QueryKey = QueryKey>(
    options: QueryOptions<TData, Error, TQueryKey>,
  ): Promise<void> {
    const runtimeClient = this[QUERY_CLIENT_SYMBOL] as {
      prefetchQuery: (options: unknown) => Promise<void>;
    };
    return runtimeClient.prefetchQuery(toTanstackQueryOptions(options));
  }

  fetchQuery<TData, TQueryKey extends QueryKey = QueryKey>(
    options: QueryOptions<TData, Error, TQueryKey>,
  ): Promise<TData> {
    const runtimeClient = this[QUERY_CLIENT_SYMBOL] as {
      fetchQuery: <T>(options: unknown) => Promise<T>;
    };
    return runtimeClient.fetchQuery<TData>(toTanstackQueryOptions(options));
  }
}

export const createQueryClient = (config?: QueryClientConfig): QueryClient => {
  return new QueryClient(config);
};

export const QueryClientProvider = ({
  client,
  children,
}: {
  client: QueryClient | QueryClientContract;
  children?: ReactNode;
}) => {
  const runtime = loadReactQueryRuntime();
  const runtimeClient = unwrapQueryClient(client);

  if (!runtimeClient) {
    throw new Error('Invalid compat QueryClient instance.');
  }

  return runtime.QueryClientProvider({
    client: runtimeClient,
    children,
  });
};

export const QueryErrorResetBoundary = ({
  children,
}: {
  children: (value: { reset: () => void }) => ReactNode;
}) => {
  const runtime = loadReactQueryRuntime();
  return runtime.QueryErrorResetBoundary({ children });
};

export const ReactQueryDevtools = ({
  client,
  ...props
}: ReactQueryDevtoolsProps) => {
  const runtime = loadReactQueryDevtoolsRuntime();

  if (!runtime) {
    return null;
  }

  const runtimeClient = unwrapQueryClient(client);

  return runtime.ReactQueryDevtools({
    ...props,
    ...(runtimeClient ? { client: runtimeClient } : {}),
  });
};

export const ReactQueryDevtoolsPanel = ({
  client,
  ...props
}: ReactQueryDevtoolsPanelProps) => {
  const runtime = loadReactQueryDevtoolsRuntime();

  if (!runtime) {
    return null;
  }

  const runtimeClient = unwrapQueryClient(client);

  return runtime.ReactQueryDevtoolsPanel({
    ...props,
    ...(runtimeClient ? { client: runtimeClient } : {}),
  });
};

export const useQuery = <
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: QueryOptions<TQueryFnData, TError, TQueryKey>,
  queryClient?: QueryClient | QueryClientContract,
): UseQueryResult<TData, TError> => {
  const runtime = loadReactQueryRuntime();
  const result = runtime.useQuery(
    toTanstackQueryOptions(options),
    unwrapQueryClient(queryClient),
  );

  return adaptQueryResult(result as never) as UseQueryResult<TData, TError>;
};

export const useSuspenseQuery = <
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: QueryOptions<TQueryFnData, TError, TQueryKey>,
  queryClient?: QueryClient | QueryClientContract,
): UseSuspenseQueryResult<TData, TError> => {
  const runtime = loadReactQueryRuntime();
  const result = runtime.useSuspenseQuery(
    toTanstackSuspenseQueryOptions(options),
    unwrapQueryClient(queryClient),
  );

  return adaptSuspenseQueryResult(result as never) as UseSuspenseQueryResult<
    TData,
    TError
  >;
};

export const useMutation = <
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: MutationOptions<TData, TError, TVariables, TContext>,
): UseMutationResult<TData, TError, TVariables, TContext> => {
  const runtime = loadReactQueryRuntime();
  const result = runtime.useMutation(toTanstackMutationOptions(options));

  return adaptMutationResult(result as never);
};

export const useQueryClient = (): QueryClient => {
  const runtime = loadReactQueryRuntime();
  return QueryClient.fromRuntimeClient(runtime.useQueryClient());
};

export const streamedQuery = <TChunk,>(
  options: StreamedQueryOptions<TChunk>,
): StreamedQueryFn<TChunk> => {
  const runtime = loadReactQueryRuntime();
  return runtime.experimental_streamedQuery(options);
};

export { MissingReactQueryPeerError } from './errors';
export type {
  DevtoolsButtonPosition,
  DevtoolsPosition,
  DevtoolsTheme,
  MutationOptions,
  QueryClientConfig,
  QueryKey,
  QueryOptions,
  ReactQueryDevtoolsPanelProps,
  ReactQueryDevtoolsProps,
  StreamedQueryFn,
  StreamedQueryOptions,
  UseMutateFunction,
  UseMutationResult,
  UseQueryResult,
  UseSuspenseQueryResult,
} from './contracts';
