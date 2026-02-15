import '@testing-library/jest-dom';
import React, { PropsWithChildren } from 'react';
import { render as testingLibraryRender } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from '@/components/auth/session-provider/provider';

const createTestQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

const Wrapper = ({ children }: PropsWithChildren) => {
	const queryClient = createTestQueryClient();
	return (
		<QueryClientProvider client={queryClient}>
			<SessionProvider>{children}</SessionProvider>
		</QueryClientProvider>
	);
};

const render = (ui: React.ReactElement, options?: Parameters<typeof testingLibraryRender>[1]) =>
	testingLibraryRender(ui, { wrapper: Wrapper, ...options });

export * from '@testing-library/react';
export { render };
export { type MockedConsole, hideConsoleOutput } from './test-utils-server';
