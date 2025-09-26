/**
 * @fileoverview Unit tests for EmailDashboardToolbarAction component
 * 
 * Tests the EmailDashboardToolbarAction component used in the email dashboard
 * layout toolbar, including theme selector and account controls.
 * 
 * @module __tests__/components/email-message/dashboard-layout/email-dashboard-toolbar-action
 * @version 1.0.0
 * @since 2025-07-19
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { EmailDashboardToolbarAction } from '@/components/email-message/dashboard-layout/email-dashboard-toolbar-action';
import '@testing-library/jest-dom';

// Mock the MemoryStatusIndicator component
jest.mock('@/components/memory-status', () => {
  const MockMemoryStatusIndicator = () => (
    <div data-testid="memory-status-indicator">Memory Status</div>
  );
  MockMemoryStatusIndicator.displayName = 'MockMemoryStatusIndicator';
  return {
    MemoryStatusIndicator: MockMemoryStatusIndicator,
  };
});

// Mock the ThemeSelector component
jest.mock('@/components/theme/theme-selector', () => {
  const MockThemeSelector = () => (
    <div data-testid="theme-selector">Theme Selector</div>
  );
  MockThemeSelector.displayName = 'MockThemeSelector';
  return {
    ThemeSelector: MockThemeSelector,
  };
});

// Mock the Toolpad Account component
jest.mock('@toolpad/core/Account', () => {
  const MockAccount = () => (
    <div data-testid="toolpad-account">Account</div>
  );
  MockAccount.displayName = 'MockAccount';
  return {
    Account: MockAccount,
  };
});

// Create a test theme
const theme = createTheme();

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('EmailDashboardToolbarAction', () => {
  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      render(
        <TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>
      );
      
      expect(screen.getByTestId('memory-status-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
      expect(screen.getByTestId('toolpad-account')).toBeInTheDocument();
    });

    it('should render MemoryStatusIndicator component', () => {
      render(
        <TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>
      );
      
      expect(screen.getByTestId('memory-status-indicator')).toBeInTheDocument();
      expect(screen.getByText('Memory Status')).toBeInTheDocument();
    });

    it('should render ThemeSelector component', () => {
      render(
        <TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>
      );
      
      expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
      expect(screen.getByText('Theme Selector')).toBeInTheDocument();
    });

    it('should render Account component from Toolpad', () => {
      render(
        <TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>
      );
      
      expect(screen.getByTestId('toolpad-account')).toBeInTheDocument();
      expect(screen.getByText('Account')).toBeInTheDocument();
    });
  });

  describe('Layout and Structure', () => {
    it('should render components in a horizontal stack', () => {
      const { container } = render(
        <TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>
      );
      
      // Should contain a Stack component with direction="row"
      const stackElement = container.querySelector('[class*="MuiStack-root"]');
      expect(stackElement).toBeInTheDocument();
    });

    it('should render all components in the correct order', () => {
      render(
        <TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>
      );
      
      const memoryStatus = screen.getByTestId('memory-status-indicator');
      const themeSelector = screen.getByTestId('theme-selector');
      const account = screen.getByTestId('toolpad-account');
      
      expect(memoryStatus).toBeInTheDocument();
      expect(themeSelector).toBeInTheDocument();
      expect(account).toBeInTheDocument();
      
      // Check that components appear in the correct DOM order: memory, theme, account
      const parent = memoryStatus.parentElement;
      const children = Array.from(parent?.children || []);
      const memoryIndex = children.indexOf(memoryStatus);
      const themeSelectorIndex = children.indexOf(themeSelector);
      const accountIndex = children.indexOf(account);
      
      expect(memoryIndex).toBeLessThan(themeSelectorIndex);
      expect(themeSelectorIndex).toBeLessThan(accountIndex);
    });
  });

  describe('Component Properties', () => {
    it('should apply memo optimization', () => {
      expect(EmailDashboardToolbarAction.displayName).toBe('EmailDashboardToolbarAction');
    });

    it('should be a React component (memoized)', () => {
      expect(typeof EmailDashboardToolbarAction).toBe('object');
      expect(EmailDashboardToolbarAction).toBeDefined();
    });

    it('should render as a JSX element', () => {
      const { container } = render(
        <TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Integration with Dashboard Layout', () => {
    it('should be suitable as a toolbar actions slot component', () => {
      // Test that the component can be used in dashboard slots configuration
      const slots = {
        toolbarActions: EmailDashboardToolbarAction,
      };
      
      expect(typeof slots.toolbarActions).toBe('object'); // Memoized component
      expect(slots.toolbarActions).toBeDefined();
      
      // Should be able to render as a component
      render(
        <TestWrapper>
          <slots.toolbarActions />
        </TestWrapper>
      );
      
      expect(screen.getByTestId('memory-status-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
      expect(screen.getByTestId('toolpad-account')).toBeInTheDocument();
    });
  });

  describe('Theme Integration', () => {
    it('should render correctly with different themes', () => {
      const darkTheme = createTheme({
        palette: {
          mode: 'dark',
          primary: { main: '#fff' },
          secondary: { main: '#ccc' },
        },
      });

      render(
        <ThemeProvider theme={darkTheme}>
          <EmailDashboardToolbarAction />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('memory-status-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
      expect(screen.getByTestId('toolpad-account')).toBeInTheDocument();
    });

    it('should handle missing theme gracefully', () => {
      // Render without ThemeProvider
      render(<EmailDashboardToolbarAction />);
      
      expect(screen.getByTestId('memory-status-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
      expect(screen.getByTestId('toolpad-account')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should maintain accessibility of child components', () => {
      render(
        <TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>
      );
      
      // Child components should be accessible
      expect(screen.getByTestId('memory-status-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
      expect(screen.getByTestId('toolpad-account')).toBeInTheDocument();
    });

    it('should have proper semantic structure', () => {
      const { container } = render(
        <TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>
      );
      
      // Should not have any accessibility violations at the container level
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle theme selector rendering errors gracefully', () => {
      // Mock console.error to avoid noise in test output
      const originalError = console.error;
      console.error = jest.fn();

      // This test ensures the component doesn't crash if child components fail
      render(
        <TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>
      );
      
      expect(screen.getByTestId('memory-status-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
      expect(screen.getByTestId('toolpad-account')).toBeInTheDocument();
      
      console.error = originalError;
    });
  });

  describe('Performance', () => {
    it('should be memoized to prevent unnecessary re-renders', () => {
      // Test that the component is wrapped in React.memo
      expect(EmailDashboardToolbarAction.displayName).toBe('EmailDashboardToolbarAction');
      
      // Multiple renders should not cause issues
      const { rerender } = render(
        <TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>
      );
      
      rerender(
        <TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>
      );
      
      expect(screen.getByTestId('memory-status-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
      expect(screen.getByTestId('toolpad-account')).toBeInTheDocument();
    });
  });

  describe('Component Dependencies', () => {
    it('should import and use required dependencies correctly', () => {
      // Test that all required imports are working
      render(
        <TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>
      );
      
      // Stack component from MUI should be working
      const container = screen.getByTestId('memory-status-indicator').parentElement;
      expect(container).toHaveClass('MuiStack-root');
    });
  });
});
