/**
 * Tests for message filtering functionality in ChatHistory component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TestVirtualizedChat } from '/components/chat/test-virtualized-chat';

// Mock the virtualized display to avoid canvas issues in tests
jest.mock('/components/chat/virtualized-chat-display', () => ({
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

  it('renders filter controls and badges correctly', () => {
    render(<TestVirtualizedChat />);

    // Check that filter controls are present
    expect(screen.getByText('Message Filters')).toBeInTheDocument();
    expect(screen.getByLabelText('Enable Filtering')).toBeInTheDocument();

    // Initially filters should be disabled
    expect(screen.getByLabelText('Enable Filtering')).not.toBeChecked();
  });

  it('shows filter options when filtering is enabled', () => {
    render(<TestVirtualizedChat />);

    const enableSwitch = screen.getByLabelText('Enable Filtering');
    fireEvent.click(enableSwitch);

    // Check that filter options appear
    expect(screen.getByText('Filter Mode:')).toBeInTheDocument();
    expect(screen.getByText('Single Turn')).toBeInTheDocument();
    expect(screen.getByText('Entire Chat')).toBeInTheDocument();
    expect(screen.getByText('Show messages of type:')).toBeInTheDocument();

    // Check that badges for different message types appear
    expect(screen.getByText('assistant')).toBeInTheDocument();
    expect(screen.getByText('system')).toBeInTheDocument();
    expect(screen.getByText('tool')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
  });

  it('displays correct message counts in badges', () => {
    render(<TestVirtualizedChat />);

    const enableSwitch = screen.getByLabelText('Enable Filtering');
    fireEvent.click(enableSwitch);

    // Check badge counts (based on test data)
    expect(screen.getByText('2')).toBeInTheDocument(); // assistant messages
    expect(screen.getAllByText('1')).toHaveLength(2); // system and tool messages (both have 1)
    expect(screen.getByText('3')).toBeInTheDocument(); // user messages
  });

  it('filters messages when a badge is clicked', () => {
    render(<TestVirtualizedChat />);

    // Enable filtering
    const enableSwitch = screen.getByLabelText('Enable Filtering');
    fireEvent.click(enableSwitch);

    // Click on user badge to filter
    const userBadge = screen.getByText('user');
    fireEvent.click(userBadge);

    // Check that status message appears
    expect(
      screen.getByText(/Showing 1 of 4 message types/),
    ).toBeInTheDocument();

    // Check that Clear All button appears
    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  it('clears filters when Clear All is clicked', () => {
    render(<TestVirtualizedChat />);

    // Enable filtering and select a filter
    const enableSwitch = screen.getByLabelText('Enable Filtering');
    fireEvent.click(enableSwitch);

    const userBadge = screen.getByText('user');
    fireEvent.click(userBadge);

    // Verify filter is active
    expect(screen.getByText('Clear All')).toBeInTheDocument();

    // Clear all filters
    const clearButton = screen.getByText('Clear All');
    fireEvent.click(clearButton);

    // Clear All button should disappear
    expect(screen.queryByText('Clear All')).not.toBeInTheDocument();
  });

  it('switches between Single Turn and Entire Chat modes', () => {
    render(<TestVirtualizedChat />);

    const enableSwitch = screen.getByLabelText('Enable Filtering');
    fireEvent.click(enableSwitch);

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
    fireEvent.click(entireChatButton);

    expect(screen.getByText('Entire Chat')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('Single Turn')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('shows different status messages for different filter modes', () => {
    render(<TestVirtualizedChat />);

    const enableSwitch = screen.getByLabelText('Enable Filtering');
    fireEvent.click(enableSwitch);

    const userBadge = screen.getByText('user');
    fireEvent.click(userBadge);

    // Single Turn mode should show "hiding individual messages"
    expect(screen.getByText(/hiding individual messages/)).toBeInTheDocument();

    // Switch to Entire Chat mode
    const entireChatButton = screen.getByText('Entire Chat');
    fireEvent.click(entireChatButton);

    // Should show "hiding entire turns"
    expect(
      screen.getByText(/hiding entire turns without matching messages/),
    ).toBeInTheDocument();
  });
});
