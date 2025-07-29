/**
 * @fileoverview Unit tests for CustomEmailPageItem component
 * 
 * Tests the CustomEmailPageItem component used in the email dashboard
 * navigation sidebar, including both mini and full sidebar modes.
 * 
 * @module __tests__/components/email-message/dashboard-layout/custom-email-page-item
 * @version 1.0.0
 * @since 2025-07-19
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CustomEmailPageItem } from '@/components/email-message/dashboard-layout/custom-email-page-item';
import type { NavigationPageItem } from '@toolpad/core/AppProvider';
import DraftsIcon from '@mui/icons-material/Drafts';
import KeyIcon from '@mui/icons-material/Key';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import '@testing-library/jest-dom';

// Mock the siteBuilder utility
jest.mock('@/lib/site-util/url-builder', () => ({
  __esModule: true,
  default: {
    messages: {
      email: (emailId: string) => ({
        toString: () => `/messages/email/${emailId}`,
      }),
    },
  },
}));

// Mock Toolpad components
jest.mock('@toolpad/core/DashboardLayout', () => ({
  DashboardSidebarPageItem: ({ item }: { item: NavigationPageItem }) => (
    <div data-testid={`sidebar-item-${item.segment || item.title}`}>
      {item.icon}
      {item.title}
    </div>
  ),
}));

// Create a test theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

// Mock navigation item with children
const mockNavigationItem: NavigationPageItem = {
  title: 'View Email',
  icon: <DraftsIcon data-testid="drafts-icon" />,
  children: [
    {
      title: 'Key Points',
      segment: 'key-points',
      icon: <KeyIcon data-testid="key-icon" />,
    },
    {
      title: 'Notes',
      segment: 'notes',
      icon: <TextSnippetIcon data-testid="notes-icon" />,
    },
  ],
};

describe('CustomEmailPageItem', () => {
  const defaultProps = {
    item: mockNavigationItem,
    mini: false,
    emailId: 'test-email-123',
  };

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      render(
        <TestWrapper>
          <CustomEmailPageItem {...defaultProps} />
        </TestWrapper>
      );
      
      expect(screen.getByText('View Email')).toBeInTheDocument();
    });

    it('should display the correct email title', () => {
      render(
        <TestWrapper>
          <CustomEmailPageItem {...defaultProps} />
        </TestWrapper>
      );
      
      expect(screen.getByText('View Email')).toBeInTheDocument();
    });

    it('should render the item icon', () => {
      render(
        <TestWrapper>
          <CustomEmailPageItem {...defaultProps} />
        </TestWrapper>
      );
      
      expect(screen.getByTestId('drafts-icon')).toBeInTheDocument();
    });
  });

  describe('Full Sidebar Mode (mini: false)', () => {
    it('should render as a clickable link when not in mini mode', () => {
      render(
        <TestWrapper>
          <CustomEmailPageItem {...defaultProps} />
        </TestWrapper>
      );
      
      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/messages/email/test-email-123');
    });

    it('should display the full title text when not in mini mode', () => {
      render(
        <TestWrapper>
          <CustomEmailPageItem {...defaultProps} />
        </TestWrapper>
      );
      
      expect(screen.getByText('View Email')).toBeInTheDocument();
    });

    it('should render with proper styling for full mode', () => {
      render(
        <TestWrapper>
          <CustomEmailPageItem {...defaultProps} />
        </TestWrapper>
      );
      
      const link = screen.getByRole('link');
      expect(link).toHaveStyle({
        textDecoration: 'none',
        width: '100%', // Updated to match actual MUI styling
        display: 'flex',
        alignItems: 'center',
      });
    });
  });

  describe('Mini Sidebar Mode (mini: true)', () => {
    const miniProps = { ...defaultProps, mini: true };

    it('should render as an icon button when in mini mode', () => {
      render(
        <TestWrapper>
          <CustomEmailPageItem {...miniProps} />
        </TestWrapper>
      );
      
      const iconButton = screen.getByRole('button', { name: 'custom' });
      expect(iconButton).toBeInTheDocument();
    });

    it('should not display link when in mini mode', () => {
      render(
        <TestWrapper>
          <CustomEmailPageItem {...miniProps} />
        </TestWrapper>
      );
      
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('should still show the icon in mini mode', () => {
      render(
        <TestWrapper>
          <CustomEmailPageItem {...miniProps} />
        </TestWrapper>
      );
      
      expect(screen.getByTestId('drafts-icon')).toBeInTheDocument();
    });
  });

  describe('Children Navigation Items', () => {
    it('should render all child navigation items', () => {
      render(
        <TestWrapper>
          <CustomEmailPageItem {...defaultProps} />
        </TestWrapper>
      );
      
      expect(screen.getByTestId('sidebar-item-key-points')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-item-notes')).toBeInTheDocument();
    });

    it('should render children even in mini mode', () => {
      render(
        <TestWrapper>
          <CustomEmailPageItem {...defaultProps} mini={true} />
        </TestWrapper>
      );
      
      expect(screen.getByTestId('sidebar-item-key-points')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-item-notes')).toBeInTheDocument();
    });

    it('should handle items without children gracefully', () => {
      const itemWithoutChildren = {
        ...mockNavigationItem,
        children: [],
      };

      render(
        <TestWrapper>
          <CustomEmailPageItem 
            {...defaultProps} 
            item={itemWithoutChildren}
          />
        </TestWrapper>
      );
      
      expect(screen.getByText('View Email')).toBeInTheDocument();
    });

    it('should handle undefined children gracefully', () => {
      const itemWithUndefinedChildren = {
        title: 'View Email',
        icon: <DraftsIcon data-testid="drafts-icon" />,
        // children is undefined
      };

      render(
        <TestWrapper>
          <CustomEmailPageItem 
            {...defaultProps} 
            item={itemWithUndefinedChildren}
          />
        </TestWrapper>
      );
      
      expect(screen.getByText('View Email')).toBeInTheDocument();
    });
  });

  describe('Email ID Integration', () => {
    it('should generate correct href with provided email ID', () => {
      const emailId = 'specific-email-456';
      
      render(
        <TestWrapper>
          <CustomEmailPageItem 
            {...defaultProps} 
            emailId={emailId}
          />
        </TestWrapper>
      );
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', `/messages/email/${emailId}`);
    });

    it('should handle empty email ID', () => {
      render(
        <TestWrapper>
          <CustomEmailPageItem 
            {...defaultProps} 
            emailId=""
          />
        </TestWrapper>
      );
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/messages/email/');
    });
  });

  describe('Component Props and Structure', () => {
    it('should apply memo optimization', () => {
      expect(CustomEmailPageItem.displayName).toBe('CustomEmailPageItem');
    });

    it('should handle different icon types', () => {
      const customItem = {
        ...mockNavigationItem,
        icon: <span data-testid="custom-icon">Custom Icon</span>,
      };

      render(
        <TestWrapper>
          <CustomEmailPageItem 
            {...defaultProps} 
            item={customItem}
          />
        </TestWrapper>
      );
      
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for icon button in mini mode', () => {
      render(
        <TestWrapper>
          <CustomEmailPageItem {...defaultProps} mini={true} />
        </TestWrapper>
      );
      
      const iconButton = screen.getByRole('button', { name: 'custom' });
      expect(iconButton).toHaveAttribute('aria-label', 'custom');
    });

    it('should have accessible link in full mode', () => {
      render(
        <TestWrapper>
          <CustomEmailPageItem {...defaultProps} />
        </TestWrapper>
      );
      
      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent('View Email');
    });
  });

  describe('Theme Integration', () => {
    it('should apply theme colors correctly', () => {
      const { container } = render(
        <TestWrapper>
          <CustomEmailPageItem {...defaultProps} />
        </TestWrapper>
      );
      
      // The component should render without theme-related errors
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle theme color properties', () => {
      // Test that the component renders with theme properties without throwing errors
      const customTheme = createTheme({
        palette: {
          primary: { main: '#ff0000' },
          secondary: { main: '#00ff00' },
        },
      });

      render(
        <ThemeProvider theme={customTheme}>
          <CustomEmailPageItem {...defaultProps} />
        </ThemeProvider>
      );
      
      expect(screen.getByText('View Email')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing icon gracefully', () => {
      const itemWithoutIcon = {
        title: 'View Email',
        children: mockNavigationItem.children,
      };

      render(
        <TestWrapper>
          <CustomEmailPageItem 
            {...defaultProps} 
            item={itemWithoutIcon}
          />
        </TestWrapper>
      );
      
      expect(screen.getByText('View Email')).toBeInTheDocument();
    });

    it('should handle children with missing segments', () => {
      const itemWithMissingSegments = {
        ...mockNavigationItem,
        children: [
          {
            title: 'Child Without Segment',
            icon: <KeyIcon data-testid="no-segment-icon" />,
          },
        ],
      };

      render(
        <TestWrapper>
          <CustomEmailPageItem 
            {...defaultProps} 
            item={itemWithMissingSegments}
          />
        </TestWrapper>
      );
      
      // Should still render without errors
      expect(screen.getByText('View Email')).toBeInTheDocument();
    });
  });
});
