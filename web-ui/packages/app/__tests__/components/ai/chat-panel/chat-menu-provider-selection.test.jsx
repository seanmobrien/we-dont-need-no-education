import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/test-utils';
import '@testing-library/jest-dom';
import { ChatMenu } from '@/components/ai/chat-panel/chat-menu';
describe('ChatMenu Provider Selection', () => {
    const mockSetActiveModelSelection = jest.fn();
    const defaultModelSelection = {
        provider: 'azure',
        model: 'hifi',
    };
    beforeEach(() => {
    });
    it('displays current provider and model in the active model display', async () => {
        render(<ChatMenu activeModelSelection={defaultModelSelection} setActiveModelSelection={mockSetActiveModelSelection}/>, {
            chatPanel: true,
        });
        const menuButton = screen.getByTestId('button-chat-menu');
        fireEvent.click(menuButton);
        await waitFor(() => {
            expect(screen.getByText('Provider (Azure)')).toBeInTheDocument();
            expect(screen.getByText('Model (Attorney)')).toBeInTheDocument();
        }, { timeout: 5000 });
    }, 10000);
    it('shows all available providers', async () => {
        render(<ChatMenu activeModelSelection={defaultModelSelection} setActiveModelSelection={mockSetActiveModelSelection}/>, {
            chatPanel: true,
        });
        const menuButton = screen.getByTestId('button-chat-menu');
        fireEvent.click(menuButton);
        await waitFor(() => {
            const providerMenu = screen.getByTestId('menu-item-provider');
            fireEvent.mouseEnter(providerMenu);
        }, { timeout: 5000 });
        await waitFor(() => {
            expect(screen.getByTestId('menu-item-provider-azure')).toBeInTheDocument();
            expect(screen.getByTestId('menu-item-provider-google')).toBeInTheDocument();
            expect(screen.getByTestId('menu-item-provider-openai')).toBeInTheDocument();
        }, { timeout: 5000 });
    }, 10000);
    it('switches provider when provider is selected', async () => {
        render(<ChatMenu activeModelSelection={defaultModelSelection} setActiveModelSelection={mockSetActiveModelSelection}/>, {
            chatPanel: true,
        });
        const menuButton = screen.getByTestId('button-chat-menu');
        fireEvent.click(menuButton);
        await waitFor(() => {
            const providerMenu = screen.getByTestId('menu-item-provider');
            fireEvent.mouseEnter(providerMenu);
        }, { timeout: 5000 });
        await waitFor(() => {
            const googleOption = screen.getByTestId('menu-item-provider-google');
            fireEvent.click(googleOption);
        }, { timeout: 5000 });
        expect(mockSetActiveModelSelection).toHaveBeenCalledWith({
            provider: 'google',
            model: 'hifi',
        });
    }, 10000);
    it('falls back to lofi model when switching to provider without current model', async () => {
        const modelSelection = {
            provider: 'azure',
            model: 'reasoning-high',
        };
        render(<ChatMenu activeModelSelection={modelSelection} setActiveModelSelection={mockSetActiveModelSelection}/>, {
            chatPanel: true,
        });
        const menuButton = screen.getByTestId('button-chat-menu');
        fireEvent.click(menuButton);
        await waitFor(() => {
            const providerMenu = screen.getByTestId('menu-item-provider');
            fireEvent.mouseEnter(providerMenu);
        }, { timeout: 5000 });
        await waitFor(() => {
            const googleOption = screen.getByTestId('menu-item-provider-google');
            fireEvent.click(googleOption);
        }, { timeout: 5000 });
        expect(mockSetActiveModelSelection).toHaveBeenCalledWith({
            provider: 'google',
            model: 'lofi',
        });
    }, 10000);
    it('shows disabled models appropriately', async () => {
        const googleSelection = {
            provider: 'google',
            model: 'lofi',
        };
        render(<ChatMenu activeModelSelection={googleSelection} setActiveModelSelection={mockSetActiveModelSelection}/>, {
            chatPanel: true,
        });
        const menuButton = screen.getByTestId('button-chat-menu');
        fireEvent.click(menuButton);
        await waitFor(() => {
            const modelMenu = screen.getByTestId('menu-item-model');
            fireEvent.mouseEnter(modelMenu);
        }, { timeout: 5000 });
        await waitFor(() => {
            const partnerMediumOption = screen.getByTestId('menu-item-model-reasoning-medium');
            const partnerHighOption = screen.getByTestId('menu-item-model-reasoning-high');
            expect(partnerMediumOption).toHaveAttribute('aria-disabled', 'true');
            expect(partnerHighOption).toHaveAttribute('aria-disabled', 'true');
        }, { timeout: 5000 });
    }, 10000);
    it('updates model selection when model is changed', async () => {
        render(<ChatMenu activeModelSelection={defaultModelSelection} setActiveModelSelection={mockSetActiveModelSelection}/>, {
            chatPanel: true,
        });
        const menuButton = screen.getByTestId('button-chat-menu');
        fireEvent.click(menuButton);
        await waitFor(() => {
            const modelMenu = screen.getByTestId('menu-item-model');
            fireEvent.mouseEnter(modelMenu);
        }, { timeout: 5000 });
        await waitFor(() => {
            const lofiOption = screen.getByTestId('menu-item-model-lofi');
            fireEvent.click(lofiOption);
        }, { timeout: 5000 });
        expect(mockSetActiveModelSelection).toHaveBeenCalledWith({
            provider: 'azure',
            model: 'lofi',
        });
    }, 10000);
});
//# sourceMappingURL=chat-menu-provider-selection.test.jsx.map