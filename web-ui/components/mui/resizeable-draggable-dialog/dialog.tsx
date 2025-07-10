/**
 * @fileoverview Resizable and draggable dialog component built on top of Material-UI Dialog.
 * This module provides a customizable dialog that can be resized and dragged around the screen,
 * with support for both modal and non-modal behaviors.
 *
 * @author NoEducation Team
 * @version 1.0.0
 * @since 2025-07-07
 */

'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { PaperProps } from '@mui/material/Paper';
import { styled } from '@mui/material/styles';
import { useCallback, useId, useState, useRef, useMemo } from 'react';
import { IconButton } from '@mui/material';
import MinimizeIcon from '@mui/icons-material/Minimize';
import MaximizeIcon from '@mui/icons-material/CropSquare';
import RestoreIcon from '@mui/icons-material/FilterNone';
import CloseIcon from '@mui/icons-material/Close';
import ResizeableDraggablePaper from './resizeable-draggable-paper';
import { ResizeableDraggableDialogProps } from './types';

/**
 * Enum for dialog window state
 */
enum WindowState {
  Normal = 'normal',
  Minimized = 'minimized',
  Maximized = 'maximized',
}

/**
 * Styled component for the draggable handle area at the top of the dialog.
 * Uses Material-UI's styled API for consistent theming integration.
 *
 * Features:
 * - Move cursor to indicate draggable area
 * - Focus styles for keyboard navigation
 * - Proper padding for touch targets
 *
 * @component
 * @example
 * ```tsx
 * <DraggableHandle id="my-dialog-handle">
 *   Drag me to move the dialog
 * </DraggableHandle>
 * ```
 */
const DraggableHandle = styled('div')`
  cursor: move;
  padding: 8px;
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  &:focus {
    outline: 2px solid ${({ theme }) => theme.palette.primary.main};
    outline-offset: 2px;
    background-color: ${({ theme }) => theme.palette.action.hover};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.palette.primary.main};
    outline-offset: 2px;
  }
`;

/**
 * Container for window control buttons (minimize, maximize, close)
 */
const WindowControls = styled('div')`
  display: flex;
  align-items: center;
  gap: 4px;
`;

/**
 * Configuration constants for keyboard dragging behavior.
 * Memoized to prevent recreation on every render.
 */
const KEYBOARD_DRAG_CONFIG = {
  STEP_SIZE: 10, // pixels to move per key press
  LARGE_STEP_SIZE: 50, // pixels to move when holding Shift
  BOUNDARY_PADDING: 20, // minimum distance from viewport edges
} as const;

/**
 * A resizable and draggable dialog component that extends Material-UI's Dialog functionality.
 *
 * This component provides:
 * - Drag functionality via a designated handle area
 * - Resize capability with configurable constraints
 * - Modal and non-modal modes
 * - Integration with Material-UI theming
 * - Accessibility features with proper ARIA labeling
 *
 * @component
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 *
 * return (
 *   <ResizableDraggableDialog
 *     isOpenState={[isOpen, setIsOpen]}
 *     title="My Dialog"
 *     initialWidth={500}
 *     initialHeight={400}
 *     modal={false}
 *   >
 *     <p>Dialog content goes here</p>
 *   </ResizableDraggableDialog>
 * );
 * ```
 *
 * @param {ResizeableDraggableDialogProps} props - The component props
 * @param {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} props.isOpenState - Tuple containing open state and setter
 * @param {string} props.title - Dialog title displayed in the header
 * @param {React.ReactNode} props.children - Content to be rendered inside the dialog
 * @param {boolean} [props.modal=false] - Whether the dialog should be modal (blocking interaction with background)
 * @param {number} [props.initialHeight=300] - Initial height of the dialog in pixels
 * @param {number} [props.initialWidth=400] - Initial width of the dialog in pixels
 * @param {() => typeof DialogActions} [props.dialogActions] - Function returning dialog actions component
 * @param {SetRefineSizeFunction} [props.setRefineSizeProps] - Callback for external size control
 * @param {function} [props.onClose] - Custom close handler
 * @param {object} [props.paperProps] - Additional props to pass to the underlying Paper component
 *
 * @returns {JSX.Element} The rendered resizable draggable dialog
 */
