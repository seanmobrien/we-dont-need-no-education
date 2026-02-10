/**
 * @file chat-status-indicator.test.tsx
 * @description Unit tests for the ChatStatusIndicator component
 */

import React from 'react';
import { render, screen } from '@/__tests__/test-utils';
import { ChatStatusIndicator } from '@/components/health/chat-status/chat-status-indicator';
import { useHealth } from '@/components/health/health-provider/health-context';

jest.mock('@/components/health/health-provider/health-context');
const mockUseHealth = useHealth as jest.Mock;

describe('ChatStatusIndicator', () => {
  it('renders with default props when healthy', () => {
    mockUseHealth.mockReturnValue({
      health: {
        chat: {
          status: 'healthy',
          subsystems: {
            cache: 'healthy',
            queue: 'healthy',
            tools: 'healthy',
          },
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refreshInterval: 180000,
    });

    render(<ChatStatusIndicator />);

    // Should render the icon (CheckCircle icon for ok status)
    expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument();
  });
  it('renders with label when showLabel is true', () => {
    mockUseHealth.mockReturnValue({
      health: {
        chat: {
          status: 'healthy',
          subsystems: {
            cache: 'healthy',
            queue: 'healthy',
            tools: 'healthy',
          },
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refreshInterval: 180000,
    });

    render(<ChatStatusIndicator showLabel />);

    // Should render chip with label
    expect(screen.getByText('Chat: Healthy')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseHealth.mockReturnValue({
      health: {
        chat: undefined,
      },
      isLoading: true,
      isError: false,
      error: null,
      refreshInterval: 30000,
    });

    render(<ChatStatusIndicator />);

    // Should show loading spinner
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows warning status correctly', () => {
    mockUseHealth.mockReturnValue({
      health: {
        chat: {
          status: 'warning',
          subsystems: {
            cache: 'healthy',
            queue: 'warning',
            tools: 'healthy',
          },
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refreshInterval: 30000,
    });

    render(<ChatStatusIndicator showLabel />);

    expect(screen.getByText('Chat: Warning')).toBeInTheDocument();
  });

  it('shows error status correctly', () => {
    mockUseHealth.mockReturnValue({
      health: {
        chat: {
          status: 'error',
          subsystems: {
            cache: 'error',
            queue: 'error',
            tools: 'healthy',
          },
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refreshInterval: 5000,
    });

    render(<ChatStatusIndicator showLabel />);

    expect(screen.getByText('Chat: Error')).toBeInTheDocument();
  });

  it('handles error state appropriately', () => {
    const mockError = new Error('Connection failed');
    mockUseHealth.mockReturnValue({
      health: {
        chat: {
          status: 'error',
          subsystems: {
            cache: 'error',
            queue: 'error',
            tools: 'healthy',
          },
        },
      },
      isLoading: false,
      isError: true,
      error: mockError,
      refreshInterval: 5000,
    });

    render(<ChatStatusIndicator />);

    // Component should still render with error icon
    expect(screen.getByTestId('ErrorIcon')).toBeInTheDocument();
  });

  it('applies small size variant correctly', () => {
    mockUseHealth.mockReturnValue({
      health: {
        chat: {
          status: 'healthy',
          subsystems: {
            cache: 'healthy',
            tools: 'healthy',
            queue: 'healthy',
          },
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refreshInterval: 180000,
    });

    render(<ChatStatusIndicator size="small" showLabel />);

    // Should render with small size
    expect(screen.getByText('Chat: Healthy')).toBeInTheDocument();
  });

  it('provides appropriate tooltip content', () => {
    mockUseHealth.mockReturnValue({
      health: {
        chat: {
          status: 'healthy',
          subsystems: {
            cache: 'healthy',
            queue: 'healthy',
            tools: 'healthy',
          },
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refreshInterval: 180000,
    });

    const { container } = render(<ChatStatusIndicator />);

    // Tooltip should be present via aria-describedby or similar
    const tooltipElement = container.querySelector('[aria-label]');
    expect(tooltipElement).toBeInTheDocument();
    expect(tooltipElement).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Chat service is healthy'),
    );
  });

  it('shows subsystem details in tooltip when services are degraded', () => {
    mockUseHealth.mockReturnValue({
      health: {
        chat: {
          status: 'warning',
          subsystems: {
            cache: 'healthy',
            queue: 'warning',
            tools: 'healthy',
          },
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refreshInterval: 30000,
    });

    const { container } = render(<ChatStatusIndicator />);

    const tooltipElement = container.querySelector('[aria-label]');
    expect(tooltipElement).toBeInTheDocument();
    expect(tooltipElement).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Queue'),
    );
  });
});
