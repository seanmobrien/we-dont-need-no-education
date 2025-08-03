/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { act, PropsWithChildren } from 'react';
import { render, RenderOptions, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/lib/themes/provider';
import { ChatPanelProvider } from '@/components/ai/chat-panel';
import '@testing-library/jest-dom';
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

const customRender = (
  ui: React.ReactElement,
  options: RenderOptions = {}
) => {
  let ret: any = undefined;
  act(() => {
    ret = render(ui, { wrapper: AllTheProviders, ...options });
  });
  return ret; 
};
  
const customAsyncRender = async (
  ui: React.ReactElement,
  options: RenderOptions = {}
) => {
  let ret: any = undefined;
  await act(async () => {
    ret = render(ui, { wrapper: AllTheProviders, ...options });
  });
  return ret; 
};



// re-export everything
export * from '@testing-library/react';

// override render method
export { customRender as render, customAsyncRender as asyncRender };

// explicitly export screen to ensure it's available
export { screen };

export type { RenderOptions };

(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
(global as any).IS_REACT_ACT_ENVIRONMENT=true;
