// @jest-environment jsdom

import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FlagProvider } from '../src/components/flag-provider';

jest.mock('flagsmith/react', () => ({
  useFlagsmithLoading: jest.fn(),
}));

jest.mock('@/components/auth/session-provider', () => ({
  useSession: jest.fn(() => ({ userHash: 'test-user', status: 'unauthenticated' })),
}));

jest.mock('../src/client', () => ({
  getAllFeatureFlags: jest.fn().mockResolvedValue({}),
}));

// Import mocked modules after jest.mock calls
import { useFlagsmithLoading } from 'flagsmith/react';
//import { mockFlagsmithInstanceFactory } from '../../app/__tests__/jest.setup';
import {
  FeatureFlagsApi,
  useFeatureFlagsContext,
} from '../src/context';

describe('FlagProvider', () => {
  let currentContext: FeatureFlagsApi | undefined = undefined;
  let mockFlagsmithLoading = {
    isLoading: true,
    isFetching: false,
    error: null as Error | null,
  };

  const CaptureFlagsmithContext = () => {
    const context = useFeatureFlagsContext();
    currentContext = context;
    return <></>;
  };
  const getFlagsmithContext = async () => {
    const renderedUi = (
      <FlagProvider>
        <CaptureFlagsmithContext />
      </FlagProvider>
    );
    const renderResult = render(renderedUi);
    await waitFor(() => expect(currentContext).toBeDefined());
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

    (useFlagsmithLoading as jest.Mock).mockReturnValue(mockFlagsmithLoading);

    // Setup default env mock behavior
    // process.env.NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID = mockEnvironmentId;
    // process.env.NEXT_PUBLIC_FLAGSMITH_API_URL = mockApiUrl;
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
    await waitFor(() =>
      expect(screen.getByTestId('test-child')).toBeInTheDocument(),
    );
  });

  it('renders with complex children structure', async () => {
    const complexChildren = (
      <div>
        <h1>Title</h1>
        <p>Content</p>
        <button>Click me</button>
      </div>
    );

    const { getByText } = render(
      <FlagProvider>{complexChildren}</FlagProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText('Title')).toBeInTheDocument();
    });

    expect(getByText('Content')).toBeInTheDocument();
    expect(getByText('Click me')).toBeInTheDocument();
  });
});
