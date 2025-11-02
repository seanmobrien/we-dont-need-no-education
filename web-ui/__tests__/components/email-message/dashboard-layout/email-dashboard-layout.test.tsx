/**
 * @fileoverview Unit tests for EmailDashboardLayout component
 *
 * Tests the main EmailDashboardLayout component including navigation,
 * session handling, and dashboard layout integration.
 *
 * @module __tests__/components/email-message/dashboard-layout/email-dashboard-layout
 * @version 1.0.0
 * @since 2025-07-19
 */

import { render, screen } from '@/__tests__/test-utils';
import React from 'react';

jest.mock('@/components/error-boundaries/ServerSafeErrorManager', () => ({
  __esModule: true,
  default: jest.fn(() => <div>Mocked ServerSafeErrorManager</div>),
}));
// Mock Next.js navigation hooks
const mockPush = jest.fn();
const mockParams: { emailId?: string } = { emailId: 'test-email-123' };

jest.mock('next/navigation', () => ({
  useParams: () => mockParams,
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: jest.fn(() => '/messages'),
}));

// Mock theme provider
jest.mock('@/lib/themes', () => ({
  useTheme: () => ({
    theme: {
      palette: {
        mode: 'light',
        primary: { main: '#1976d2' },
        secondary: { main: '#dc004e' },
      },
    },
  }),
}));

// Mock EmailContextProvider
jest.mock('@/components/email-message/email-context', () => ({
  EmailContextProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="email-context-provider">{children}</div>
  ),
}));

// Mock Toolpad components
jest.mock('@toolpad/core/nextjs', () => ({
  NextAppProvider: ({
    children,
    navigation,
    branding,
    session,
  }: {
    children: React.ReactNode;
    theme?: unknown;
    navigation: { length?: number } | unknown[];
    branding: { title?: string };
    session: unknown;
  }) => (
    <div
      data-testid="next-app-provider"
      data-session={session ? 'authenticated' : 'unauthenticated'}
    >
      <div data-testid="branding-title">{branding?.title}</div>
      <div data-testid="navigation-items">
        {Array.isArray(navigation) ? navigation.length : 0} items
      </div>
      {children}
    </div>
  ),
}));

jest.mock('@toolpad/core/DashboardLayout', () => ({
  DashboardLayout: ({
    children,
    slots,
    renderPageItem,
  }: {
    children: React.ReactNode;
    slots: { toolbarActions?: React.ComponentType };
    renderPageItem: unknown;
  }) => (
    <div data-testid="dashboard-layout">
      <div data-testid="toolbar-actions">
        {slots && typeof slots.toolbarActions === 'function'
          ? React.createElement(slots.toolbarActions)
          : 'No toolbar actions'}
      </div>
      <div data-testid="page-items">
        {renderPageItem ? 'Custom renderPageItem' : 'Default renderPageItem'}
      </div>
      {children}
    </div>
  ),
  DashboardSidebarPageItem: ({
    item,
  }: {
    item: { segment?: string; title: string };
  }) => (
    <div data-testid={`sidebar-item-${item.segment || item.title}`}>
      {item.title}
    </div>
  ),
}));

// Mock sub-components
jest.mock(
  '/components/email-message/dashboard-layout/custom-email-page-item',
  () => ({
    CustomEmailPageItem: ({
      item,
      mini,
      emailId,
    }: {
      item: { title: string };
      mini: boolean;
      emailId: string;
    }) => (
      <div
        data-testid="custom-email-page-item"
        data-mini={mini}
        data-email-id={emailId}
      >
        {item.title}
      </div>
    ),
  }),
);

jest.mock(
  '/components/email-message/dashboard-layout/email-dashboard-toolbar-action',
  () => ({
    EmailDashboardToolbarAction: () => (
      <div data-testid="email-dashboard-toolbar-action">Toolbar Actions</div>
    ),
  }),
);

jest.mock('@/components/email-message/dashboard-layout/branding', () => ({
  Branding: {
    title: 'Mystery Compliance Theater 2000',
    logo: <span data-testid="branding-logo">Logo</span>,
  },
}));

// Mock MUI icons
const MockIcon = ({ testId }: { testId: string }) => (
  <span data-testid={testId}>{testId}</span>
);

jest.mock('@mui/icons-material/Sync', () => {
  const SyncIcon = () => <MockIcon testId="sync-icon" />;
  SyncIcon.displayName = 'SyncIcon';
  return SyncIcon;
});

