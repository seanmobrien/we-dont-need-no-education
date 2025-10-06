import React from 'react';
import { render } from '/__tests__/test-utils';
import { FlagProvider } from '/components/general/flags/flag-provider';

// Import mocked modules after jest.mock calls
import { IFlagsmith } from 'flagsmith/react';
import { createFlagsmithInstance } from 'flagsmith/isomorphic';
import { mockFlagsmithInstanceFactory } from '/__tests__/jest.setup';

const mockCreateFlagsmithInstance = jest.mocked(createFlagsmithInstance);

describe('FlagProvider', () => {
  const mockEnvironmentId = 'test-environment-id';
  const mockApiUrl = 'https://api.flagsmith.com/api/v1/';

  beforeEach(() => {
    // Setup default env mock behavior
    process.env.NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID = mockEnvironmentId;
    process.env.NEXT_PUBLIC_FLAGSMITH_API_URL = mockApiUrl;

    // Setup flagsmith instance mock using the factory
    const mockFlagsmithInstance = mockFlagsmithInstanceFactory();
    mockCreateFlagsmithInstance.mockReturnValue(
      mockFlagsmithInstance as unknown as IFlagsmith<string, string>,
    );
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

  it('renders children wrapped in FlagsmithProvider', () => {
    const testContent = <div data-testid="test-child">Test Content</div>;

    const { getByTestId } = render(<FlagProvider>{testContent}</FlagProvider>);

    expect(getByTestId('test-child')).toBeInTheDocument();
  });

  it('renders with complex children structure', () => {
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

    expect(getByText('Title')).toBeInTheDocument();
    expect(getByText('Content')).toBeInTheDocument();
    expect(getByText('Click me')).toBeInTheDocument();
  });
});
