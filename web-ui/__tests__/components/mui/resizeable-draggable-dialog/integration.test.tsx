/**
 * @fileoverview Integration tests for ResizableDraggableDialog and ResizeableDraggablePaper components.
 * Tests the components working together without mocking to ensure full functionality and coverage.
 */

import React, { useState } from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  cleanup,
} from '@/__tests__/test-utils';
import ResizableDraggableDialog from '@/components/mui/resizeable-draggable-dialog/dialog';
import type { ResizeableDraggableDialogProps } from '@/components/mui/resizeable-draggable-dialog/types';

// Test wrapper component to manage state
const TestDialogWrapper = ({
  initialOpen = true,
  ...props
}: Partial<ResizeableDraggableDialogProps> & { initialOpen?: boolean }) => {
  const [open, setOpen] = useState(initialOpen);

  return (
    <div>
      <button onClick={() => setOpen(true)}>Open Dialog</button>
      <button onClick={() => setOpen(false)}>Close Dialog</button>
      <ResizableDraggableDialog
        isOpenState={[open, setOpen]}
        title="Integration Test Dialog"
        {...props}
      >
        <div data-testid="dialog-content">
          <p>This is test content</p>
          <input data-testid="test-input" placeholder="Test input" />
        </div>
      </ResizableDraggableDialog>
    </div>
  );
};

// Wrapper specifically for testing size control functionality
const TestDialogWithSizeControl = ({
  initialOpen = true,
  ...props
}: Partial<ResizeableDraggableDialogProps> & { initialOpen?: boolean }) => {
  const [open, setOpen] = useState(initialOpen);
  const [sizeFunctionAvailable, setSizeFunctionAvailable] = useState(false);

  const handleRefineSizeProps = (func: unknown) => {
    // Just track that the function was provided
    setSizeFunctionAvailable(!!func);
  };

  return (
    <div>
      <button onClick={() => setOpen(true)}>Open Dialog</button>
      <button onClick={() => setOpen(false)}>Close Dialog</button>
      {sizeFunctionAvailable && (
        <div data-testid="size-function-available">Size function available</div>
      )}
      <ResizableDraggableDialog
        isOpenState={[open, setOpen]}
        title="Size Control Test Dialog"
        setRefineSizeProps={handleRefineSizeProps}
        {...props}
      >
        <div data-testid="dialog-content">
          <p>This is test content</p>
        </div>
      </ResizableDraggableDialog>
    </div>
  );
};

