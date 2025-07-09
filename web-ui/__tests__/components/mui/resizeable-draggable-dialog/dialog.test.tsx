/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @fileoverview Tests for the ResizableDraggableDialog component.
 * Tests dialog rendering, props passing, and basic integration.
 */

import React from 'react';
import { render, screen } from '@/__tests__/test-utils';
import ResizableDraggableDialog from '@/components/mui/resizeable-draggable-dialog/dialog';
import type { ResizeableDraggableDialogProps } from '@/components/mui/resizeable-draggable-dialog/types';

// Mock the ResizeableDraggablePaper component to render children properly
jest.mock(
  '@/components/mui/resizeable-draggable-dialog/resizeable-draggable-paper',
  () => {
    const MockResizeableDraggablePaper = React.forwardRef<HTMLDivElement, any>(
      (props, ref) => {
        const { setRefineSizeProps, width, height, children, ...otherProps } =
          props;

        // Call setRefineSizeProps if provided
        React.useEffect(() => {
          if (setRefineSizeProps && typeof setRefineSizeProps === 'function') {
            setRefineSizeProps(() => ({ width, height }));
          }
        }, [setRefineSizeProps, width, height]);

        // Filter out non-DOM props
        const { dragHandleId, dialogId, ...domProps } = otherProps;

        return (
          <div
            ref={ref}
            data-testid={props['data-testid'] || 'resizeable-draggable-paper'}
            {...domProps}
          >
            {children}
          </div>
        );
      },
    );
    MockResizeableDraggablePaper.displayName = 'MockResizeableDraggablePaper';
    return MockResizeableDraggablePaper;
  },
);

describe('ResizableDraggableDialog', () => {
  const defaultProps: ResizeableDraggableDialogProps = {
    isOpenState: [true, jest.fn()],
    open: true,
    title: 'Test Dialog',
    children: <div>Dialog Content</div>,
  };

  const renderDialog = (
    props: Partial<ResizeableDraggableDialogProps> = {},
  ) => {
    return render(<ResizableDraggableDialog {...defaultProps} {...props} />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any DOM elements created by the component
    document.querySelectorAll('[aria-live]').forEach((el) => el.remove());
  });

  describe('Basic Rendering', () => {
    it('renders dialog when open', () => {
      renderDialog();

      // Should render the title and content within the dialog
      expect(screen.getByText('Test Dialog')).toBeInTheDocument();
      expect(screen.getByText('Dialog Content')).toBeInTheDocument();

      // Should render the paper wrapper
      expect(
        screen.getByTestId('resizeable-draggable-paper'),
      ).toBeInTheDocument();
    });

    it('does not render dialog when closed', () => {
      renderDialog({ isOpenState: [false, jest.fn()], open: false });

      expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();
      expect(screen.queryByText('Dialog Content')).not.toBeInTheDocument();
    });

    it('renders drag handle with accessibility attributes', () => {
      renderDialog();

      const handle = screen.getByRole('button');
      expect(handle).toHaveAttribute('tabIndex', '0');
      expect(handle).toHaveAttribute('aria-label');

      const ariaLabel = handle.getAttribute('aria-label');
      expect(ariaLabel).toContain('Drag to move dialog');
      expect(ariaLabel).toContain('arrow keys');
      expect(ariaLabel).toContain('Shift');
    });
  });

  describe('Props Integration', () => {
    it('exposes size control function when setRefineSizeProps is provided', () => {
      const mockSetRefineSizeProps = jest.fn();

      renderDialog({ setRefineSizeProps: mockSetRefineSizeProps });

      expect(mockSetRefineSizeProps).toHaveBeenCalled();
    });

    it('renders dialog actions when provided', () => {
      const mockDialogActions = () => (
        <div data-testid="dialog-actions">Actions</div>
      );

      renderDialog({ dialogActions: mockDialogActions });

      expect(screen.getByTestId('dialog-actions')).toBeInTheDocument();
    });
  });

  describe('Material-UI Integration', () => {
    it('integrates with Material-UI Dialog component', () => {
      renderDialog();

      // Should have Material-UI Dialog root element
      const dialogRoot = document.querySelector('.MuiDialog-root');
      expect(dialogRoot).toBeInTheDocument();
    });

    it('handles component lifecycle without errors', () => {
      const { unmount, rerender } = renderDialog();

      // Should rerender without errors
      expect(() => {
        rerender(
          <ResizableDraggableDialog {...defaultProps} title="Updated Title" />,
        );
      }).not.toThrow();

      // Should unmount without errors
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('handles prop updates correctly', () => {
      const { rerender } = renderDialog();

      expect(screen.getByText('Test Dialog')).toBeInTheDocument();

      // Update title
      rerender(
        <ResizableDraggableDialog {...defaultProps} title="Updated Dialog" />,
      );

      expect(screen.getByText('Updated Dialog')).toBeInTheDocument();
      expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles invalid props gracefully', () => {
      expect(() => {
        renderDialog({
          initialWidth: -100,
          initialHeight: -100,
        });
      }).not.toThrow();
    });

    it('handles undefined children gracefully', () => {
      expect(() => {
        renderDialog({
          children: undefined,
        });
      }).not.toThrow();
    });
  });

  describe('Component Types and Interfaces', () => {
    it('accepts all expected props without TypeScript errors', () => {
      // This test verifies that the component accepts all defined props
      const allProps: ResizeableDraggableDialogProps = {
        isOpenState: [true, jest.fn()],
        open: true,
        title: 'Test',
        children: <div>Content</div>,
        initialHeight: 400,
        initialWidth: 600,
        minConstraints: [200, 150],
        maxConstraints: [1000, 800],
        modal: true,
        onClose: jest.fn(),
        paperProps: { elevation: 4 },
        setRefineSizeProps: jest.fn(),
        dialogActions: () => {
          const Actions = () => <div>Actions</div>;
          return Actions as any;
        },
      };

      expect(() => {
        renderDialog(allProps);
      }).not.toThrow();
    });
  });
});
