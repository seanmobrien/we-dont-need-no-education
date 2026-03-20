'use client';

import type { ReactNode } from 'react';
import type { ReactQueryDevtoolsProps } from './contracts';

const QUERY_CLIENT_SYMBOL = Symbol.for(
  '@compliance-theater/react-query-compat/query-client',
);

type ReactQueryDevtoolsProductionRuntime = {
  ReactQueryDevtools: (props: unknown) => ReactNode;
};

let cachedRuntime: ReactQueryDevtoolsProductionRuntime | null | undefined;

const unwrapQueryClient = (client?: ReactQueryDevtoolsProps['client']) => {
  if (!client) {
    return undefined;
  }

  return (client as ReactQueryDevtoolsProps['client'] & {
    [QUERY_CLIENT_SYMBOL]?: object;
  })[QUERY_CLIENT_SYMBOL];
};

const loadReactQueryDevtoolsProductionRuntime = ():
  | ReactQueryDevtoolsProductionRuntime
  | undefined => {
  if (cachedRuntime !== undefined) {
    return cachedRuntime ?? undefined;
  }

  try {
    cachedRuntime = require(
      '@tanstack/react-query-devtools/production'
    ) as ReactQueryDevtoolsProductionRuntime;
    return cachedRuntime;
  } catch {
    cachedRuntime = null;
    return undefined;
  }
};

export const ReactQueryDevtoolsProduction = ({
  client,
  ...props
}: ReactQueryDevtoolsProps) => {
  const runtime = loadReactQueryDevtoolsProductionRuntime();

  if (!runtime) {
    return null;
  }

  const runtimeClient = unwrapQueryClient(client);

  return runtime.ReactQueryDevtools({
    ...props,
    ...(runtimeClient ? { client: runtimeClient } : {}),
  });
};

export type { ReactQueryDevtoolsProps } from './contracts';