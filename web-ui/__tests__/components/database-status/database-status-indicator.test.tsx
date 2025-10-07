/**
 * @file database-status-indicator.test.tsx
 * @description Unit tests for the DatabaseStatusIndicator component
 */

import React from 'react';
import { render, screen } from '/__tests__/test-utils';
import { DatabaseStatusIndicator } from '/components/database-status/database-status-indicator';

// Mock the useDatabaseHealth hook
jest.mock('/lib/hooks/use-database-health', () => ({
  useDatabaseHealth: jest.fn(),
}));

describe('DatabaseStatusIndicator', () => {
  const mockUseDatabaseHealth =
    require('/lib/hooks/use-database-health').useDatabaseHealth;

  it('renders with default props when healthy', () => {
    mockUseDatabaseHealth.mockReturnValue({
      healthStatus: 'ok',
      isLoading: false,
      isError: false,
      error: null,
      refreshInterval: 180000,
    });

    render(<DatabaseStatusIndicator />);

    // Should render the icon (CheckCircle icon for ok status)
    expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument();
  });

  it('renders with label when showLabel is true', () => {
    mockUseDatabaseHealth.mockReturnValue({
      healthStatus: 'ok',
      isLoading: false,
      isError: false,
      error: null,
      refreshInterval: 180000,
    });

    render(<DatabaseStatusIndicator showLabel />);

    // Should render chip with label
    expect(screen.getByText('Database: Healthy')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseDatabaseHealth.mockReturnValue({
      healthStatus: 'warning',
      isLoading: true,
      isError: false,
      error: null,
      refreshInterval: 30000,
    });

    render(<DatabaseStatusIndicator />);

    // Should show loading spinner
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows warning status correctly', () => {
    mockUseDatabaseHealth.mockReturnValue({
      healthStatus: 'warning',
      isLoading: false,
      isError: false,
      error: null,
      refreshInterval: 30000,
    });

    render(<DatabaseStatusIndicator showLabel />);

    expect(screen.getByText('Database: Warning')).toBeInTheDocument();
  });

  it('shows error status correctly', () => {
    mockUseDatabaseHealth.mockReturnValue({
      healthStatus: 'error',
      isLoading: false,
      isError: false,
      error: null,
      refreshInterval: 5000,
    });

    render(<DatabaseStatusIndicator showLabel />);

    expect(screen.getByText('Database: Error')).toBeInTheDocument();
  });

  it('handles error state appropriately', () => {
    const mockError = new Error('Connection failed');
    mockUseDatabaseHealth.mockReturnValue({
      healthStatus: 'error',
      isLoading: false,
      isError: true,
      error: mockError,
      refreshInterval: 5000,
    });

    render(<DatabaseStatusIndicator />);

    // Component should still render with error icon
    expect(screen.getByTestId('ErrorIcon')).toBeInTheDocument();
  });

  it('applies small size variant correctly', () => {
    mockUseDatabaseHealth.mockReturnValue({
      healthStatus: 'ok',
      isLoading: false,
      isError: false,
      error: null,
      refreshInterval: 180000,
    });

    render(<DatabaseStatusIndicator size="small" showLabel />);

    // Should render with small size
    expect(screen.getByText('Database: Healthy')).toBeInTheDocument();
  });

  it('provides appropriate tooltip content', () => {
    mockUseDatabaseHealth.mockReturnValue({
      healthStatus: 'ok',
      isLoading: false,
      isError: false,
      error: null,
      refreshInterval: 180000,
    });

    const { container } = render(<DatabaseStatusIndicator />);

    // Tooltip should be present via aria-describedby or similar
    const tooltipElement = container.querySelector('[aria-label]');
    expect(tooltipElement).toBeInTheDocument();
    expect(tooltipElement).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Database service is healthy'),
    );
  });
});
