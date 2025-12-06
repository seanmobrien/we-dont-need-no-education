/**
 * @file memory-status-indicator.test.tsx
 * @description Unit tests for the MemoryStatusIndicator component
 */

import React from 'react';
import { render, screen } from '@/__tests__/test-utils';
import { MemoryStatusIndicator } from '@/components/health/memory-status/memory-status-indicator';
import { useHealth } from '@/components/health/health-provider/health-context';
import { HealthStatus } from '@/lib/hooks/types';

jest.mock('@/components/health/health-provider/health-context');
const mockUseHealth = useHealth as jest.Mock;
const mockMemorySubsystems = (status: HealthStatus) => ({
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

    // Should render the icon (CheckCircle icon for healthy status)
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

    render(<MemoryStatusIndicator showLabel />);

    // Should render chip with label
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

    // Should show loading spinner
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

    render(<MemoryStatusIndicator showLabel />);

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

    render(<MemoryStatusIndicator showLabel />);

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

    // Component should still render with error icon
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

    render(<MemoryStatusIndicator size="small" showLabel />);

    // Should render with small size
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

    // Tooltip should be present via aria-describedby or similar
    const tooltipElement = container.querySelector('[aria-label]');
    expect(tooltipElement).toBeInTheDocument();
    expect(tooltipElement).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Memory service is healthy'),
    );
  });
});