const ResizableDraggableDialog = ({
  isOpenState: [open, setOpen],
  paperProps,
  children,
  title,
  modal = false,
  initialHeight = 300,
  initialWidth = 400,
  dialogActions,
  setRefineSizeProps,
  onClose,
  onResize,
  minConstraints = [300, 200],
  maxConstraints = [800, 600],
}: ResizeableDraggableDialogProps) => {
  const thisItemId = useId();
  const { dialogTitleId, dialogDraggableHandleId } = useMemo(
    () => ({
      dialogTitleId: `${thisItemId}-draggable-dialog-title`,
      dialogDraggableHandleId: `${thisItemId}-draggable-dialog`,
    }),
    [thisItemId],
  );

  // State for tracking keyboard drag position
  const [keyboardDragPosition, setKeyboardDragPosition] = useState({
    x: 0,
    y: 0,
  });
  const dragHandleRef = useRef<HTMLDivElement>(null);

  // State for window functionality
  const [windowState, setWindowState] = useState<WindowState>(WindowState.Normal);

  /**
   * Type definition for the handleClose function overloads.
   * Supports both simple close events and close events with reasons.
   *
   * @interface HandleCloseOverloads
   */
  interface HandleCloseOverloads {
    /**
     * Handle close event without reason
     * @param {React.MouseEvent<HTMLAnchorElement>} evt - The mouse event
     */
    (evt: React.MouseEvent<HTMLAnchorElement>): void;
    /**
     * Handle close event with reason
     * @param {React.MouseEvent<HTMLAnchorElement>} evt - The mouse event
     * @param {'backdropClick' | 'escapeKeyDown'} reason - The reason for closing
     */
    (
      evt: React.MouseEvent<HTMLAnchorElement>,
      reason: 'backdropClick' | 'escapeKeyDown',
    ): void;
  }

  /**
   * Handles dialog close events with support for modal/non-modal behavior.
   *
   * In non-modal mode, backdrop clicks are ignored to allow interaction with
   * elements behind the dialog. Only explicit close actions or escape key
   * will close the dialog.
   *
   * @function handleClose
   * @param {React.MouseEvent<HTMLAnchorElement>} evt - The triggering mouse event
   * @param {'backdropClick' | 'escapeKeyDown'} [reason] - Optional reason for the close event
   */
  const handleClose = useCallback<HandleCloseOverloads>(
    (
      evt: React.MouseEvent<HTMLAnchorElement>,
      reason?: 'backdropClick' | 'escapeKeyDown',
    ) => {
      if (!open) {
        return;
      }
      if (onClose) {
        onClose(evt, reason as 'backdropClick' | 'escapeKeyDown');
        return;
      }

      // For modal dialogs, allow all close reasons
      // For non-modal dialogs, ignore backdrop clicks
      if (modal === true || reason !== 'backdropClick') {
        setOpen(false);
      }
    },
    [open, onClose, modal, setOpen],
  );

  /**
   * Handle minimize button click
   */
  const handleMinimize = useCallback(() => {
    setWindowState(WindowState.Minimized);
  }, []);

  /**
   * Handle maximize button click
   */
  const handleMaximize = useCallback(() => {
    if (windowState === WindowState.Maximized) {
      // Restore to normal state
      setWindowState(WindowState.Normal);
    } else {
      setWindowState(WindowState.Maximized);
    }
  }, [windowState]);

  /**
   * Handle close button click
   */
  const handleCloseClick = useCallback((evt: React.MouseEvent<HTMLButtonElement>) => {
    handleClose(evt as React.MouseEvent<HTMLAnchorElement>);
  }, [handleClose]);

  /**
   * Memoized render function for the resizable draggable paper component.
   *
   * This component serves as the custom Paper component for the Material-UI Dialog,
   * providing the resize and drag functionality. The memoization prevents unnecessary
   * re-renders when the dialog props haven't changed.
   *
   * @function RenderResizeableDraggablePaper
   * @returns {JSX.Element} The resizable draggable paper component
   */
  const RenderResizeableDraggablePaper = useCallback(
    (muiPaperProps: PaperProps) => {
      let dialogHeight = initialHeight;
      let dialogWidth = initialWidth;
      
      if (windowState === WindowState.Maximized) {
        // Use viewport dimensions for maximized state
        dialogHeight = window.innerHeight - 100; // Leave some margin
        dialogWidth = window.innerWidth - 100;
      } else if (windowState === WindowState.Minimized) {
        // Use minimal size for minimized state
        dialogHeight = 40; // Just show title bar
        dialogWidth = 300;
      }
      
      return (
        <ResizeableDraggablePaper
          {...(paperProps ?? {})}
          {...muiPaperProps}
          height={dialogHeight}
          width={dialogWidth}
          setRefineSizeProps={setRefineSizeProps}
          dialogId={dialogDraggableHandleId}
          onResize={onResize}
        />
      );
    },
    [
      paperProps,
      initialHeight,
      initialWidth,
      setRefineSizeProps,
      dialogDraggableHandleId,
      windowState,
      onResize,
    ],
  );

  /**
   * Handles keyboard-based dragging of the dialog.
   *
   * Supports arrow keys for movement with the following behavior:
   * - Arrow keys: Move dialog in 10px increments
   * - Shift + Arrow keys: Move dialog in 50px increments
   * - Respects viewport boundaries with padding
   * - Prevents default browser scrolling behavior
   *
   * @function handleKeyboardDrag
   * @param {React.KeyboardEvent<HTMLDivElement>} event - The keyboard event
   */
  const handleKeyboardDrag = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      // Only handle arrow keys
      if (
        !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
      ) {
        return;
      }

      event.preventDefault(); // Prevent default scrolling behavior
      event.stopPropagation();

      const stepSize = event.shiftKey
        ? KEYBOARD_DRAG_CONFIG.LARGE_STEP_SIZE
        : KEYBOARD_DRAG_CONFIG.STEP_SIZE;
      const currentElement = dragHandleRef.current?.closest(
        '[role="dialog"]',
      ) as HTMLElement;

      if (!currentElement) return;

      const currentRect = currentElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let deltaX = 0;
      let deltaY = 0;

      // Calculate movement delta based on key pressed
      switch (event.key) {
        case 'ArrowLeft':
          deltaX = -stepSize;
          break;
        case 'ArrowRight':
          deltaX = stepSize;
          break;
        case 'ArrowUp':
          deltaY = -stepSize;
          break;
        case 'ArrowDown':
          deltaY = stepSize;
          break;
      }

      // Calculate new position
      const newX = keyboardDragPosition.x + deltaX;
      const newY = keyboardDragPosition.y + deltaY;

      // Apply boundary constraints
      const minX = -currentRect.width + KEYBOARD_DRAG_CONFIG.BOUNDARY_PADDING;
      const maxX = viewportWidth - KEYBOARD_DRAG_CONFIG.BOUNDARY_PADDING;
      const minY = KEYBOARD_DRAG_CONFIG.BOUNDARY_PADDING;
      const maxY = viewportHeight - KEYBOARD_DRAG_CONFIG.BOUNDARY_PADDING;

      const constrainedX = Math.max(minX, Math.min(maxX, newX));
      const constrainedY = Math.max(minY, Math.min(maxY, newY));

      // Update position state
      setKeyboardDragPosition({ x: constrainedX, y: constrainedY });

      // Apply transform to move the dialog
      currentElement.style.transform = `translate(${constrainedX}px, ${constrainedY}px)`;

      // Announce movement to screen readers
      const direction = event.key.replace('Arrow', '').toLowerCase();
      const distance = stepSize;
      const announcement = `Dialog moved ${direction} by ${distance} pixels`;

      // Create temporary announcement for screen readers
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      announcer.style.position = 'absolute';
      announcer.style.left = '-10000px';
      announcer.textContent = announcement;

      document.body.appendChild(announcer);
      setTimeout(() => document.body.removeChild(announcer), 1000);
    },
    [keyboardDragPosition],
  );

  /**
   * Handles focus events on the drag handle to provide keyboard navigation hints.
   *
   * @function handleDragHandleFocus
   */
  const handleDragHandleFocus = useCallback(() => {
    // Announce keyboard navigation instructions
    const instructions =
      'Use arrow keys to move dialog. Hold Shift for larger steps.';

    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.className = 'sr-only';
    announcer.style.position = 'absolute';
    announcer.style.left = '-10000px';
    announcer.textContent = instructions;

    document.body.appendChild(announcer);
    setTimeout(() => document.body.removeChild(announcer), 2000);
  }, []);

  /**
   * Resets the keyboard drag position when dialog opens/closes.
   * This ensures the dialog starts in its default position.
   */
  React.useEffect(() => {
    if (open) {
      setKeyboardDragPosition({ x: 0, y: 0 });
      // Reset any transform that might be applied
      const dialogElement = dragHandleRef.current?.closest(
        '[role="dialog"]',
      ) as HTMLElement;
      if (dialogElement) {
        dialogElement.style.transform = '';
      }
    }
  }, [open]);

  /**
   * Validate initial dimensions against constraints.
   * Logs a warning if initialHeight or initialWidth are outside the defined constraints.
   */
  React.useEffect(() => {
    if (
      initialHeight < minConstraints[1] ||
      initialHeight > maxConstraints[1]
    ) {
      console.warn(`initialHeight ${initialHeight} is outside constraints`);
    }
    if (initialWidth < minConstraints[0] || initialWidth > maxConstraints[0]) {
      console.warn(`initialWidth ${initialWidth} is outside constraints`);
    }
  }, [initialHeight, initialWidth, minConstraints, maxConstraints]);

  return (
    <React.Fragment>
      <Dialog
        open={open}
        onClose={handleClose}
        PaperComponent={RenderResizeableDraggablePaper}
        hideBackdrop={modal === false} // Hide backdrop for non-modal, show for modal
        disableEnforceFocus={modal === false} // Allow focus outside for non-modal
        aria-labelledby={dialogTitleId}
      >
        <DraggableHandle
          ref={dragHandleRef}
          id={dialogDraggableHandleId}
          role="button"
          tabIndex={0}
          aria-label="Drag to move dialog. Use arrow keys to move, hold Shift for larger steps."
          onKeyDown={handleKeyboardDrag}
          onFocus={handleDragHandleFocus}
        >
          <div style={{ flex: 1 }}>&nbsp;</div>
          <WindowControls>
            <IconButton 
              size="small" 
              onClick={handleMinimize}
              aria-label="Minimize dialog"
              sx={{ padding: '2px' }}
            >
              <MinimizeIcon fontSize="small" />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={handleMaximize}
              aria-label={windowState === WindowState.Maximized ? "Restore dialog" : "Maximize dialog"}
              sx={{ padding: '2px' }}
            >
              {windowState === WindowState.Maximized ? <RestoreIcon fontSize="small" /> : <MaximizeIcon fontSize="small" />}
            </IconButton>
            <IconButton 
              size="small" 
              onClick={handleCloseClick}
              aria-label="Close dialog"
              sx={{ padding: '2px' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </WindowControls>
        </DraggableHandle>
        <DialogTitle id={dialogTitleId}>{title}</DialogTitle>
        {windowState !== WindowState.Minimized && (
          <>
            <DialogContent>{children}</DialogContent>
            {dialogActions && dialogActions({})}
          </>
        )}
      </Dialog>
    </React.Fragment>
  );
};

export default ResizableDraggableDialog;
