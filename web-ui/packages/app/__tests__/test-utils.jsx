jest.mock('@mui/material/styles', () => {
    const orig = jest.requireActual('@mui/material/styles');
    return {
        ...orig,
        ThemeProvider: ({ children }) => (<>{children}</>),
    };
});
import '@testing-library/jest-dom';
import { render, screen, renderHook, } from '@testing-library/react';
import React, { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatPanelProvider } from '@/components/ai/chat-panel';
import { SessionProvider } from '@/components/auth/session-provider';
import { FlagProvider } from '@compliance-theater/feature-flags/components/flag-provider';
import { ThemeProvider } from '@compliance-theater/themes';
const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
        mutations: {
            retry: false,
        },
    },
});
const AllTheProviders = ({ children: childrenFromProps, theme, chatPanel = false, }) => {
    const queryClient = createTestQueryClient();
    const ChatPanelWrapper = ({ children }) => chatPanel ? (<ChatPanelProvider>{children}</ChatPanelProvider>) : (<>{children}</>);
    return (<>
      <QueryClientProvider client={queryClient}>
        <ChatPanelWrapper>
          <SessionProvider>
            <ThemeProvider defaultTheme={theme ?? 'dark'}>
              {childrenFromProps}
            </ThemeProvider>
          </SessionProvider>
        </ChatPanelWrapper>
      </QueryClientProvider>
    </>);
};
const AllTheProvidersWithFlags = ({ children, ...wrapperProps }) => {
    return (<AllTheProviders {...wrapperProps}>
      <FlagProvider>{children}</FlagProvider>
    </AllTheProviders>);
};
const customRender = (ui, options = {}) => {
    let ret = undefined;
    const Wrapper = ({ children }) => options.withFlags ? (<AllTheProvidersWithFlags theme={options.theme} children={children} chatPanel={options.chatPanel}/>) : (<AllTheProviders theme={options.theme} children={children} chatPanel={options.chatPanel}/>);
    act(() => {
        ret = render(ui, {
            wrapper: Wrapper,
            ...options,
        });
    });
    const rerender = ret.rerender;
    return {
        ...ret,
        rerender: (rerenderUi) => {
            act(() => {
                rerender(rerenderUi, {
                    wrapper: Wrapper,
                    ...options,
                });
            });
        },
    };
};
const customAsyncRender = async (ui, options = {}) => {
    const Wrapper = ({ children }) => options.withFlags ? (<AllTheProvidersWithFlags theme={options.theme} chatPanel={options.chatPanel} children={children}/>) : (<AllTheProviders theme={options.theme} chatPanel={options.chatPanel} children={children}/>);
    let ret = undefined;
    await act(async () => {
        ret = render(ui, {
            wrapper: Wrapper,
            ...options,
        });
    });
    return ret;
};
const customRenderHook = (hook, options) => {
    let ret = undefined;
    act(() => {
        const normalOptions = options ?? {};
        const fromHook = renderHook(hook, {
            wrapper: normalOptions.wrapper ??
                (options?.withFlags ? AllTheProvidersWithFlags : AllTheProviders),
            ...normalOptions,
        });
        ret = fromHook;
    });
    return ret;
};
export * from '@testing-library/react';
export { customRender as render, customAsyncRender as asyncRender, customRenderHook as renderHook, };
export { screen };
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
global.IS_REACT_ACT_ENVIRONMENT = true;
export const jsonResponse = (data, status) => {
    const jsonCallback = () => Promise.resolve(data);
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
export { hideConsoleOutput } from './test-utils-server';
let mockIdCounter = 0;
let mockUseId;
beforeEach(() => {
    mockIdCounter = 0;
    mockUseId = jest.spyOn(React, 'useId');
    mockUseId.mockImplementation(() => `mock-id-${mockIdCounter++}`);
});
afterEach(() => {
    mockUseId?.mockRestore();
    mockUseId = undefined;
});
//# sourceMappingURL=test-utils.jsx.map