import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/test-utils';
import '@testing-library/jest-dom';
import ChatPanel from '@/components/ai/chat-panel/chat-panel';
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
jest.mock('@compliance-theater/logger', () => ({
    log: () => () => { },
}));
jest.mock('@/lib/components/ai/chat-fetch-wrapper', () => ({
    useChatFetchWrapper: () => ({
        chatFetch: fetch,
    }),
}));
jest.mock('@/lib/ai/core/chat-ids', () => ({
    splitIds: (id) => [id.split(':')[0], id.split(':')[1]],
    generateChatId: () => ({ id: 'mock-id' }),
}));
const mockSessionStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
    value: mockSessionStorage,
});
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
        mockSessionStorage.getItem.mockReturnValue('test-thread-id');
        mockLocalStorage.getItem.mockReturnValue(null);
    });
    const renderChatPanel = () => {
        return render(<ChatPanel page="test-page"/>, {
            chatPanel: true,
            withFlags: true,
        });
    };
    it('formats Azure model string correctly when sending message', async () => {
        renderChatPanel();
        const input = screen.getByPlaceholderText('Type your message here...');
        const sendButton = screen.getByTestId('ChatMessageSend');
        fireEvent.change(input, { target: { value: 'Test message' } });
        fireEvent.click(sendButton);
        await waitFor(() => {
            expect(mockSendMessage).toHaveBeenCalledWith({ text: 'Test message' }, expect.objectContaining({
                headers: expect.objectContaining({
                    'x-active-model': 'azure:lofi',
                }),
            }));
        });
    }, 10000);
    it('updates model string when provider is changed via menu', async () => {
        renderChatPanel();
        const menuButton = screen.getByTestId('button-chat-menu');
        fireEvent.click(menuButton);
        await waitFor(() => {
            const providerMenu = screen.getByTestId('menu-item-provider');
            fireEvent.mouseEnter(providerMenu);
        });
        await waitFor(() => {
            const googleOption = screen.getByTestId('menu-item-provider-google');
            fireEvent.click(googleOption);
        });
        const input = screen.getByPlaceholderText('Type your message here...');
        const sendButton = screen.getByTestId('ChatMessageSend');
        fireEvent.change(input, {
            target: { value: 'Test message with Google' },
        });
        fireEvent.click(sendButton);
        await waitFor(() => {
            expect(mockSendMessage).toHaveBeenCalledWith({ text: 'Test message with Google' }, expect.objectContaining({
                headers: expect.objectContaining({
                    'x-active-model': 'google:lofi',
                }),
            }));
        });
    }, 10000);
    it('updates model string when model type is changed via menu', async () => {
        renderChatPanel();
        const menuButton = screen.getByTestId('button-chat-menu');
        fireEvent.click(menuButton);
        await waitFor(() => {
            const modelMenu = screen.getByTestId('menu-item-model');
            fireEvent.mouseEnter(modelMenu);
        });
        await waitFor(() => {
            const lofiOption = screen.getByTestId('menu-item-model-lofi');
            fireEvent.click(lofiOption);
        });
        const input = screen.getByPlaceholderText('Type your message here...');
        const sendButton = screen.getByTestId('ChatMessageSend');
        fireEvent.change(input, { target: { value: 'Test message with lofi' } });
        fireEvent.click(sendButton);
        await waitFor(() => {
            expect(mockSendMessage).toHaveBeenCalledWith({ text: 'Test message with lofi' }, expect.objectContaining({
                headers: expect.objectContaining({
                    'x-active-model': 'azure:lofi',
                }),
            }));
        });
    }, 10000);
    it('handles OpenAI provider selection correctly', async () => {
        renderChatPanel();
        const menuButton = screen.getByTestId('button-chat-menu');
        fireEvent.click(menuButton);
        await waitFor(() => {
            const providerMenu = screen.getByTestId('menu-item-provider');
            fireEvent.mouseEnter(providerMenu);
        });
        await waitFor(() => {
            const openaiOption = screen.getByTestId('menu-item-provider-openai');
            fireEvent.click(openaiOption);
        });
        const input = screen.getByPlaceholderText('Type your message here...');
        const sendButton = screen.getByTestId('ChatMessageSend');
        fireEvent.change(input, { target: { value: 'Test message with OpenAI' } });
        fireEvent.click(sendButton);
        await waitFor(() => {
            expect(mockSendMessage).toHaveBeenCalledWith({ text: 'Test message with OpenAI' }, expect.objectContaining({
                headers: expect.objectContaining({
                    'x-active-model': 'openai:lofi',
                }),
            }));
        });
    }, 10000);
});
//# sourceMappingURL=chat-panel-model-formatting.test.jsx.map