/**
 * @fileoverview Tests for the chat panel floating functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/test-utils';
import { ChatPanel } from '@/components/ai/chat-panel';

// Mock the dependencies
jest.mock('@ai-sdk/react', () => ({
  useChat: () => ({
    messages: [],
    input: '',
    handleInputChange: jest.fn(),
    handleSubmit: jest.fn(),
    status: 'idle',
    data: undefined,
    setData: jest.fn(),
    reload: jest.fn(),
  }),
}));

jest.mock('@/lib/ai/core', () => ({
  generateChatId: () => ({ id: 'test-id' }),
  isAnnotatedRetryMessage: () => false,
}));

jest.mock('@/lib/components/ai/chat-fetch-wrapper', () => ({
  useChatFetchWrapper: jest.fn(() => ({ chatFetch: jest.fn() })),
}));

describe('ChatPanel Float Functionality', () => {
  it('renders chat panel inline by default', () => {
    render(<ChatPanel page="test" />, {
      chatPanel: true,
    });

    expect(
      screen.getByPlaceholderText(/Type your message here/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Chat panel is floating/),
    ).not.toBeInTheDocument();
  }, 10000);

  it('shows float option in menu', async () => {
    render(<ChatPanel page="test" />, {
      chatPanel: true,
    });

    // Find and click the menu button (MoreVert icon button)
    const menuButton = screen.getByTestId('MoreVertIcon').closest('button');
    fireEvent.click(menuButton!);

    // Check if Float option is available
    await waitFor(() => {
      fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
    });
    expect(await screen.findByText('Float')).toBeInTheDocument();
  }, 10000);

  it('switches to floating mode when Float is clicked', async () => {
    render(<ChatPanel page="test" />, {
      chatPanel: true,
    });

    // Find and click the menu button
    const menuButton = screen.getByTestId('button-chat-menu');
    fireEvent.click(menuButton);

    await waitFor(() => {
      fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
    });

    // Click Float option
    // Click Float option
    const floatOption = await screen.findByText('Float');
    fireEvent.click(floatOption);

    // Check if it switched to floating mode
    expect(screen.getByText(/Chat panel is floating/)).toBeInTheDocument();
  }, 10000);
});
