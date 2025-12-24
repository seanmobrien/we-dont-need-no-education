/**
 * Tests for message filtering functionality in ChatHistory component
 */

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from '@/__tests__/test-utils';
import '@testing-library/jest-dom';
import { TestVirtualizedChat } from '@/components/ai/chat/test-virtualized-chat';

// Mock the virtualized display to avoid canvas issues in tests
jest.mock('@/components/ai/chat/virtualized-chat-display', () => ({
  VirtualizedChatDisplay: ({ turns }: { turns: any[] }) => (
    <div data-testid="virtualized-chat">
      {turns.map((turn, index) => (
        <div key={turn.turnId || index} data-testid={`turn-${turn.turnId}`}>
          Turn {turn.turnId}
          {turn.messages.map((msg: any, msgIndex: number) => (
            <div
              key={msg.messageId || msgIndex}
              data-testid={`message-${msg.role}`}
            >
              {msg.role}: {msg.content?.substring(0, 50)}...
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

describe('Message Filtering', () => {
  beforeEach(() => {
    // Mock window.ResizeObserver
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders filter controls and badges correctly', async () => {
    await act(async () => {
      render(<TestVirtualizedChat />);
    });

    await waitFor(() => {
      expect(screen.getByText('Message Filters')).toBeInTheDocument();
    });

    // Check that filter controls are present
    expect(screen.getByLabelText('Enable Filtering')).toBeInTheDocument();

    // Initially filters should be disabled
    expect(screen.getByLabelText('Enable Filtering')).not.toBeChecked();
  });

  it('shows filter options when filtering is enabled', async () => {
    await act(async () => {
      render(<TestVirtualizedChat />);
    });

    await waitFor(() => {
      expect(screen.getByText('Message Filters')).toBeInTheDocument();
    });

    const enableSwitch = screen.getByLabelText('Enable Filtering');

    await act(async () => {
      fireEvent.click(enableSwitch);
    });

    // Check that filter options appear
    await waitFor(() => {
      expect(screen.getByText('Filter Mode:')).toBeInTheDocument();
    });

    expect(screen.getByText('Single Turn')).toBeInTheDocument();
    expect(screen.getByText('Entire Chat')).toBeInTheDocument();
    expect(screen.getByText('Show messages of type:')).toBeInTheDocument();

    // Check that badges for different message types appear
    expect(screen.getByText('assistant')).toBeInTheDocument();
    expect(screen.getByText('system')).toBeInTheDocument();
    expect(screen.getByText('tool')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
  });

  it('displays correct message counts in badges', async () => {
    await act(async () => {
      render(<TestVirtualizedChat />);
    });

    await waitFor(() => {
      expect(screen.getByText('Message Filters')).toBeInTheDocument();
    });

    const enableSwitch = screen.getByLabelText('Enable Filtering');

    await act(async () => {
      fireEvent.click(enableSwitch);
    });

    // Wait for badges to appear
    await waitFor(() => {
      expect(screen.getByText('assistant')).toBeInTheDocument();
    });

    // Check badge counts (based on test data)
    expect(screen.getByText('2')).toBeInTheDocument(); // assistant messages
    expect(screen.getAllByText('1')).toHaveLength(2); // system and tool messages (both have 1)
    expect(screen.getByText('3')).toBeInTheDocument(); // user messages
  });

  it('filters messages when a badge is clicked', async () => {
    await act(async () => {
      render(<TestVirtualizedChat />);
    });

    await waitFor(() => {
      expect(screen.getByText('Message Filters')).toBeInTheDocument();
    });

    // Enable filtering
    const enableSwitch = screen.getByLabelText('Enable Filtering');

    await act(async () => {
      fireEvent.click(enableSwitch);
    });

    // Wait for user badge to appear
    await waitFor(() => {
      expect(screen.getByText('user')).toBeInTheDocument();
    });

    // Click on user badge to filter
    const userBadge = screen.getByText('user');

    await act(async () => {
      fireEvent.click(userBadge);
    });

    // Check that status message appears
    await waitFor(() => {
      expect(
        screen.getByText(/Showing 1 of 4 message types/),
      ).toBeInTheDocument();
    });

    // Check that Clear All button appears
    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  it('clears filters when Clear All is clicked', async () => {
    await act(async () => {
      render(<TestVirtualizedChat />);
    });

    await waitFor(() => {
      expect(screen.getByText('Message Filters')).toBeInTheDocument();
    });

    // Enable filtering and select a filter
    const enableSwitch = screen.getByLabelText('Enable Filtering');

    await act(async () => {
      fireEvent.click(enableSwitch);
    });

    // Wait for user badge to appear
    await waitFor(() => {
      expect(screen.getByText('user')).toBeInTheDocument();
    });

    const userBadge = screen.getByText('user');

    await act(async () => {
      fireEvent.click(userBadge);
    });

    // Verify filter is active
    await waitFor(() => {
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    // Clear all filters
    const clearButton = screen.getByText('Clear All');

    await act(async () => {
      fireEvent.click(clearButton);
    });

    // Clear All button should disappear
    await waitFor(() => {
      expect(screen.queryByText('Clear All')).not.toBeInTheDocument();
    });
  });

  it('switches between Single Turn and Entire Chat modes', async () => {
    await act(async () => {
      render(<TestVirtualizedChat />);
    });

    await waitFor(() => {
      expect(screen.getByText('Message Filters')).toBeInTheDocument();
    });

    const enableSwitch = screen.getByLabelText('Enable Filtering');

    await act(async () => {
      fireEvent.click(enableSwitch);
    });

    // Wait for mode buttons to appear
    await waitFor(() => {
      expect(screen.getByText('Single Turn')).toBeInTheDocument();
    });

    // Initially Single Turn should be selected
    expect(screen.getByText('Single Turn')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('Entire Chat')).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    // Click Entire Chat
    const entireChatButton = screen.getByText('Entire Chat');

    await act(async () => {
      fireEvent.click(entireChatButton);
    });

    // Verify the mode switched
    await waitFor(() => {
      expect(screen.getByText('Entire Chat')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });

    expect(screen.getByText('Single Turn')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('shows different status messages for different filter modes', async () => {
    await act(async () => {
      render(<TestVirtualizedChat />);
    });

    await waitFor(() => {
      expect(screen.getByText('Message Filters')).toBeInTheDocument();
    });

    const enableSwitch = screen.getByLabelText('Enable Filtering');

    await act(async () => {
      fireEvent.click(enableSwitch);
    });

    // Wait for user badge to appear
    await waitFor(() => {
      expect(screen.getByText('user')).toBeInTheDocument();
    });

    const userBadge = screen.getByText('user');

    await act(async () => {
      fireEvent.click(userBadge);
    });

    // Single Turn mode should show "hiding individual messages"
    await waitFor(() => {
      expect(
        screen.getByText(/hiding individual messages/),
      ).toBeInTheDocument();
    });

    // Switch to Entire Chat mode
    const entireChatButton = screen.getByText('Entire Chat');

    await act(async () => {
      fireEvent.click(entireChatButton);
    });

    // Should show "hiding entire turns"
    await waitFor(() => {
      expect(
        screen.getByText(/hiding entire turns without matching messages/),
      ).toBeInTheDocument();
    });
  });
});