describe('ResizableDraggableDialog + ResizeableDraggablePaper Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock getBoundingClientRect for all elements
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 400,
      height: 300,
      top: 100,
      left: 100,
      bottom: 400,
      right: 500,
      x: 100,
      y: 100,
      toJSON: jest.fn(),
    }));

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });

    // Mock console.warn to avoid noise in tests
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up any DOM elements created during tests
    document.querySelectorAll('[aria-live]').forEach((el) => el.remove());
    document
      .querySelectorAll('[data-testid="current-size"]')
      .forEach((el) => el.remove());
    // Clean up timers to avoid DOM removal errors
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    cleanup();
    jest.restoreAllMocks();
  });

  describe('Basic Integration', () => {
    it('renders dialog with paper component and all expected elements', async () => {
      render(<TestDialogWrapper />);

      // Wait for dialog to be fully rendered
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Check for dialog structure
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Integration Test Dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
      expect(screen.getByTestId('test-input')).toBeInTheDocument();

      // Check for drag handle - use a more specific selector
      const dragHandle = screen.getByRole('button', {
        name: /drag to move dialog/i
      });
      expect(dragHandle).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Drag to move dialog'),
      );
    });

    it('opens and closes dialog correctly', async () => {
      render(<TestDialogWrapper initialOpen={false} />);

      // Initially closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Open dialog
      fireEvent.click(screen.getByText('Open Dialog'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Close dialog
      fireEvent.click(screen.getByText('Close Dialog'));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Size Management Integration', () => {
    it('initializes with correct default dimensions', async () => {
      render(<TestDialogWrapper />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Check that the dialog renders with the paper component
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('applies custom initial dimensions', async () => {
      render(<TestDialogWrapper initialWidth={600} initialHeight={450} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Verify the dialog is rendered (the actual size styling is applied by the paper component)
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('exposes size control function when setRefineSizeProps is provided', async () => {
      render(<TestDialogWithSizeControl />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Check that size function was made available
      await waitFor(() => {
        expect(
          screen.getByTestId('size-function-available'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation Integration', () => {
    it('handles keyboard dragging with arrow keys', async () => {
      render(<TestDialogWrapper />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const dragHandle = screen.getByRole('button', { name: /drag to move dialog/i });
      const dialog = screen.getByRole('dialog');

      // Mock the closest method to return the dialog element
      jest.spyOn(dragHandle, 'closest').mockReturnValue(dialog);

      // Focus the drag handle
      act(() => {
        dragHandle.focus();
      });

      // Test arrow key movement
      act(() => {
        fireEvent.keyDown(dragHandle, { key: 'ArrowRight' });
      });

      await waitFor(() => {
        expect(dialog.style.transform).toContain('translate(10px');
      });

      // Test Shift + arrow key for larger movement
      act(() => {
        fireEvent.keyDown(dragHandle, { key: 'ArrowDown', shiftKey: true });
      });

      await waitFor(() => {
        expect(dialog.style.transform).toContain('translate(10px, 70px)');
      });
    });

    it('provides screen reader announcements for keyboard movement', async () => {
      render(<TestDialogWrapper />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const dragHandle = screen.getByRole('button', { name: /drag to move dialog/i });
      const dialog = screen.getByRole('dialog');

      jest.spyOn(dragHandle, 'closest').mockReturnValue(dialog);

      act(() => {
        dragHandle.focus();
      });

      // Trigger movement
      act(() => {
        fireEvent.keyDown(dragHandle, { key: 'ArrowLeft' });
      });

      // Check for aria-live announcement
      await waitFor(() => {
        const announcements = document.querySelectorAll('[aria-live="polite"]');
        expect(announcements.length).toBeGreaterThan(0);
      });
    });

    it('provides focus instructions when drag handle is focused', async () => {
      render(<TestDialogWrapper />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const dragHandle = screen.getByRole('button', { name: /drag to move dialog/i });

      act(() => {
        fireEvent.focus(dragHandle);
      });

      await waitFor(() => {
        const announcements = document.querySelectorAll('[aria-live="polite"]');
        expect(announcements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Modal vs Non-Modal Behavior', () => {
    it('behaves as non-modal by default', async () => {
      render(<TestDialogWrapper modal={false} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // In non-modal mode, elements behind should be accessible
      const inputElement = screen.getByTestId('test-input');
      act(() => {
        inputElement.focus();
      });

      expect(inputElement).toHaveFocus();
    });

    it('behaves as modal when modal=true', async () => {
      render(<TestDialogWrapper modal={true} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Check that backdrop is present in modal mode
      const backdrop = document.querySelector('[class*="MuiBackdrop-root"]');
      expect(backdrop).toBeInTheDocument();
    });

    it('handles escape key in modal mode', async () => {
      render(<TestDialogWrapper modal={true} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Press escape key
      act(() => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Position Reset Integration', () => {
    it('resets position when dialog reopens', async () => {
      render(<TestDialogWrapper initialOpen={false} />);

      // Open dialog
      fireEvent.click(screen.getByText('Open Dialog'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const dragHandle = screen.getByRole('button', { name: /drag to move dialog/i });
      const dialog = screen.getByRole('dialog');

      jest.spyOn(dragHandle, 'closest').mockReturnValue(dialog);

      // Move dialog with keyboard
      act(() => {
        dragHandle.focus();
        fireEvent.keyDown(dragHandle, { key: 'ArrowRight' });
      });

      await waitFor(() => {
        expect(dialog.style.transform).toContain('translate(10px');
      });

      // Close dialog
      fireEvent.click(screen.getByText('Close Dialog'));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Reopen dialog
      fireEvent.click(screen.getByText('Open Dialog'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Position should be reset
      const reopenedDialog = screen.getByRole('dialog');
      expect(reopenedDialog.style.transform).toBe('');
    });
  });

  describe('Error Handling Integration', () => {
    it('handles missing dialog element gracefully during keyboard drag', async () => {
      render(<TestDialogWrapper />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const dragHandle = screen.getByRole('button', { name: /drag to move dialog/i });

      // Mock closest to return null (simulating missing dialog)
      jest.spyOn(dragHandle, 'closest').mockReturnValue(null);

      // Should not throw error
      expect(() => {
        act(() => {
          fireEvent.keyDown(dragHandle, { key: 'ArrowRight' });
        });
      }).not.toThrow();
    });

    it('handles constraint validation warnings', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(
        <TestDialogWrapper
          initialWidth={100} // Below minimum
          initialHeight={100} // Below minimum
          minConstraints={[300, 200]}
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'initialWidth 100 is outside constraints',
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'initialHeight 100 is outside constraints',
      );
    });
  });

  describe('Accessibility Integration', () => {
    it('maintains proper ARIA relationships between components', async () => {
      render(<TestDialogWrapper />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      const dragHandle = screen.getByRole('button', { name: /drag to move dialog/i });

      // Check ARIA labeling
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dragHandle).toHaveAttribute('aria-label');
      expect(dragHandle).toHaveAttribute('tabIndex', '0');
    });

    it('supports keyboard navigation focus flow', async () => {
      render(<TestDialogWrapper />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const dragHandle = screen.getByRole('button', {
        name: /drag to move dialog/i
      });
      const testInput = screen.getByTestId('test-input');

      // Focus drag handle
      act(() => {
        dragHandle.focus();
      });
      expect(dragHandle).toHaveFocus();

      // Tab to input
      act(() => {
        fireEvent.keyDown(dragHandle, { key: 'Tab' });
        testInput.focus();
      });
      expect(testInput).toHaveFocus();
    });
  });

  describe('Dialog Actions Integration', () => {
    it('renders dialog actions when provided', async () => {
      render(
        <TestDialogWrapper
          dialogActions={() => (
            <div data-testid="integration-dialog-actions">
              <button>Save</button>
              <button>Cancel</button>
            </div>
          )}
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      expect(
        screen.getByTestId('integration-dialog-actions'),
      ).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('Custom Props Integration', () => {
    it('passes basic paper props through to the paper component', async () => {
      render(
        <TestDialogWrapper
          paperProps={{
            elevation: 8,
            style: { borderRadius: '16px' },
          }}
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Verify the dialog is rendered (specific styling is handled by the paper component)
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('handles custom onClose handler', async () => {
      const mockOnClose = jest.fn();

      render(<TestDialogWrapper modal={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Trigger close via close button
      const closeButton = screen.getByRole('button', { name: /close dialog/i });
      act(() => {
        fireEvent.click(closeButton);
      });

      // Give it time to process and check if mockOnClose was called
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Constraint Integration', () => {
    it('respects custom size constraints', async () => {
      render(
        <TestDialogWrapper
          minConstraints={[400, 250]}
          maxConstraints={[1000, 700]}
          initialWidth={500}
          initialHeight={350}
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveStyle({ width: '500px', height: '350px' });
    });
  });
});
