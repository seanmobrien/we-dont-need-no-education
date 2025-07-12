/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { PropsWithChildren } from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/lib/themes/provider';
import { ChatPanelProvider } from '@/components/ai/chat-panel';
import '@testing-library/jest-dom';

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
        <ThemeProvider>{children}</ThemeProvider>
      </ChatPanelProvider>
    </QueryClientProvider>
  );
};

const customRender = (ui: any, options: any = {}) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// re-export everything
export * from '@testing-library/react';

// override render method
export { customRender as render };

// explicitly export screen to ensure it's available
export { screen };
