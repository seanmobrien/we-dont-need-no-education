import React from 'react';
import { render, screen } from '@/__tests__/test-utils';
import { DatabaseStatusIndicator } from '@/components/health/database-status/database-status-indicator';
import { useHealth } from '@/components/health/health-provider/health-context';
jest.mock('@/components/health/health-provider/health-context');
const mockUseHealth = useHealth;
describe('DatabaseStatusIndicator', () => {
    it('renders with default props when healthy', () => {
        mockUseHealth.mockReturnValue({
            health: { database: 'healthy' },
            isLoading: false,
            isError: false,
            error: null,
            refreshInterval: 180000,
        });
        render(<DatabaseStatusIndicator />);
        expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument();
    });
    it('renders with label when showLabel is true', () => {
        mockUseHealth.mockReturnValue({
            health: { database: 'healthy' },
            isLoading: false,
            isError: false,
            error: null,
            refreshInterval: 180000,
        });
        render(<DatabaseStatusIndicator showLabel/>);
        expect(screen.getByText('Database: Healthy')).toBeInTheDocument();
    });
    it('shows loading state', () => {
        mockUseHealth.mockReturnValue({
            health: { database: undefined },
            isLoading: true,
            isError: false,
            error: null,
            refreshInterval: 30000,
        });
        render(<DatabaseStatusIndicator />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
    it('shows warning status correctly', () => {
        mockUseHealth.mockReturnValue({
            health: { database: 'warning' },
            isLoading: false,
            isError: false,
            error: null,
            refreshInterval: 30000,
        });
        render(<DatabaseStatusIndicator showLabel/>);
        expect(screen.getByText('Database: Warning')).toBeInTheDocument();
    });
    it('shows error status correctly', () => {
        mockUseHealth.mockReturnValue({
            health: { database: 'error' },
            isLoading: false,
            isError: false,
            error: null,
            refreshInterval: 5000,
        });
        render(<DatabaseStatusIndicator showLabel/>);
        expect(screen.getByText('Database: Error')).toBeInTheDocument();
    });
    it('handles error state appropriately', () => {
        const mockError = new Error('Connection failed');
        mockUseHealth.mockReturnValue({
            health: { database: 'error' },
            isLoading: false,
            isError: true,
            error: mockError,
            refreshInterval: 5000,
        });
        render(<DatabaseStatusIndicator />);
        expect(screen.getByTestId('ErrorIcon')).toBeInTheDocument();
    });
    it('applies small size variant correctly', () => {
        mockUseHealth.mockReturnValue({
            health: { database: 'healthy' },
            isLoading: false,
            isError: false,
            error: null,
            refreshInterval: 180000,
        });
        render(<DatabaseStatusIndicator size="small" showLabel/>);
        expect(screen.getByText('Database: Healthy')).toBeInTheDocument();
    });
    it('provides appropriate tooltip content', () => {
        mockUseHealth.mockReturnValue({
            health: { database: 'healthy' },
            isLoading: false,
            isError: false,
            error: null,
            refreshInterval: 180000,
        });
        const { container } = render(<DatabaseStatusIndicator />);
        const tooltipElement = container.querySelector('[aria-label]');
        expect(tooltipElement).toBeInTheDocument();
        expect(tooltipElement).toHaveAttribute('aria-label', expect.stringContaining('Database service is healthy'));
    });
});
//# sourceMappingURL=database-status-indicator.test.jsx.map