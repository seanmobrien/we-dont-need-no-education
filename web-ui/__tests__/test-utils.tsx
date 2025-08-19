/* eslint-disable @typescript-eslint/no-explicit-any */
import '@testing-library/jest-dom';
import {
  render,
  RenderOptions,
  screen,
  renderHook,
  RenderHookOptions,  
  RenderHookResult,
} from '@testing-library/react';
import Queries from '@testing-library/dom/types/queries';
import React, { act, PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/lib/themes/provider';
import { ChatPanelProvider } from '@/components/ai/chat-panel';
import { SessionProvider } from '@/components/auth/session-provider';

// Create a test QueryClient with disabled retries and logs
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
});

const AllTheProviders = ({ children }: PropsWithChildren) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ChatPanelProvider>
        <SessionProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </SessionProvider>
      </ChatPanelProvider>
    </QueryClientProvider>
  );
};

const customRender = (ui: React.ReactElement, options: RenderOptions = {}) => {
  let ret: any = undefined;
  act(() => {
    ret = render(ui, { wrapper: AllTheProviders, ...options });
  });
  return ret;
};

const customAsyncRender = async (
  ui: React.ReactElement,
  options: RenderOptions = {},
) => {
  let ret: any = undefined;
  await act(async () => {
    ret = render(ui, { wrapper: AllTheProviders, ...options });
  });
  return ret;
};

const customRenderHook = <
  Result,
  Props,
  Q extends typeof Queries = typeof Queries,
  Container extends HTMLElement = HTMLElement,
  BaseElement extends Container = Container,
>(
  hook: (initialProps?: Props) => Result,
  options?: RenderHookOptions<Props, Q, Container, BaseElement>,
): RenderHookResult<Result, Props> => {
  let ret: RenderHookResult<Result, Props> | undefined = undefined;
  act(() => {
    const normalOptions = options ?? {};
    const fromHook = renderHook<Result, Props, Q, Container, BaseElement>(hook, {
      wrapper: normalOptions.wrapper ?? AllTheProviders,
      ...normalOptions,
    });
    ret = fromHook;
  });
  return ret!;
};

// re-export everything
export * from '@testing-library/react';
// override render method
export {
  customRender as render,
  customAsyncRender as asyncRender,
  customRenderHook as renderHook,
};
// explicitly export screen to ensure it's available
export { screen };

export type { RenderOptions };

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(global as any).IS_REACT_ACT_ENVIRONMENT = true;

export const jsonResponse = <TData extends object>(data: TData, status?: number) => {
  const jsonCallback = (): Promise<TData> => Promise.resolve(data as TData);
  const stat = status ?? 200;
  return {
    ok: stat < 400,
    status: stat ?? 200,
    statusText: stat < 400 ? 'OK' : 'Error',
    headers: {
      'Content-Type': 'application/json',
    },
    json: jsonCallback
  };
};