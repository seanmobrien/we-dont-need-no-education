/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/test-utils';
import '@testing-library/jest-dom';
import ChatPanel from '@/components/ai/chat-panel/chat-panel';

// Mock the useChat hook from @ai-sdk/react
const mockSendMessage = jest.fn();
const mockSetMessages = jest.fn();
const mockAddToolResult = jest.fn();

jest.mock('@ai-sdk/react', () => ({
  useChat: () => ({
    id: 'test-id',
    messages: [],
    status: 'idle',
    sendMessage: mockSendMessage,
    setMessages: mockSetMessages,
    addToolResult: mockAddToolResult,
  }),
}));

// Mock other dependencies
jest.mock('@/lib/logger', () => ({
  log: () => () => {},
}));

jest.mock('@/lib/components/ai/chat-fetch-wrapper', () => ({
  useChatFetchWrapper: () => ({
    chatFetch: fetch,
  }),
}));

jest.mock('@/lib/ai/core/chat-ids', () => ({
  splitIds: (id: string) => [id.split(':')[0], id.split(':')[1]],
  generateChatId: () => ({ id: 'mock-id' }),
}));

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('ChatPanel Model String Formatting', () => {
  beforeEach(() => {
    // jest.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue('test-thread-id');
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  const renderChatPanel = () => {
    return render(<ChatPanel page="test-page" />);
  };

  it('formats Azure model string correctly when sending message', async () => {
    renderChatPanel();

    // Find the input field and send button
    const input = screen.getByPlaceholderText('Type your message here...');
    const sendButton = screen.getByTestId('ChatMessageSend');

    // Type a message and send it
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        { text: 'Test message' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-active-model': 'azure:lofi', // Default should be azure:lofi
          }),
        }),
      );
    });
  }, 10000);

  it('updates model string when provider is changed via menu', async () => {
    renderChatPanel();

    // Open the chat menu
    const menuButton = screen.getByTestId('button-chat-menu');
    fireEvent.click(menuButton);

    // Select Google provider
    await waitFor(() => {
      const googleOption = screen.getByTestId('menu-item-provider-google');
      fireEvent.click(googleOption);
    });

    // Type a message and send it
    const input = screen.getByPlaceholderText('Type your message here...');
    const sendButton = screen.getByTestId('ChatMessageSend');

    fireEvent.change(input, {
      target: { value: 'Test message with Google' },
    });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        { text: 'Test message with Google' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-active-model': 'google:lofi', // Should be google:lofi
          }),
        }),
      );
    });
  }, 10000);

  it('updates model string when model type is changed via menu', async () => {
    renderChatPanel();

    // Open the chat menu
    const menuButton = screen.getByTestId('button-chat-menu');
    fireEvent.click(menuButton);

    // Select lofi model
    await waitFor(() => {
      const lofiOption = screen.getByTestId('menu-item-model-lofi');
      fireEvent.click(lofiOption);
    });

    // Type a message and send it
    const input = screen.getByPlaceholderText('Type your message here...');
    const sendButton = screen.getByTestId('ChatMessageSend');

    fireEvent.change(input, { target: { value: 'Test message with lofi' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        { text: 'Test message with lofi' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-active-model': 'azure:lofi', // Should now be azure:lofi
          }),
        }),
      );
    });
  }, 10000);

  it('handles OpenAI provider selection correctly', async () => {
    renderChatPanel();

    // Open the chat menu
    const menuButton = screen.getByTestId('button-chat-menu');
    fireEvent.click(menuButton);

    // Select OpenAI provider
    await waitFor(() => {
      const openaiOption = screen.getByTestId('menu-item-provider-openai');
      fireEvent.click(openaiOption);
    });

    // Type a message and send it
    const input = screen.getByPlaceholderText('Type your message here...');
    const sendButton = screen.getByTestId('ChatMessageSend');

    fireEvent.change(input, { target: { value: 'Test message with OpenAI' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        { text: 'Test message with OpenAI' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-active-model': 'openai:lofi', // Should now be openai:lofi
          }),
        }),
      );
    });
  }, 10000);
});
