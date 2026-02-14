import React from 'react';
import { render, screen } from '@/__tests__/test-utils';
import { MemoryStatusIndicator } from '@/components/health/memory-status/memory-status-indicator';
import { useHealth } from '@/components/health/health-provider/health-context';
jest.mock('@/components/health/health-provider/health-context');
const mockUseHealth = useHealth;
const mockMemorySubsystems = (status) => ({
    db: status,
    vectorStore: status,
    graphStore: status,
    historyStore: status,
    authService: status,
});
describe('MemoryStatusIndicator', () => {
    it('renders with default props when healthy', () => {
        mockUseHealth.mockReturnValue({
            health: {
                memory: {
                    status: 'healthy',
                    subsystems: mockMemorySubsystems('healthy'),
                },
            },
            isLoading: false,
            isError: false,
            error: null,
            refreshInterval: 180000,
        });
        render(<MemoryStatusIndicator />);
        expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument();
    });
    it('renders with label when showLabel is true', () => {
        mockUseHealth.mockReturnValue({
            health: {
                memory: {
                    status: 'healthy',
                    subsystems: mockMemorySubsystems('healthy'),
                },
            },
            isLoading: false,
            isError: false,
            error: null,
            refreshInterval: 180000,
        });
        render(<MemoryStatusIndicator showLabel/>);
        expect(screen.getByText('Memory: Healthy')).toBeInTheDocument();
    });
    it('shows loading state', () => {
        mockUseHealth.mockReturnValue({
            health: {
                memory: {
                    status: 'warning',
                    subsystems: mockMemorySubsystems('healthy'),
                },
            },
            isLoading: true,
            isError: false,
            error: null,
            refreshInterval: 30000,
        });
        render(<MemoryStatusIndicator />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
    it('shows warning status correctly', () => {
        mockUseHealth.mockReturnValue({
            health: {
                memory: {
                    status: 'warning',
                    subsystems: mockMemorySubsystems('healthy'),
                },
            },
            isLoading: false,
            isError: false,
            error: null,
            refreshInterval: 30000,
        });
        render(<MemoryStatusIndicator showLabel/>);
        expect(screen.getByText('Memory: Warning')).toBeInTheDocument();
    });
    it('shows error status correctly', () => {
        mockUseHealth.mockReturnValue({
            health: {
                memory: {
                    status: 'error',
                    subsystems: mockMemorySubsystems('healthy'),
                },
            },
            isLoading: false,
            isError: false,
            error: null,
            refreshInterval: 5000,
        });
        render(<MemoryStatusIndicator showLabel/>);
        expect(screen.getByText('Memory: Error')).toBeInTheDocument();
    });
    it('handles error state appropriately', () => {
        const mockError = new Error('Connection failed');
        mockUseHealth.mockReturnValue({
            health: {
                memory: {
                    status: 'error',
                    subsystems: mockMemorySubsystems('healthy'),
                },
            },
            isLoading: false,
            isError: true,
            error: mockError,
            refreshInterval: 5000,
        });
        render(<MemoryStatusIndicator />);
        expect(screen.getByTestId('ErrorIcon')).toBeInTheDocument();
    });
    it('applies small size variant correctly', () => {
        mockUseHealth.mockReturnValue({
            health: {
                memory: {
                    status: 'healthy',
                    subsystems: mockMemorySubsystems('healthy'),
                },
            },
            isLoading: false,
            isError: false,
            error: null,
            refreshInterval: 180000,
        });
        render(<MemoryStatusIndicator size="small" showLabel/>);
        expect(screen.getByText('Memory: Healthy')).toBeInTheDocument();
    });
    it('provides appropriate tooltip content', () => {
        mockUseHealth.mockReturnValue({
            health: {
                memory: {
                    status: 'healthy',
                    subsystems: mockMemorySubsystems('healthy'),
                },
            },
            isLoading: false,
            isError: false,
            error: null,
            refreshInterval: 180000,
        });
        const { container } = render(<MemoryStatusIndicator />);
        const tooltipElement = container.querySelector('[aria-label]');
        expect(tooltipElement).toBeInTheDocument();
        expect(tooltipElement).toHaveAttribute('aria-label', expect.stringContaining('Memory service is healthy'));
    });
});
//# sourceMappingURL=memory-status-indicator.test.jsx.map