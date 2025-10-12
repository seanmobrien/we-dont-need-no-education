/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/test-utils';
import '@testing-library/jest-dom';
import { ChatMenu } from '@/components/ai/chat-panel/chat-menu';
import { ModelSelection } from '@/components/ai/chat-panel/types';

describe('ChatMenu Provider Selection', () => {
  const mockSetActiveModelSelection = jest.fn();
  const defaultModelSelection: ModelSelection = {
    provider: 'azure',
    model: 'hifi',
  };

  beforeEach(() => {
    // jest.clearAllMocks();
  });

  it('displays current provider and model in the active model display', async () => {
    render(
      <ChatMenu
        activeModelSelection={defaultModelSelection}
        setActiveModelSelection={mockSetActiveModelSelection}
      />,
    );

    // Click the menu button to open the menu
    const menuButton = screen.getByTestId('button-chat-menu');
    fireEvent.click(menuButton);

    await waitFor(
      () => {
        // Look for the elements using getAllBy since there are multiples
        const azureElements = screen.getAllByText('Azure');
        const attorneyElements = screen.getAllByText('Attorney');

        expect(azureElements.length).toBeGreaterThan(0);
        expect(attorneyElements.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );
  }, 10000);

  it('shows all available providers', async () => {
    render(
      <ChatMenu
        activeModelSelection={defaultModelSelection}
        setActiveModelSelection={mockSetActiveModelSelection}
      />,
    );

    const menuButton = screen.getByTestId('button-chat-menu');
    fireEvent.click(menuButton);

    await waitFor(
      () => {
        // Check that all provider options are present via test IDs
        expect(
          screen.getByTestId('menu-item-provider-azure'),
        ).toBeInTheDocument();
        expect(
          screen.getByTestId('menu-item-provider-google'),
        ).toBeInTheDocument();
        expect(
          screen.getByTestId('menu-item-provider-openai'),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  }, 10000);

  it('switches provider when provider is selected', async () => {
    render(
      <ChatMenu
        activeModelSelection={defaultModelSelection}
        setActiveModelSelection={mockSetActiveModelSelection}
      />,
    );

    const menuButton = screen.getByTestId('button-chat-menu');
    fireEvent.click(menuButton);

    await waitFor(
      () => {
        const googleOption = screen.getByTestId('menu-item-provider-google');
        fireEvent.click(googleOption);
      },
      { timeout: 5000 },
    );

    expect(mockSetActiveModelSelection).toHaveBeenCalledWith({
      provider: 'google',
      model: 'hifi', // Should keep the same model if available
    });
  }, 10000);

  it('falls back to lofi model when switching to provider without current model', async () => {
    const modelSelection: ModelSelection = {
      provider: 'azure',
      model: 'reasoning-high', // This model is not available on Google
    };

    render(
      <ChatMenu
        activeModelSelection={modelSelection}
        setActiveModelSelection={mockSetActiveModelSelection}
      />,
    );

    const menuButton = screen.getByTestId('button-chat-menu');
    fireEvent.click(menuButton);

    await waitFor(
      () => {
        const googleOption = screen.getByTestId('menu-item-provider-google');
        fireEvent.click(googleOption);
      },
      { timeout: 5000 },
    );

    expect(mockSetActiveModelSelection).toHaveBeenCalledWith({
      provider: 'google',
      model: 'lofi', // Should fallback to lofi when reasoning-high is not available
    });
  }, 10000);

  it('shows disabled models appropriately', async () => {
    const googleSelection: ModelSelection = {
      provider: 'google',
      model: 'lofi',
    };

    render(
      <ChatMenu
        activeModelSelection={googleSelection}
        setActiveModelSelection={mockSetActiveModelSelection}
      />,
    );

    const menuButton = screen.getByTestId('button-chat-menu');
    fireEvent.click(menuButton);

    await waitFor(
      () => {
        // Partner models should be disabled for Google
        const partnerMediumOption = screen.getByTestId(
          'menu-item-model-reasoning-medium',
        );
        const partnerHighOption = screen.getByTestId(
          'menu-item-model-reasoning-high',
        );

        expect(partnerMediumOption).toHaveAttribute('aria-disabled', 'true');
        expect(partnerHighOption).toHaveAttribute('aria-disabled', 'true');
      },
      { timeout: 5000 },
    );
  }, 10000);

  it('updates model selection when model is changed', async () => {
    render(
      <ChatMenu
        activeModelSelection={defaultModelSelection}
        setActiveModelSelection={mockSetActiveModelSelection}
      />,
    );

    const menuButton = screen.getByTestId('button-chat-menu');
    fireEvent.click(menuButton);

    await waitFor(
      () => {
        const lofiOption = screen.getByTestId('menu-item-model-lofi');
        fireEvent.click(lofiOption);
      },
      { timeout: 5000 },
    );

    expect(mockSetActiveModelSelection).toHaveBeenCalledWith({
      provider: 'azure',
      model: 'lofi',
    });
  }, 10000);
});
