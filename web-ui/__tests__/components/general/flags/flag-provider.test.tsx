import React from 'react';
import { auth } from '@/auth';
import { render, waitFor, screen } from '@/__tests__/test-utils';
import { FlagProvider } from '@/components/general/flags/flag-provider';

// Import mocked modules after jest.mock calls
import { IFlagsmith } from 'flagsmith/react';
import { createFlagsmithInstance } from 'flagsmith/isomorphic';
import { useFlagsmithLoading } from 'flagsmith/react';
import { mockFlagsmithInstanceFactory } from '@/__tests__/jest.setup';
import {
  FeatureFlagsApi,
  useFeatureFlagsContext,
} from '@/lib/site-util/feature-flags/context';

const mockCreateFlagsmithInstance = jest.mocked(createFlagsmithInstance);

describe('FlagProvider', () => {
  let currentContext: FeatureFlagsApi | undefined = undefined;
  const mockEnvironmentId = 'test-environment-id';
  const mockApiUrl = 'https://api.flagsmith.com/api/v1/';
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
        <div data-testid="wait-for-it"></div>
      </FlagProvider>
    );
    const renderResult = render(renderedUi);
    await waitFor(() =>
      expect(screen.getByTestId('wait-for-it')).toBeInTheDocument(),
    );
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
    jest.mock('flagsmith/react');
    (useFlagsmithLoading as jest.Mock).mockReturnValue(mockFlagsmithLoading);

    // Setup default env mock behavior
    process.env.NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID = mockEnvironmentId;
    process.env.NEXT_PUBLIC_FLAGSMITH_API_URL = mockApiUrl;

    // Setup flagsmith instance mock using the factory
    const mockFlagsmithInstance = mockFlagsmithInstanceFactory();
    mockCreateFlagsmithInstance.mockReturnValue(
      mockFlagsmithInstance as unknown as IFlagsmith<string, string>,
    );
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

  it('supports configurable mock with props', () => {
    // Create a mock with custom configuration
    const customMock = mockFlagsmithInstanceFactory({
      initialized: true,
      identifier: 'test-user-123',
      traits: { role: 'admin', department: 'engineering' },
      flags: { feature_a: true, feature_b: 'enabled', feature_c: 42 },
      loadingState: 'loaded',
    });

    // Verify the mock has the configured values
    expect(customMock.initialised()).toBe(true);
    expect(customMock.identity()).toBe('test-user-123');
    expect(customMock.getAllTraits()).toEqual({
      role: 'admin',
      department: 'engineering',
    });
    expect(customMock.getAllFlags()).toEqual({
      feature_a: true,
      feature_b: 'enabled',
      feature_c: 42,
    });
    expect(customMock.loadingState()).toBe('loaded');
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
