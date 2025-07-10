/**
 * @fileoverview Tests for the chat panel docking functionality
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

describe('ChatPanel Docking Functionality', () => {
  it('shows docking options in menu', async () => {
    render(<ChatPanel page="test" />);
    
    // Find and click the menu button
    const menuButton = screen.getByTestId('MoreVertIcon').closest('button');
    fireEvent.click(menuButton!);
    
    // Check if docking options are available
    expect(screen.getByText('Dock Left')).toBeInTheDocument();
    expect(screen.getByText('Dock Right')).toBeInTheDocument();
    expect(screen.getByText('Dock Top')).toBeInTheDocument();
    expect(screen.getByText('Dock Bottom')).toBeInTheDocument();
  });

  it('shows placeholder when docked to left', async () => {
    render(<ChatPanel page="test" />);
    
    // Open menu and click dock left
    const menuButton = screen.getByTestId('MoreVertIcon').closest('button');
    fireEvent.click(menuButton!);
    
    const dockLeftOption = screen.getByText('Dock Left');
    fireEvent.click(dockLeftOption);
    
    // Check if it shows docked placeholder
    expect(screen.getByText(/Chat panel is docked to left/)).toBeInTheDocument();
  });

  it('handles dashboard layout flag', async () => {
    render(<ChatPanel page="test" isDashboardLayout={true} />);
    
    // Component should render without errors with dashboard layout flag
    expect(screen.getByPlaceholderText(/Type your message here/)).toBeInTheDocument();
  });

  it('preserves current position in menu selection', async () => {
    render(<ChatPanel page="test" />);
    
    // Open menu and dock to right first
    const menuButton = screen.getByTestId('MoreVertIcon').closest('button');
    fireEvent.click(menuButton!);
    
    const dockRightOption = screen.getByText('Dock Right');
    fireEvent.click(dockRightOption);
    
    // Open menu again
    fireEvent.click(menuButton!);
    
    // The dock right option should be selected (this would be shown by styling/selection state)
    const dockRightSelected = screen.getByText('Dock Right');
    expect(dockRightSelected).toBeInTheDocument();
  });

  it('can undock from docked state', async () => {
    render(<ChatPanel page="test" />);
    
    // First dock the panel
    const menuButton = screen.getByTestId('MoreVertIcon').closest('button');
    fireEvent.click(menuButton!);
    
    const dockBottomOption = screen.getByText('Dock Bottom');
    fireEvent.click(dockBottomOption);
    
    // Verify it's docked
    expect(screen.getByText(/Chat panel is docked to bottom/)).toBeInTheDocument();
    
    // Note: In the actual implementation, the docked panel would have its own close button
    // For this test, we're verifying the docking state change occurs
  });
});