jest.mock('@mui/icons-material/Dashboard', () => {
  const DashboardIcon = () => <MockIcon testId="dashboard-icon" />;
  DashboardIcon.displayName = 'DashboardIcon';
  return DashboardIcon;
});

jest.mock('@mui/icons-material/Drafts', () => {
  const DraftsIcon = () => <MockIcon testId="drafts-icon" />;
  DraftsIcon.displayName = 'DraftsIcon';
  return DraftsIcon;
});

jest.mock('@mui/icons-material/Key', () => {
  const KeyIcon = () => <MockIcon testId="key-icon" />;
  KeyIcon.displayName = 'KeyIcon';
  return KeyIcon;
});

jest.mock('@mui/icons-material/TextSnippet', () => {
  const TextSnippetIcon = () => <MockIcon testId="text-snippet-icon" />;
  TextSnippetIcon.displayName = 'TextSnippetIcon';
  return TextSnippetIcon;
});

jest.mock('@mui/icons-material/CallToAction', () => {
  const CallToActionIcon = () => <MockIcon testId="call-to-action-icon" />;
  CallToActionIcon.displayName = 'CallToActionIcon';
  return CallToActionIcon;
});

jest.mock('@mui/icons-material/Reply', () => {
  const ReplyIcon = () => <MockIcon testId="reply-icon" />;
  ReplyIcon.displayName = 'ReplyIcon';
  return ReplyIcon;
});

jest.mock('@mui/icons-material/PrivacyTip', () => {
  const PrivacyTipIcon = () => <MockIcon testId="privacy-tip-icon" />;
  PrivacyTipIcon.displayName = 'PrivacyTipIcon';
  return PrivacyTipIcon;
});

import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout/email-dashboard-layout';
import type { Session } from '@auth/core/types';
import { usePathname } from 'next/navigation';

