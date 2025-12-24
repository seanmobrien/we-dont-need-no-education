import { render, screen } from '@testing-library/react';
import { SessionProvider } from '@/components/auth/session-provider/provider';
import { useQuery } from '@tanstack/react-query';
import { InvalidGrantError } from '@/lib/auth/errors';
import React from 'react';

// Mock dependencies
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => ({ mutateAsync: jest.fn() })),
}));

jest.mock('@toolpad/core', () => ({
  useNotifications: jest.fn(() => ({ show: jest.fn() })),
}));

jest.mock('@/lib/site-util/auth/key-validation', () => ({
  isKeyValidationDue: jest.fn(() => false),
}));

// Mock Error Boundary to catch the thrown error
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <div data-testid="error-boundary">{this.state.error?.name}</div>;
    }
    return this.props.children;
  }
}

describe('SessionProvider', () => {
  it('should throw InvalidGrantError when session has RefreshAccessTokenError', () => {
    // Mock useQuery to return session with error
    (useQuery as jest.Mock).mockReturnValue({
      data: {
        data: {
          error: 'RefreshAccessTokenError',
          user: { name: 'Test User' },
        },
      },
      isLoading: false,
      status: 'success',
    });

    // Console error is expected when throwing in render
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <SessionProvider>
          <div>Child</div>
        </SessionProvider>
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('error-boundary')).toHaveTextContent(
      'InvalidGrantError',
    );

    consoleSpy.mockRestore();
  });

  it('should render children when session is valid', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: {
        data: {
          user: { name: 'Test User' },
        },
      },
      isLoading: false,
      status: 'success',
    });

    render(
      <ErrorBoundary>
        <SessionProvider>
          <div data-testid="child">Child</div>
        </SessionProvider>
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
