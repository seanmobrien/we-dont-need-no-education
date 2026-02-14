import { render, screen } from '@testing-library/react';
import { SessionProvider } from '@/components/auth/session-provider/provider';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
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
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
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
        useQuery.mockReturnValue({
            data: {
                data: {
                    error: 'RefreshAccessTokenError',
                    user: { name: 'Test User' },
                },
            },
            isLoading: false,
            status: 'success',
        });
        const consoleSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => { });
        render(<ErrorBoundary>
        <SessionProvider>
          <div>Child</div>
        </SessionProvider>
      </ErrorBoundary>);
        expect(screen.getByTestId('error-boundary')).toHaveTextContent('InvalidGrantError');
        consoleSpy.mockRestore();
    });
    it('should render children when session is valid', () => {
        useQuery.mockReturnValue({
            data: {
                data: {
                    user: { name: 'Test User' },
                },
            },
            isLoading: false,
            status: 'success',
        });
        render(<ErrorBoundary>
        <SessionProvider>
          <div data-testid="child">Child</div>
        </SessionProvider>
      </ErrorBoundary>);
        expect(screen.getByTestId('child')).toBeInTheDocument();
    });
});
//# sourceMappingURL=session-provider.test.jsx.map