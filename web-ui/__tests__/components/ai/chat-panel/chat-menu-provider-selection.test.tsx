/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChatMenu } from '@/components/ai/chat-panel/chat-menu';
import { ModelSelection } from '@/components/ai/chat-panel/types';

// Mock the Material-UI theme
jest.mock('@mui/material/styles', () => ({
  useTheme: () => ({
    palette: {
      mode: 'light',
    },
  }),
}));

describe('ChatMenu Provider Selection', () => {
  const mockSetActiveModelSelection = jest.fn();
  const defaultModelSelection: ModelSelection = {
    provider: 'azure',
    model: 'hifi',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays current provider and model in the active model display', async () => {
    render(
      <ChatMenu
        activeModelSelection={defaultModelSelection}
        setActiveModelSelection={mockSetActiveModelSelection}
      />
    );

    // Click the menu button to open the menu
    const menuButton = screen.getByTestId('button-chat-menu');
    fireEvent.click(menuButton);

    await waitFor(() => {
      expect(screen.getByText('Azure')).toBeInTheDocument();
      expect(screen.getByText('Attorney')).toBeInTheDocument();
    });
  });

  it('shows all available providers', async () => {
    render(
      <ChatMenu
        activeModelSelection={defaultModelSelection}
        setActiveModelSelection={mockSetActiveModelSelection}
      />
    );

    const menuButton = screen.getByTestId('button-chat-menu');
    fireEvent.click(menuButton);

    await waitFor(() => {
      expect(screen.getByText('Azure')).toBeInTheDocument();
      expect(screen.getByText('Google')).toBeInTheDocument();
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
    });
  });

  it('switches provider when provider is selected', async () => {
    render(
      <ChatMenu
        activeModelSelection={defaultModelSelection}
        setActiveModelSelection={mockSetActiveModelSelection}
      />
    );

    const menuButton = screen.getByTestId('button-chat-menu');
    fireEvent.click(menuButton);

    await waitFor(() => {
      const googleOption = screen.getByTestId('menu-item-provider-google');
      fireEvent.click(googleOption);
    });

    expect(mockSetActiveModelSelection).toHaveBeenCalledWith({
      provider: 'google',
      model: 'hifi', // Should keep the same model if available
    });
  });

  it('falls back to lofi model when switching to provider without current model', async () => {
    const modelSelection: ModelSelection = {
      provider: 'azure',
      model: 'reasoning-high', // This model is not available on Google
    };

    render(
      <ChatMenu
        activeModelSelection={modelSelection}
        setActiveModelSelection={mockSetActiveModelSelection}
      />
    );

    const menuButton = screen.getByTestId('button-chat-menu');
    fireEvent.click(menuButton);

    await waitFor(() => {
      const googleOption = screen.getByTestId('menu-item-provider-google');
      fireEvent.click(googleOption);
    });

    expect(mockSetActiveModelSelection).toHaveBeenCalledWith({
      provider: 'google',
      model: 'lofi', // Should fallback to lofi when reasoning-high is not available
    });
  });

  it('shows disabled models appropriately', async () => {
    const googleSelection: ModelSelection = {
      provider: 'google',
      model: 'lofi',
    };

    render(
      <ChatMenu
        activeModelSelection={googleSelection}
        setActiveModelSelection={mockSetActiveModelSelection}
      />
    );

    const menuButton = screen.getByTestId('button-chat-menu');
    fireEvent.click(menuButton);

    await waitFor(() => {
      // Partner models should be disabled for Google
      const partnerMediumOption = screen.getByTestId('menu-item-model-reasoning-medium');
      const partnerHighOption = screen.getByTestId('menu-item-model-reasoning-high');
      
      expect(partnerMediumOption).toHaveAttribute('aria-disabled', 'true');
      expect(partnerHighOption).toHaveAttribute('aria-disabled', 'true');
    });
  });

  it('updates model selection when model is changed', async () => {
    render(
      <ChatMenu
        activeModelSelection={defaultModelSelection}
        setActiveModelSelection={mockSetActiveModelSelection}
      />
    );

    const menuButton = screen.getByTestId('button-chat-menu');
    fireEvent.click(menuButton);

    await waitFor(() => {
      const lofiOption = screen.getByTestId('menu-item-model-lofi');
      fireEvent.click(lofiOption);
    });

    expect(mockSetActiveModelSelection).toHaveBeenCalledWith({
      provider: 'azure',
      model: 'lofi',
    });
  });
});