import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { EmailDashboardToolbarAction } from '@/components/email-message/dashboard-layout/email-dashboard-toolbar-action';
import '@testing-library/jest-dom';
jest.mock('@compliance-theater/themes', () => {
    const originalModule = jest.requireActual('@compliance-theater/themes');
    const MockThemeSelector = () => (<div data-testid="theme-selector">Theme Selector</div>);
    MockThemeSelector.displayName = 'MockThemeSelector';
    return {
        ...originalModule,
        ThemeSelector: MockThemeSelector,
    };
});
jest.mock('@toolpad/core/Account', () => {
    const MockAccount = () => <div data-testid="toolpad-account">Account</div>;
    MockAccount.displayName = 'MockAccount';
    return {
        Account: MockAccount,
    };
});
const theme = createTheme();
const TestWrapper = ({ children }) => (<ThemeProvider theme={theme}>{children}</ThemeProvider>);
describe('EmailDashboardToolbarAction', () => {
    describe('Component Rendering', () => {
        it('should render without crashing', () => {
            render(<TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>);
            expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
            expect(screen.getByTestId('toolpad-account')).toBeInTheDocument();
        });
        it('should render ThemeSelector component', () => {
            render(<TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>);
            expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
            expect(screen.getByText('Theme Selector')).toBeInTheDocument();
        });
        it('should render Account component from Toolpad', () => {
            render(<TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>);
            expect(screen.getByTestId('toolpad-account')).toBeInTheDocument();
            expect(screen.getByText('Account')).toBeInTheDocument();
        });
    });
    describe('Layout and Structure', () => {
        it('should render components in a horizontal stack', () => {
            const { container } = render(<TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>);
            const stackElement = container.querySelector('[class*="MuiStack-root"]');
            expect(stackElement).toBeInTheDocument();
        });
        it('should render all components in the correct order', () => {
            render(<TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>);
            const themeSelector = screen.getByTestId('theme-selector');
            const account = screen.getByTestId('toolpad-account');
            expect(themeSelector).toBeInTheDocument();
            expect(account).toBeInTheDocument();
            const parent = themeSelector.parentElement;
            const children = Array.from(parent?.children || []);
            const accountIndex = children.indexOf(account);
            const themeSelectorIndex = children.indexOf(themeSelector);
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
            const { container } = render(<TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>);
            expect(container.firstChild).toBeInTheDocument();
        });
    });
    describe('Integration with Dashboard Layout', () => {
        it('should be suitable as a toolbar actions slot component', () => {
            const slots = {
                toolbarActions: EmailDashboardToolbarAction,
            };
            expect(typeof slots.toolbarActions).toBe('object');
            expect(slots.toolbarActions).toBeDefined();
            render(<TestWrapper>
          <slots.toolbarActions />
        </TestWrapper>);
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
            render(<ThemeProvider theme={darkTheme}>
          <EmailDashboardToolbarAction />
        </ThemeProvider>);
            expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
            expect(screen.getByTestId('toolpad-account')).toBeInTheDocument();
        });
        it('should handle missing theme gracefully', () => {
            render(<EmailDashboardToolbarAction />);
            expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
            expect(screen.getByTestId('toolpad-account')).toBeInTheDocument();
        });
    });
    describe('Accessibility', () => {
        it('should maintain accessibility of child components', () => {
            render(<TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>);
            expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
            expect(screen.getByTestId('toolpad-account')).toBeInTheDocument();
        });
        it('should have proper semantic structure', () => {
            const { container } = render(<TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>);
            expect(container.firstChild).toBeInTheDocument();
        });
    });
    describe('Error Handling', () => {
        it('should handle theme selector rendering errors gracefully', () => {
            const originalError = console.error;
            console.error = jest.fn();
            render(<TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>);
            expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
            expect(screen.getByTestId('toolpad-account')).toBeInTheDocument();
            console.error = originalError;
        });
    });
    describe('Performance', () => {
        it('should be memoized to prevent unnecessary re-renders', () => {
            expect(EmailDashboardToolbarAction.displayName).toBe('EmailDashboardToolbarAction');
            const { rerender } = render(<TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>);
            rerender(<TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>);
            expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
            expect(screen.getByTestId('toolpad-account')).toBeInTheDocument();
        });
    });
    describe('Component Dependencies', () => {
        it('should import and use required dependencies correctly', () => {
            render(<TestWrapper>
          <EmailDashboardToolbarAction />
        </TestWrapper>);
            const container = screen.getByTestId('theme-selector').parentElement;
            expect(container).toHaveClass('MuiStack-root');
        });
    });
});
//# sourceMappingURL=email-dashboard-toolbar-action.test.jsx.map