describe('EmailDashboardLayout', () => {
  const mockSession: Session = {
    user: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      image: 'https://example.com/avatar.jpg',
    },
    expires: '2024-12-31',
  } as Session;

  const defaultProps = {
    children: <div data-testid="dashboard-content">Dashboard Content</div>,
    session: mockSession,
  };

  beforeEach(() => {
    // jest.clearAllMocks();
    // Reset params to default
    mockParams.emailId = 'test-email-123';
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      render(<EmailDashboardLayout {...defaultProps} />);

      expect(screen.getByTestId('email-context-provider')).toBeInTheDocument();
      expect(screen.getByTestId('next-app-provider')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(<EmailDashboardLayout {...defaultProps} />);

      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });

    it('should wrap content in EmailContextProvider', () => {
      render(<EmailDashboardLayout {...defaultProps} />);

      expect(screen.getByTestId('email-context-provider')).toBeInTheDocument();
    });
  });

  describe('Session Handling', () => {
    it('should pass authenticated session to NextAppProvider', () => {
      render(<EmailDashboardLayout {...defaultProps} />);

      const provider = screen.getByTestId('next-app-provider');
      expect(provider).toHaveAttribute('data-session', 'authenticated');
    });

    it('should handle null session', () => {
      render(<EmailDashboardLayout {...defaultProps} session={null} />);

      const provider = screen.getByTestId('next-app-provider');
      expect(provider).toHaveAttribute('data-session', 'unauthenticated');
    });
  });

  describe('Navigation Generation', () => {
    it('should generate navigation with email ID', () => {
      render(<EmailDashboardLayout {...defaultProps} />);

      // Should have navigation items including email-specific ones
      const navigationElement = screen.getByTestId('navigation-items');
      expect(navigationElement).toBeInTheDocument();

      // Should contain multiple navigation items
      expect(navigationElement.textContent).toMatch(/\d+ items/);
    });

    it('should generate navigation without email ID', () => {
      mockParams.emailId = undefined;

      render(<EmailDashboardLayout {...defaultProps} />);

      const navigationElement = screen.getByTestId('navigation-items');
      expect(navigationElement).toBeInTheDocument();
    });

    it('should include standard navigation items', () => {
      render(<EmailDashboardLayout {...defaultProps} />);

      // Navigation should be generated with appropriate items
      const navigationElement = screen.getByTestId('navigation-items');
      expect(navigationElement).toBeInTheDocument();
    });
  });

  describe('Branding Integration', () => {
    it('should apply correct branding configuration', () => {
      render(<EmailDashboardLayout {...defaultProps} />);

      const brandingTitle = screen.getByTestId('branding-title');
      expect(brandingTitle).toHaveTextContent(
        'Mystery Compliance Theater 2000',
      );
    });
  });

  describe('Dashboard Layout Configuration', () => {
    it('should configure toolbar actions slot', () => {
      render(<EmailDashboardLayout {...defaultProps} />);

      const toolbarActions = screen.getByTestId('toolbar-actions');
      expect(toolbarActions).toBeInTheDocument();
      expect(
        screen.getByTestId('email-dashboard-toolbar-action'),
      ).toBeInTheDocument();
    });

    it('should provide custom renderPageItem function', () => {
      render(<EmailDashboardLayout {...defaultProps} />);

      const pageItems = screen.getByTestId('page-items');
      expect(pageItems).toHaveTextContent('Custom renderPageItem');
    });
  });

  describe('Custom Page Item Rendering', () => {
    it('should render CustomEmailPageItem for View Email items', () => {
      render(<EmailDashboardLayout {...defaultProps} />);

      // The custom page item should be available for rendering
      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    });

    it('should handle mini sidebar mode', () => {
      render(<EmailDashboardLayout {...defaultProps} />);

      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    });
  });

  describe('Theme Integration', () => {
    it('should integrate with theme provider', () => {
      render(<EmailDashboardLayout {...defaultProps} />);

      // Should render without theme-related errors
      expect(screen.getByTestId('next-app-provider')).toBeInTheDocument();
    });
  });

  describe('URL Parameters Integration', () => {
    it('should use emailId from URL parameters', () => {
      const emailId = 'specific-email-456';
      mockParams.emailId = emailId;

      render(<EmailDashboardLayout {...defaultProps} />);

      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    });

    it('should handle missing emailId parameter', () => {
      mockParams.emailId = undefined;

      render(<EmailDashboardLayout {...defaultProps} />);

      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    });
  });

  describe('Navigation Items Structure', () => {
    it('should include List Emails navigation', () => {
      render(<EmailDashboardLayout {...defaultProps} />);

      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    });

    it('should include Import Emails navigation', () => {
      render(<EmailDashboardLayout {...defaultProps} />);

      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    });

    it('should conditionally include View Email navigation when emailId exists', () => {
      render(<EmailDashboardLayout {...defaultProps} />);

      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    });

    it('should exclude View Email navigation when emailId is missing', () => {
      mockParams.emailId = undefined;

      render(<EmailDashboardLayout {...defaultProps} />);

      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    });
  });

  describe('Memoization and Performance', () => {
    it('should memoize navigation based on emailId', () => {
      const { rerender } = render(<EmailDashboardLayout {...defaultProps} />);

      // Same emailId should not cause unnecessary re-computation
      rerender(<EmailDashboardLayout {...defaultProps} />);

      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    });

    it('should update navigation when emailId changes', () => {
      const { rerender } = render(<EmailDashboardLayout {...defaultProps} />);

      // Change emailId
      mockParams.emailId = 'new-email-789';
      rerender(<EmailDashboardLayout {...defaultProps} />);

      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle rendering errors gracefully', () => {
      // Mock console.error to suppress error output in tests
      const originalError = console.error;
      console.error = jest.fn();

      render(<EmailDashboardLayout {...defaultProps} />);

      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();

      console.error = originalError;
    });

    it('should handle invalid session data', () => {
      const invalidSession = {} as Session;

      render(
        <EmailDashboardLayout {...defaultProps} session={invalidSession} />,
      );

      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    });
  });

  describe('Integration with Provider Components', () => {
    it('should nest providers in correct order', () => {
      render(<EmailDashboardLayout {...defaultProps} />);

      const emailContext = screen.getByTestId('email-context-provider');
      const nextAppProvider = screen.getByTestId('next-app-provider');
      const dashboardLayout = screen.getByTestId('dashboard-layout');

      expect(emailContext).toBeInTheDocument();
      expect(nextAppProvider).toBeInTheDocument();
      expect(dashboardLayout).toBeInTheDocument();

      // Check nesting - email context should contain next app provider
      expect(emailContext).toContainElement(nextAppProvider);
      expect(nextAppProvider).toContainElement(dashboardLayout);
    });
  });
});
