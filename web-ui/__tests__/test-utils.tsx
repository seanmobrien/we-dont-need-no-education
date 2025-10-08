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
import { ThemeProvider } from '/lib/themes/provider';
import { ChatPanelProvider } from '/components/ai/chat-panel';
import { SessionProvider } from '/components/auth/session-provider';
import { FlagProvider } from '/components/general/flags/flag-provider';

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
          <FlagProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </FlagProvider>
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
  const rerender = ret.rerender;
  return {
    ...ret,
    rerender: (rerenderUi: React.ReactElement) => {
      act(() => {
        rerender(rerenderUi);
      });
    },
  };
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
    const fromHook = renderHook<Result, Props, Q, Container, BaseElement>(
      hook,
      {
        wrapper: normalOptions.wrapper ?? AllTheProviders,
        ...normalOptions,
      },
    );
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

export const jsonResponse = <TData extends object>(
  data: TData,
  status?: number,
) => {
  const jsonCallback = (): Promise<TData> => Promise.resolve(data as TData);
  const stat = status ?? 200;
  return {
    ok: stat < 400,
    status: stat ?? 200,
    statusText: stat < 400 ? 'OK' : 'Error',
    headers: {
      'Content-Type': 'application/json',
    },
    json: jsonCallback,
  };
};

export type MockedConsole = {
  error?: jest.SpyInstance;
  log?: jest.SpyInstance;
  info?: jest.SpyInstance;
  group?: jest.SpyInstance;
  groupEnd?: jest.SpyInstance;
  table?: jest.SpyInstance;
  warn?: jest.SpyInstance;
  setup: () => void;
  dispose: () => void;
};

export const hideConsoleOutput = () => {
  const ret: MockedConsole = {
    error: undefined,
    log: undefined,
    group: undefined,
    groupEnd: undefined,
    table: undefined,
    info: undefined,
    warn: undefined,
    setup: () => {
      ret.error ??= jest.spyOn(console, 'error').mockImplementation(() => {});
      ret.log ??= jest.spyOn(console, 'log').mockImplementation(() => {});
      ret.group ??= jest.spyOn(console, 'group').mockImplementation(() => {});
      ret.groupEnd ??= jest
        .spyOn(console, 'groupEnd')
        .mockImplementation(() => {});
      ret.table ??= jest.spyOn(console, 'table').mockImplementation(() => {});
      ret.info ??= jest.spyOn(console, 'info').mockImplementation(() => {});
      ret.warn ??= jest.spyOn(console, 'warn').mockImplementation(() => {});
    },
    dispose: () => {
      ret.error?.mockRestore();
      delete ret.error;
      ret.log?.mockRestore();
      delete ret.log;
      ret.group?.mockRestore();
      delete ret.group;
      ret.groupEnd?.mockRestore();
      delete ret.groupEnd;
      ret.table?.mockRestore();
      delete ret.table;
      ret.info?.mockRestore();
      delete ret.info;
      ret.warn?.mockRestore();
      delete ret.warn;
    },
  };
  return ret;
};

let mockIdCounter: number = 0;
let mockUseId: jest.SpyInstance<string, [], any> | undefined;

beforeEach(() => {
  mockIdCounter = 0;
  mockUseId = jest.spyOn(React, 'useId');
  mockUseId.mockImplementation(() => `mock-id-${mockIdCounter++}`);
});

afterEach(() => {
  mockUseId?.mockRestore();
  mockUseId = undefined;
});
