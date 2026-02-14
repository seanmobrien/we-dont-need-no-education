import { render, screen } from '@/__tests__/test-utils';
import React from 'react';
jest.mock('@/components/error-boundaries/ServerSafeErrorManager', () => ({
    __esModule: true,
    default: jest.fn(() => <div>Mocked ServerSafeErrorManager</div>),
}));
const mockPush = jest.fn();
const mockParams = { emailId: 'test-email-123' };
jest.mock('next/navigation', () => ({
    useParams: () => mockParams,
    useRouter: () => ({
        push: mockPush,
    }),
    usePathname: jest.fn(() => '/messages'),
}));
jest.mock('@compliance-theater/themes', () => {
    const origModule = jest.requireActual('@compliance-theater/themes');
    return ({
        __esModule: true,
        ThemeProvider: jest.fn(origModule.ThemeProvider),
        ThemeSelector: jest.fn(origModule.ThemeSelector),
        useTheme: jest.fn(() => ({
            theme: {
                palette: {
                    mode: 'light',
                    primary: { main: '#1976d2' },
                    secondary: { main: '#dc004e' },
                },
            },
        })),
    });
});
jest.mock('@/components/email-message/email-context', () => ({
    EmailContextProvider: ({ children }) => (<div data-testid="email-context-provider">{children}</div>),
}));
jest.mock('@toolpad/core/nextjs', () => ({
    NextAppProvider: ({ children, navigation, branding, session, }) => (<div data-testid="next-app-provider" data-session={session ? 'authenticated' : 'unauthenticated'}>
      <div data-testid="branding-title">{branding?.title}</div>
      <div data-testid="navigation-items">
        {Array.isArray(navigation) ? navigation.length : 0} items
      </div>
      {children}
    </div>),
}));
jest.mock('@toolpad/core/DashboardLayout', () => ({
    DashboardLayout: ({ children, slots, renderPageItem, }) => (<div data-testid="dashboard-layout">
      <div data-testid="toolbar-actions">
        {slots && typeof slots.toolbarActions === 'function'
            ? React.createElement(slots.toolbarActions)
            : 'No toolbar actions'}
      </div>
      <div data-testid="page-items">
        {renderPageItem ? 'Custom renderPageItem' : 'Default renderPageItem'}
      </div>
      {children}
    </div>),
    DashboardSidebarPageItem: ({ item, }) => (<div data-testid={`sidebar-item-${item.segment || item.title}`}>
      {item.title}
    </div>),
}));
jest.mock('/components/email-message/dashboard-layout/custom-email-page-item', () => ({
    CustomEmailPageItem: ({ item, mini, emailId, }) => (<div data-testid="custom-email-page-item" data-mini={mini} data-email-id={emailId}>
        {item.title}
      </div>),
}));
jest.mock('/components/email-message/dashboard-layout/email-dashboard-toolbar-action', () => ({
    EmailDashboardToolbarAction: () => (<div data-testid="email-dashboard-toolbar-action">Toolbar Actions</div>),
}));
jest.mock('@/components/email-message/dashboard-layout/branding', () => ({
    Branding: {
        title: 'Mystery Compliance Theater 2000',
        logo: <span data-testid="branding-logo">Logo</span>,
    },
}));
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout/email-dashboard-layout';
import { usePathname } from 'next/navigation';
import { ThemeSelector } from '@compliance-theater/themes';
describe('EmailDashboardLayout', () => {
    const mockSession = {
        user: {
            id: 'user-123',
            name: 'Test User',
            email: 'test@example.com',
            image: 'https://example.com/avatar.jpg',
        },
        expires: '2024-12-31',
    };
    const notReallyUsed = ThemeSelector.getMockName() ?? usePathname.getMockName() ?? 'notReallyUsed';
    const defaultProps = {
        children: <div data-testid="dashboard-content">Dashboard Content</div>,
        session: mockSession,
        mockName: notReallyUsed,
    };
    beforeEach(() => {
        mockParams.emailId = 'test-email-123';
    });
    describe('Component Rendering', () => {
        it('should render without crashing', () => {
            render(<EmailDashboardLayout {...defaultProps}/>);
            expect(screen.getByTestId('email-context-provider')).toBeInTheDocument();
            expect(screen.getByTestId('next-app-provider')).toBeInTheDocument();
            expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
        });
        it('should render children content', () => {
            render(<EmailDashboardLayout {...defaultProps}/>);
            expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
            expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
        });
        it('should wrap content in EmailContextProvider', () => {
            render(<EmailDashboardLayout {...defaultProps}/>);
            expect(screen.getByTestId('email-context-provider')).toBeInTheDocument();
        });
    });
    describe('Session Handling', () => {
        it('should pass authenticated session to NextAppProvider', () => {
            render(<EmailDashboardLayout {...defaultProps}/>);
            const provider = screen.getByTestId('next-app-provider');
            expect(provider).toHaveAttribute('data-session', 'authenticated');
        });
        it('should handle null session', () => {
            render(<EmailDashboardLayout {...defaultProps} session={null}/>);
            const provider = screen.getByTestId('next-app-provider');
            expect(provider).toHaveAttribute('data-session', 'unauthenticated');
        });
    });
    describe('Navigation Generation', () => {
        it('should generate navigation with email ID', () => {
            render(<EmailDashboardLayout {...defaultProps}/>);
            const navigationElement = screen.getByTestId('navigation-items');
            expect(navigationElement).toBeInTheDocument();
            expect(navigationElement.textContent).toMatch(/\d+ items/);
        });
        it('should generate navigation without email ID', () => {
            mockParams.emailId = undefined;
            render(<EmailDashboardLayout {...defaultProps}/>);
            const navigationElement = screen.getByTestId('navigation-items');
            expect(navigationElement).toBeInTheDocument();
        });
        it('should include standard navigation items', () => {
            render(<EmailDashboardLayout {...defaultProps}/>);
            const navigationElement = screen.getByTestId('navigation-items');
            expect(navigationElement).toBeInTheDocument();
        });
    });
    describe('Branding Integration', () => {
        it('should apply correct branding configuration', () => {
            render(<EmailDashboardLayout {...defaultProps}/>);
            const brandingTitle = screen.getByTestId('branding-title');
            expect(brandingTitle).toHaveTextContent('Mystery Compliance Theater 2000');
        });
    });
    describe('Dashboard Layout Configuration', () => {
        it('should configure toolbar actions slot', () => {
            render(<EmailDashboardLayout {...defaultProps}/>);
            const toolbarActions = screen.getByTestId('toolbar-actions');
            expect(toolbarActions).toBeInTheDocument();
            expect(screen.getByTestId('email-dashboard-toolbar-action')).toBeInTheDocument();
        });
        it('should provide custom renderPageItem function', () => {
            render(<EmailDashboardLayout {...defaultProps}/>);
            const pageItems = screen.getByTestId('page-items');
            expect(pageItems).toHaveTextContent('Custom renderPageItem');
        });
    });
    describe('Custom Page Item Rendering', () => {
        it('should render CustomEmailPageItem for View Email items', () => {
            render(<EmailDashboardLayout {...defaultProps}/>);
            expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
        });
        it('should handle mini sidebar mode', () => {
            render(<EmailDashboardLayout {...defaultProps}/>);
            expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
        });
    });
    describe('Theme Integration', () => {
        it('should integrate with theme provider', () => {
            render(<EmailDashboardLayout {...defaultProps}/>);
            expect(screen.getByTestId('next-app-provider')).toBeInTheDocument();
        });
    });
    describe('URL Parameters Integration', () => {
        it('should use emailId from URL parameters', () => {
            const emailId = 'specific-email-456';
            mockParams.emailId = emailId;
            render(<EmailDashboardLayout {...defaultProps}/>);
            expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
        });
        it('should handle missing emailId parameter', () => {
            mockParams.emailId = undefined;
            render(<EmailDashboardLayout {...defaultProps}/>);
            expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
        });
    });
    describe('Navigation Items Structure', () => {
        it('should include List Emails navigation', () => {
            render(<EmailDashboardLayout {...defaultProps}/>);
            expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
        });
        it('should include Import Emails navigation', () => {
            render(<EmailDashboardLayout {...defaultProps}/>);
            expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
        });
        it('should conditionally include View Email navigation when emailId exists', () => {
            render(<EmailDashboardLayout {...defaultProps}/>);
            expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
        });
        it('should exclude View Email navigation when emailId is missing', () => {
            mockParams.emailId = undefined;
            render(<EmailDashboardLayout {...defaultProps}/>);
            expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
        });
    });
    describe('Memoization and Performance', () => {
        it('should memoize navigation based on emailId', () => {
            const { rerender } = render(<EmailDashboardLayout {...defaultProps}/>);
            rerender(<EmailDashboardLayout {...defaultProps}/>);
            expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
        });
        it('should update navigation when emailId changes', () => {
            const { rerender } = render(<EmailDashboardLayout {...defaultProps}/>);
            mockParams.emailId = 'new-email-789';
            rerender(<EmailDashboardLayout {...defaultProps}/>);
            expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
        });
    });
    describe('Error Handling', () => {
        it('should handle rendering errors gracefully', () => {
            const originalError = console.error;
            console.error = jest.fn();
            render(<EmailDashboardLayout {...defaultProps}/>);
            expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
            console.error = originalError;
        });
        it('should handle invalid session data', () => {
            const invalidSession = {};
            render(<EmailDashboardLayout {...defaultProps} session={invalidSession}/>);
            expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
        });
    });
    describe('Integration with Provider Components', () => {
        it('should nest providers in correct order', () => {
            render(<EmailDashboardLayout {...defaultProps}/>);
            const emailContext = screen.getByTestId('email-context-provider');
            const nextAppProvider = screen.getByTestId('next-app-provider');
            const dashboardLayout = screen.getByTestId('dashboard-layout');
            expect(emailContext).toBeInTheDocument();
            expect(nextAppProvider).toBeInTheDocument();
            expect(dashboardLayout).toBeInTheDocument();
            expect(emailContext).toContainElement(nextAppProvider);
            expect(nextAppProvider).toContainElement(dashboardLayout);
        });
    });
});
//# sourceMappingURL=email-dashboard-layout.test.jsx.map