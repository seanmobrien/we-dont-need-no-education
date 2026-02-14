import React from 'react';
import { render, waitFor, screen } from '@/__tests__/test-utils';
import { FlagProvider } from '@compliance-theater/feature-flags/components/flag-provider';
import { useFlagsmithLoading } from 'flagsmith/react';
import { useFeatureFlagsContext, } from '@compliance-theater/feature-flags/context';
describe('FlagProvider', () => {
    let currentContext = undefined;
    let mockFlagsmithLoading = {
        isLoading: true,
        isFetching: false,
        error: null,
    };
    const CaptureFlagsmithContext = () => {
        const context = useFeatureFlagsContext();
        currentContext = context;
        return <></>;
    };
    const getFlagsmithContext = async () => {
        const renderedUi = (<FlagProvider>
        <CaptureFlagsmithContext />
        <div data-testid="wait-for-it"></div>
      </FlagProvider>);
        const renderResult = render(renderedUi);
        await waitFor(() => expect(screen.getByTestId('wait-for-it')).toBeInTheDocument());
        return {
            ...renderResult,
            renderedUi,
            context: currentContext,
        };
    };
    beforeEach(() => {
        mockFlagsmithLoading = {
            isLoading: true,
            isFetching: false,
            error: null,
        };
        useFlagsmithLoading.mockReturnValue(mockFlagsmithLoading);
    });
    afterEach(() => {
        currentContext = undefined;
    });
    it('Returns isFetching from useFlagsmithLoading', async () => {
        mockFlagsmithLoading.isFetching = true;
        const { context } = await getFlagsmithContext();
        expect(context).toBeDefined();
        expect(context?.isFetching).toBe(true);
    });
    it('Returns error from useFlagsmithLoading', async () => {
        mockFlagsmithLoading.error = new Error('Kaboom');
        const { context } = await getFlagsmithContext();
        expect(context).toBeDefined();
        expect(context.error).toBe(mockFlagsmithLoading.error);
    });
    it('renders children wrapped in FlagsmithProvider', async () => {
        const testContent = <div data-testid="test-child">Test Content</div>;
        render(<FlagProvider>{testContent}</FlagProvider>);
        await waitFor(() => expect(screen.getByTestId('test-child')).toBeInTheDocument());
    });
    it('renders with complex children structure', async () => {
        const complexChildren = (<div>
        <h1>Title</h1>
        <p>Content</p>
        <button>Click me</button>
      </div>);
        const { getByText } = render(<FlagProvider>{complexChildren}</FlagProvider>);
        await waitFor(() => {
            expect(screen.getByText('Title')).toBeInTheDocument();
        });
        expect(getByText('Content')).toBeInTheDocument();
        expect(getByText('Click me')).toBeInTheDocument();
    });
});
//# sourceMappingURL=flag-provider.test.jsx.map