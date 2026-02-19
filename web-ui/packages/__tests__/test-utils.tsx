import {
  render,
  RenderOptions,
  screen,
  renderHook,
  RenderHookOptions,
  RenderHookResult,
} from '@testing-library/react';
import Queries from '@testing-library/dom/types/queries';
import React, { act, PropsWithChildren } from '@compliance-theater/types/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionContext } from '@compliance-theater/types/components/auth/session-context';
import { ThemeProvider, type ThemeType } from '@compliance-theater/themes';

const SessionProviderOrFallback = ({ children }: PropsWithChildren) => {
  let sessionData: unknown = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sessionData = require('@/__tests__/shared/jest.test-extensions').withJestTestExtensions().session;
  } catch {
    sessionData = null;
  }
  return (
    <SessionContext.Provider
      value={{
        data: sessionData as any,
        status: 'loading',
        isFetching: false,
        refetch: () => undefined,
        keyValidation: {
          status: 'unknown',
          lastValidated: undefined,
          error: undefined,
        },
        update: async () => sessionData as any,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

const ChatPanelProviderOrFallback = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@/components/ai/chat-panel').ChatPanelProvider;
  } catch {
    return ({ children }: PropsWithChildren) => <>{children}</>;
  }
})();

const FlagProviderOrFallback = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@compliance-theater/feature-flags/components/flag-provider').FlagProvider;
  } catch {
    return ({ children }: PropsWithChildren) => <>{children}</>;
  }
})();

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
      <ChatPanelProviderOrFallback>{children}</ChatPanelProviderOrFallback>
    ) : (
      <>{children}</>
    );
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <ChatPanelWrapper>
          <SessionProviderOrFallback>
            <ThemeProvider defaultTheme={theme ?? 'dark'}>
              {childrenFromProps}
            </ThemeProvider>
          </SessionProviderOrFallback>
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
      <FlagProviderOrFallback>{children}</FlagProviderOrFallback>
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

export { type MockedConsole, hideConsoleOutput } from './test-utils-server';

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