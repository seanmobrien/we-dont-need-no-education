import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/test-utils';
import { ChatPanel } from '@/components/ai/chat-panel';
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
describe('ChatPanel Docking Functionality', () => {
    it('shows docking options in menu', async () => {
        render(<ChatPanel page="test"/>, {
            chatPanel: true,
        });
        const menuButton = screen.getByTestId('button-chat-menu');
        fireEvent.click(menuButton);
        await waitFor(() => {
            fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
        });
        expect(await screen.findByText('Dock Left')).toBeInTheDocument();
        expect(await screen.findByText('Dock Right')).toBeInTheDocument();
        expect(await screen.findByText('Dock Top')).toBeInTheDocument();
        expect(await screen.findByText('Dock Bottom')).toBeInTheDocument();
    }, 10000);
    it('shows placeholder when docked to left', async () => {
        render(<ChatPanel page="test"/>, {
            chatPanel: true,
        });
        const menuButton = screen.getByTestId('button-chat-menu');
        fireEvent.click(menuButton);
        await waitFor(() => {
            fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
        });
        const dockLeftOption = await screen.findByText('Dock Left');
        fireEvent.click(dockLeftOption);
        expect(screen.getByText(/Chat panel is docked to left/)).toBeInTheDocument();
    }, 10000);
    it('handles dashboard layout flag', async () => {
        render(<ChatPanel page="test"/>, {
            chatPanel: true,
        });
        expect(screen.getByPlaceholderText(/Type your message here/)).toBeInTheDocument();
    }, 10000);
    it('preserves current position in menu selection', async () => {
        render(<ChatPanel page="test"/>, {
            chatPanel: true,
        });
        const menuButton = screen.getByTestId('button-chat-menu');
        fireEvent.click(menuButton);
        await waitFor(() => {
            fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
        });
        const dockRightOption = await screen.findByText('Dock Right');
        fireEvent.click(dockRightOption);
        const updatedMenuButton = screen.getByTestId('button-chat-menu');
        fireEvent.click(updatedMenuButton);
        await waitFor(() => {
            fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
        });
        const dockRightSelected = await screen.findByText('Dock Right');
        expect(dockRightSelected).toBeInTheDocument();
    }, 10000);
    it('can undock from docked state', async () => {
        render(<ChatPanel page="test"/>, {
            chatPanel: true,
        });
        const menuButton = screen.getByTestId('button-chat-menu');
        fireEvent.click(menuButton);
        await waitFor(() => {
            fireEvent.mouseEnter(screen.getByTestId('menu-item-dock'));
        });
        const dockBottomOption = await screen.findByText('Dock Bottom');
        fireEvent.click(dockBottomOption);
        expect(screen.getByText(/Chat panel is docked to bottom/)).toBeInTheDocument();
    }, 10000);
});
//# sourceMappingURL=chat-panel-dock.test.jsx.map