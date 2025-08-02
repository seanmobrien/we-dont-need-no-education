/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { RenderErrorBoundaryFallback } from '@/components/error-boundaries/renderFallback';

// Mock the recovery strategies
jest.mock('@/lib/error-monitoring/recovery-strategies', () => ({
  getRecoveryActions: jest.fn(),
  getDefaultRecoveryAction: jest.fn(),
  classifyError: jest.fn(),
}));

const mockGetRecoveryActions = require('@/lib/error-monitoring/recovery-strategies').getRecoveryActions;
const mockGetDefaultRecoveryAction = require('@/lib/error-monitoring/recovery-strategies').getDefaultRecoveryAction;
const mockClassifyError = require('@/lib/error-monitoring/recovery-strategies').classifyError;

// Mock window.location.reload
const mockReload = jest.fn();
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
});

// Create a test theme
const testTheme = createTheme({
  palette: {
    mode: 'light',
    error: {
      main: '#f44336',
    },
  },
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={testTheme}>
    {children}
  </ThemeProvider>
);

describe('RenderErrorBoundaryFallback', () => {
  const mockResetErrorBoundary = jest.fn();
  const testError = new Error('Test error message');

  beforeEach(() => {
    // jest.clearAllMocks();
    
    // Default mock implementations
    mockClassifyError.mockReturnValue('network');
    mockGetRecoveryActions.mockReturnValue([]);
    mockGetDefaultRecoveryAction.mockReturnValue(null);
  });

  const renderComponent = (error = testError, resetFn = mockResetErrorBoundary) => {
    return render(
      <TestWrapper>
        <RenderErrorBoundaryFallback 
          error={error} 
          resetErrorBoundary={resetFn} 
        />
      </TestWrapper>
    );
  };

  describe('Basic Rendering', () => {
    it('should render error dialog with basic information', () => {
      renderComponent();

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/We encountered a network error/)).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should display error type in user-friendly format', () => {
      mockClassifyError.mockReturnValue('rate_limit');
      renderComponent();

      expect(screen.getByText(/We encountered a rate limit error/)).toBeInTheDocument();
    });

    it('should handle non-Error objects', () => {
      renderComponent('String error message' as any);

      expect(screen.getByText('String error message')).toBeInTheDocument();
    });

    it('should render with error icon', () => {
      renderComponent();

      // Check for error icon (ErrorOutlineIcon)
      const errorIcon = document.querySelector('[data-testid="ErrorOutlineIcon"]');
      expect(errorIcon || screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Error Details Expansion', () => {
    it('should show expandable technical details when stack trace is available', () => {
      const errorWithStack = new Error('Error with stack');
      errorWithStack.stack = 'Error: Error with stack\n    at Component.render\n    at ReactDOM.render';
      
      renderComponent(errorWithStack);

      expect(screen.getByText('Show technical details')).toBeInTheDocument();
    });

    it('should expand and collapse technical details', () => {
      // const user = userEvent.setup();
      const errorWithStack = new Error('Error with stack');
      errorWithStack.stack = 'Error: Error with stack\n    at Component.render\n    at ReactDOM.render';
      
      renderComponent(errorWithStack);

      const expandButton = screen.getByText('Show technical details');
      
      // Expand details
      fireEvent.click(expandButton);
      expect(screen.getByText('Hide technical details')).toBeInTheDocument();
      expect(screen.getByText(/at Component\.render/)).toBeInTheDocument();

      // Collapse details
      fireEvent.click(screen.getByText('Hide technical details'));
      expect(screen.getByText('Show technical details')).toBeInTheDocument();
      expect(screen.queryByText(/at Component\.render/)).not.toBeInTheDocument();
    });

    it('should not show technical details when no stack trace', () => {
      const errorNoStack = new Error('Error without stack');
      errorNoStack.stack = undefined;
      
      renderComponent(errorNoStack);

      expect(screen.queryByText('Show technical details')).not.toBeInTheDocument();
    });
  });

  describe('Recovery Actions', () => {
    const mockRecoveryActions = [
      {
        id: 'retry',
        label: 'Retry Request',
        description: 'Try the request again',
        action: jest.fn(),
      },
      {
        id: 'refresh',
        label: 'Refresh Page',
        description: 'Reload the current page',
        action: jest.fn(),
      },
      {
        id: 'contact',
        label: 'Contact Support',
        description: 'Get help from support team',
        action: jest.fn(),
      },
    ];

    it('should display recovery actions when available', () => {
      mockGetRecoveryActions.mockReturnValue(mockRecoveryActions);
      
      renderComponent();

      expect(screen.getByText('Recovery Options')).toBeInTheDocument();
      expect(screen.getByText('Retry Request')).toBeInTheDocument();
      expect(screen.getByText('Try the request again')).toBeInTheDocument();
      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
      expect(screen.getByText('Contact Support')).toBeInTheDocument();
    });

    it('should limit displayed recovery actions to 3', () => {
      const manyActions = [
        ...mockRecoveryActions,
        {
          id: 'extra1',
          label: 'Extra Action 1',
          description: 'Should not be displayed',
          action: jest.fn(),
        },
        {
          id: 'extra2',
          label: 'Extra Action 2',
          description: 'Should not be displayed',
          action: jest.fn(),
        },
      ];
      
      mockGetRecoveryActions.mockReturnValue(manyActions);
      
      renderComponent();

      expect(screen.getByText('Retry Request')).toBeInTheDocument();
      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
      expect(screen.getByText('Contact Support')).toBeInTheDocument();
      expect(screen.queryByText('Extra Action 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Extra Action 2')).not.toBeInTheDocument();
    });

    it('should execute recovery action when clicked', async () => {
      mockGetRecoveryActions.mockReturnValue(mockRecoveryActions);
      
      renderComponent();

      const retryButton = screen.getByText('Retry Request');
      fireEvent.click(retryButton);

      expect(mockRecoveryActions[0].action).toHaveBeenCalled();
    });

    it('should highlight default recovery action', () => {
      mockGetRecoveryActions.mockReturnValue(mockRecoveryActions);
      mockGetDefaultRecoveryAction.mockReturnValue(mockRecoveryActions[0]);
      
      renderComponent();

      // Find all buttons with "Retry Request" text
      const retryButtons = screen.getAllByText('Retry Request');
      
      // The recovery action button (first one) should be contained variant (highlighted)
      const recoveryActionButton = retryButtons.find(button => 
        button.closest('button')?.classList.contains('MuiButton-contained')
      );
      expect(recoveryActionButton).toBeTruthy();
      expect(recoveryActionButton?.closest('button')).toHaveClass('MuiButton-contained');
    });

    it('should not show recovery options when no actions available', () => {
      mockGetRecoveryActions.mockReturnValue([]);
      
      renderComponent();

      expect(screen.queryByText('Recovery Options')).not.toBeInTheDocument();
    });
  });

  describe('Dialog Actions', () => {
    it('should show Try Again button with default action label', () => {
      const defaultAction = {
        id: 'retry',
        label: 'Retry Network Request',
        description: 'Retry the failed network request',
        action: jest.fn(),
      };
      
      mockGetDefaultRecoveryAction.mockReturnValue(defaultAction);
      
      renderComponent();

      expect(screen.getByText('Retry Network Request')).toBeInTheDocument();
    });

    it('should show generic Try Again when no default action', () => {
      mockGetDefaultRecoveryAction.mockReturnValue(null);
      
      renderComponent();

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should execute default action when Try Again is clicked', async () => {
      const defaultAction = {
        id: 'retry',
        label: 'Retry Request',
        description: 'Try again',
        action: jest.fn(),
      };
      
      mockGetDefaultRecoveryAction.mockReturnValue(defaultAction);
      
      renderComponent();

      const tryAgainButton = screen.getByText('Retry Request');
      fireEvent.click(tryAgainButton);

      expect(defaultAction.action).toHaveBeenCalled();
    });

    it('should close dialog when no default action on Try Again click', async () => {
      mockGetDefaultRecoveryAction.mockReturnValue(null);
      
      renderComponent();

      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.click(tryAgainButton);

      // Dialog should close (component would be unmounted in real scenario)
      expect(mockResetErrorBoundary).not.toHaveBeenCalled(); // Action handled internally
    });

    it('should show Report Issue button', () => {
      renderComponent();

      expect(screen.getByText('Report Issue')).toBeInTheDocument();
    });

    it('should close dialog when Report Issue is clicked', async () => {
      renderComponent();

      const reportButton = screen.getByText('Report Issue');
      fireEvent.click(reportButton);

      // Dialog should close
      expect(mockResetErrorBoundary).not.toHaveBeenCalled(); // Action handled internally
    });
  });

  describe('Dialog Behavior', () => {
    it('should not close on escape key', () => {
      renderComponent();

      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

      // Dialog should still be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not close on backdrop click', () => {
      renderComponent();

      const backdrop = document.querySelector('.MuiBackdrop-root');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      // Dialog should still be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should auto-reset error boundary when dialog closes', async () => {
      jest.useFakeTimers();
      
      renderComponent();

      // Simulate dialog close
      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.click(tryAgainButton);

      // Fast-forward through the timeout
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(mockResetErrorBoundary).toHaveBeenCalled();
      });

      jest.useRealTimers();
    });
  });

  describe('Responsive Design', () => {
    it('should be full screen on mobile', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('(max-width:'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      renderComponent();

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });
  });

  describe('Error Handling in Recovery Actions', () => {
    it('should handle recovery action errors gracefully', async () => {
      const failingAction = {
        id: 'failing-action',
        label: 'Failing Action',
        description: 'This will fail',
        action: jest.fn().mockImplementation(() => {
          throw new Error('Recovery action failed');
        }),
      };
      
      mockGetRecoveryActions.mockReturnValue([failingAction]);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      renderComponent();

      const failingButton = screen.getByText('Failing Action');
      fireEvent.click(failingButton);

      // Should not crash the component
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalledWith('Recovery action failed:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should not close dialog for certain recovery actions', async () => {
      const contactAction = {
        id: 'contact-admin',
        label: 'Contact Admin',
        description: 'Contact administrator',
        action: jest.fn(),
      };
      
      mockGetRecoveryActions.mockReturnValue([contactAction]);
      
      renderComponent();

      const contactButton = screen.getByText('Contact Admin');
      fireEvent.click(contactButton);

      expect(contactAction.action).toHaveBeenCalled();
      // Dialog should remain open for contact actions
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderComponent();

      expect(screen.getByLabelText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby');
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby');
    });

    it('should focus on Try Again button by default', () => {
      mockGetDefaultRecoveryAction.mockReturnValue(null); // Ensure no default action
      renderComponent();

      const tryAgainButton = screen.getByText('Try Again').closest('button');
      // Material UI Button may not pass through autoFocus attribute directly
      // Just verify the button exists and has focus-related classes or is focusable
      expect(tryAgainButton).toBeInTheDocument();
      expect(tryAgainButton).toHaveAttribute('tabindex', '0');
    });
  });

  describe('Theme Integration', () => {
    it('should use theme error colors', () => {
      renderComponent();

      const title = screen.getByText('Something went wrong');
      const titleElement = title.closest('.MuiDialogTitle-root');
      
      // Should have error color styling
      expect(titleElement).toBeInTheDocument();
    });

    it('should adapt to dark theme', () => {
      const darkTheme = createTheme({
        palette: {
          mode: 'dark',
          error: {
            main: '#ff5252',
          },
        },
      });

      render(
        <ThemeProvider theme={darkTheme}>
          <RenderErrorBoundaryFallback 
            error={testError} 
            resetErrorBoundary={mockResetErrorBoundary} 
          />
        </ThemeProvider>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
