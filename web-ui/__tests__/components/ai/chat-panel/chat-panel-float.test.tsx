/**
 * @fileoverview Tests for the chat panel floating functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/test-utils';
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

jest.mock('@/lib/logger', () => ({
  log: () => {},
}));

jest.mock('@/lib/components/ai/chat-fetch-wrapper', () => ({
  enhancedChatFetch: jest.fn(),
}));

jest.mock('@/instrument/browser', () => ({
  getReactPlugin: () => ({}),
}));

jest.mock('@microsoft/applicationinsights-react-js', () => ({
  withAITracking: (plugin: any, Component: any) => Component,
}));

describe('ChatPanel Float Functionality', () => {
  it('renders chat panel inline by default', () => {
    render(<ChatPanel page="test" />);
    
    expect(screen.getByPlaceholderText(/Type your message here/)).toBeInTheDocument();
    expect(screen.queryByText(/Chat panel is floating/)).not.toBeInTheDocument();
  });

  it('shows float option in menu', async () => {
    render(<ChatPanel page="test" />);
    
    // Find and click the menu button (MoreVert icon button)
    const menuButton = screen.getByTestId('MoreVertIcon').closest('button');
    fireEvent.click(menuButton!);
    
    // Check if Float option is available
    expect(screen.getByText('Float')).toBeInTheDocument();
  });

  it('switches to floating mode when Float is clicked', async () => {
    render(<ChatPanel page="test" />);
    
    // Find and click the menu button
    const menuButton = screen.getByTestId('MoreVertIcon').closest('button');
    fireEvent.click(menuButton!);
    
    // Click Float option
    const floatOption = screen.getByText('Float');
    fireEvent.click(floatOption);
    
    // Check if it switched to floating mode
    expect(screen.getByText(/Chat panel is floating/)).toBeInTheDocument();
  });
});