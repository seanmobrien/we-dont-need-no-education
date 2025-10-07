/**
 * @file chat-status-indicator.test.tsx
 * @description Unit tests for the ChatStatusIndicator component
 */

import React from 'react';
import { render, screen } from '/__tests__/test-utils';
import { ChatStatusIndicator } from '/components/chat-status/chat-status-indicator';

// Mock the useChatHealth hook
jest.mock('/lib/hooks/use-chat-health', () => ({
  useChatHealth: jest.fn(),
}));

describe('ChatStatusIndicator', () => {
  const mockUseChatHealth = require('/lib/hooks/use-chat-health').useChatHealth;

  it('renders with default props when healthy', () => {
    mockUseChatHealth.mockReturnValue({
      healthStatus: 'ok',
      isLoading: false,
      isError: false,
      error: null,
      refreshInterval: 180000,
      subsystems: {
        cache: 'ok',
        queue: 'ok',
      },
    });

    render(<ChatStatusIndicator />);

    // Should render the icon (CheckCircle icon for ok status)
    expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument();
  });

  it('renders with label when showLabel is true', () => {
    mockUseChatHealth.mockReturnValue({
      healthStatus: 'ok',
      isLoading: false,
      isError: false,
      error: null,
      refreshInterval: 180000,
      subsystems: {
        cache: 'ok',
        queue: 'ok',
      },
    });

    render(<ChatStatusIndicator showLabel />);

    // Should render chip with label
    expect(screen.getByText('Chat: Healthy')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseChatHealth.mockReturnValue({
      healthStatus: 'warning',
      isLoading: true,
      isError: false,
      error: null,
      refreshInterval: 30000,
      subsystems: {
        cache: 'ok',
        queue: 'warning',
      },
    });

    render(<ChatStatusIndicator />);

    // Should show loading spinner
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows warning status correctly', () => {
    mockUseChatHealth.mockReturnValue({
      healthStatus: 'warning',
      isLoading: false,
      isError: false,
      error: null,
      refreshInterval: 30000,
      subsystems: {
        cache: 'ok',
        queue: 'warning',
      },
    });

    render(<ChatStatusIndicator showLabel />);

    expect(screen.getByText('Chat: Warning')).toBeInTheDocument();
  });

  it('shows error status correctly', () => {
    mockUseChatHealth.mockReturnValue({
      healthStatus: 'error',
      isLoading: false,
      isError: false,
      error: null,
      refreshInterval: 5000,
      subsystems: {
        cache: 'error',
        queue: 'error',
      },
    });

    render(<ChatStatusIndicator showLabel />);

    expect(screen.getByText('Chat: Error')).toBeInTheDocument();
  });

  it('handles error state appropriately', () => {
    const mockError = new Error('Connection failed');
    mockUseChatHealth.mockReturnValue({
      healthStatus: 'error',
      isLoading: false,
      isError: true,
      error: mockError,
      refreshInterval: 5000,
      subsystems: {
        cache: 'error',
        queue: 'error',
      },
    });

    render(<ChatStatusIndicator />);

    // Component should still render with error icon
    expect(screen.getByTestId('ErrorIcon')).toBeInTheDocument();
  });

  it('applies small size variant correctly', () => {
    mockUseChatHealth.mockReturnValue({
      healthStatus: 'ok',
      isLoading: false,
      isError: false,
      error: null,
      refreshInterval: 180000,
      subsystems: {
        cache: 'ok',
        queue: 'ok',
      },
    });

    render(<ChatStatusIndicator size="small" showLabel />);

    // Should render with small size
    expect(screen.getByText('Chat: Healthy')).toBeInTheDocument();
  });

  it('provides appropriate tooltip content', () => {
    mockUseChatHealth.mockReturnValue({
      healthStatus: 'ok',
      isLoading: false,
      isError: false,
      error: null,
      refreshInterval: 180000,
      subsystems: {
        cache: 'ok',
        queue: 'ok',
      },
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
    mockUseChatHealth.mockReturnValue({
      healthStatus: 'warning',
      isLoading: false,
      isError: false,
      error: null,
      refreshInterval: 30000,
      subsystems: {
        cache: 'ok',
        queue: 'warning',
      },
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
