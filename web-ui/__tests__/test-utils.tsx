jest.mock('@mui/material/styles', () => {
  const orig = jest.requireActual('@mui/material/styles');
  return {
    ...orig,
    ThemeProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

import { ThemeProvider as MuiThemeProvider } from '@/lib/themes/provider';
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
import { FlagProvider } from '@/components/general/flags/flag-provider';
import type { ThemeType } from '@/lib/themes/types';

type CustomRenderOptions = RenderOptions & {
  withFlags?: boolean;
  theme?: ThemeType;
  chatPanel?: boolean;
};

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
type WrapperProps = PropsWithChildren & {
  theme?: ThemeType;
  chatPanel?: boolean;
};
const AllTheProviders = ({
  children: childrenFromProps,
  theme,
  chatPanel = false,
}: WrapperProps) => {
  const queryClient = createTestQueryClient();
  const ChatPanelWrapper = ({ children }: PropsWithChildren) =>
    chatPanel ? (
      <ChatPanelProvider>{children}</ChatPanelProvider>
    ) : (
      <>{children}</>
    );
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <ChatPanelWrapper>
          <SessionProvider>
            <ThemeProvider defaultTheme={theme ?? 'dark'}>
              {childrenFromProps}
            </ThemeProvider>
          </SessionProvider>
        </ChatPanelWrapper>
      </QueryClientProvider>
    </>
  );
};

const AllTheProvidersWithFlags = ({
  children,
  ...wrapperProps
}: WrapperProps) => {
  return (
    <AllTheProviders {...wrapperProps}>
      <FlagProvider>{children}</FlagProvider>
    </AllTheProviders>
  );
};

const customRender = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {},
) => {
  let ret: any = undefined;
  const Wrapper = ({ children }: PropsWithChildren) =>
    options.withFlags ? (
      <AllTheProvidersWithFlags
        theme={options.theme}
        children={children}
        chatPanel={options.chatPanel}
      />
    ) : (
      <AllTheProviders
        theme={options.theme}
        children={children}
        chatPanel={options.chatPanel}
      />
    );
  act(() => {
    ret = render(ui, {
      wrapper: Wrapper,
      ...options,
    });
  });
  const rerender = ret.rerender;
  return {
    ...ret,
    rerender: (rerenderUi: React.ReactElement) => {
      act(() => {
        rerender(rerenderUi, {
          wrapper: Wrapper,
          ...options,
        });
      });
    },
  };
};

const customAsyncRender = async (
  ui: React.ReactElement,
  options: CustomRenderOptions = {},
) => {
  const Wrapper = ({ children }: PropsWithChildren) =>
    options.withFlags ? (
      <AllTheProvidersWithFlags
        theme={options.theme}
        chatPanel={options.chatPanel}
        children={children}
      />
    ) : (
      <AllTheProviders
        theme={options.theme}
        chatPanel={options.chatPanel}
        children={children}
      />
    );
  let ret: any = undefined;
  await act(async () => {
    ret = render(ui, {
      wrapper: Wrapper,
      ...options,
    });
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
  options?: RenderHookOptions<Props, Q, Container, BaseElement> & {
    withFlags?: boolean;
  },
): RenderHookResult<Result, Props> => {
  let ret: RenderHookResult<Result, Props> | undefined = undefined;
  act(() => {
    const normalOptions = options ?? {};
    const fromHook = renderHook<Result, Props, Q, Container, BaseElement>(
      hook,
      {
        wrapper:
          normalOptions.wrapper ??
          (options?.withFlags ? AllTheProvidersWithFlags : AllTheProviders),
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
  [Symbol.dispose]: () => void;
};

let lastMockedConsole: MockedConsole | undefined = undefined;

export const hideConsoleOutput = () => {
  if (lastMockedConsole) {
    return lastMockedConsole;
  }
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
      ret[Symbol.dispose]();
    },
    [Symbol.dispose]: () => {
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
  lastMockedConsole = ret;
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
  // Automatically clean up any console mocking
  if (lastMockedConsole) {
    lastMockedConsole.dispose();
    lastMockedConsole = undefined;
  }
});
