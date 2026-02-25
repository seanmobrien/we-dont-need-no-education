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
import { PaperProps } from '@mui/material/Paper';
import { styled } from '@mui/material/styles';
import { useCallback, useId, useState, useRef, useMemo } from 'react';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import MinimizeIcon from '@mui/icons-material/Minimize';
import MaximizeIcon from '@mui/icons-material/CropSquare';
import RestoreIcon from '@mui/icons-material/FilterNone';
import CloseIcon from '@mui/icons-material/Close';
import ResizeableDraggablePaper from './resizeable-draggable-paper';
import { ResizeableDraggableDialogProps } from './types';
import { log } from '@compliance-theater/logger';

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

const stableStyles = {
  dialogTitle: {
    marginY: 0,
    marginLeft: '1em',
  },
};

/**
 * Container for window control buttons (minimize, maximize, close)
 */
const WindowControls = styled('div')`
  display: flex;
  align-items: center;
  gap: 4px;
`;

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
  isOpenState: open,
  paperProps,
  children,
  title,
  modal = false,
  width: width = 400,
  height: height = 300,
  dialogActions,
  onClose,
  onResize,
  minConstraints = [200, 200],
}: ResizeableDraggableDialogProps) => {
  const thisItemId = useId();
  const { dialogTitleId, dialogDraggableHandleId } = {
    dialogTitleId: `${thisItemId}-draggable-dialog-title`,
    dialogDraggableHandleId: `${thisItemId}-draggable-dialog`,
  } as const;

  // State for tracking keyboard drag position
  const dragHandleRef = useRef<HTMLDivElement>(null);

  // State for window functionality
  const [windowState, setWindowState] = useState<WindowState>(
    WindowState.Normal
  );

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
    (evt: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>): void;
    /**
     * Handle close event with reason
     * @param {React.MouseEvent<HTMLAnchorElement>} evt - The mouse event
     * @param {'backdropClick' | 'escapeKeyDown'} reason - The reason for closing
     */
    (
      evt: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
      reason: 'backdropClick' | 'escapeKeyDown'
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
      evt: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
      reason?: 'backdropClick' | 'escapeKeyDown'
    ) => {
      if (!open) {
        return;
      }
      // For modal dialogs, allow all close reasons
      // For non-modal dialogs, ignore backdrop clicks
      if (modal === true || reason !== 'backdropClick') {
        onClose(evt, reason ?? '');
      }
    },
    [open, onClose, modal]
  );

  /**
   * Handle minimize button click
   */
  const handleMinimize = useCallback(() => {
    setWindowState(WindowState.Minimized);
  }, [setWindowState]);

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
  const handleCloseClick = useCallback(
    (evt: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
      handleClose(evt as React.MouseEvent<HTMLAnchorElement>);
    },
    [handleClose]
  );

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
      let dialogHeight = height;
      let dialogWidth = width;

      if (windowState === WindowState.Maximized) {
        // Use full viewport dimensions for maximized state
        dialogHeight = window.innerHeight - 20; // Minimal margin
        dialogWidth = window.innerWidth - 20;
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
          // setRefineSizeProps={setRefineSizeProps}
          dialogId={dialogDraggableHandleId}
          minConstraints={minConstraints}
          maxConstraints={[
            window.innerWidth - 20, // Leave some margin
            window.innerHeight - 20,
          ]}
          onResize={onResize}
        />
      );
    },
    [
      height,
      width,
      windowState,
      paperProps,
      dialogDraggableHandleId,
      minConstraints,
      onResize,
    ]
  );

  /**
   * Validate initial dimensions against constraints.
   * Logs a warning if initialHeight or initialWidth are outside the defined constraints.
   */
  React.useEffect(() => {
    let newHeight = height;
    let newWidth = width;
    if (height < minConstraints[1]) {
      log((l) => l.warn(`initialHeight ${height} is outside constraints`));
      newHeight = minConstraints[1];
    }
    if (height > window.innerHeight - 20) {
      log((l) => l.warn(`initialHeight ${height} is outside constraints`));
      newHeight = window.innerHeight - 20;
    }
    if (width < minConstraints[0]) {
      log((l) => l.warn(`initialWidth ${width} is outside constraints`));
      newWidth = minConstraints[0];
    }
    if (width > window.innerWidth - 20) {
      log((l) => l.warn(`initialWidth ${width} is outside constraints`));
      newWidth = window.innerWidth - 20;
    }
    if (!onResize) {
      log((l) =>
        l.warn(
          'onResize callback is not provided, dynamic resizing will not work.'
        )
      );
    }
    onResize?.(newWidth, newHeight);
  }, [height, width, minConstraints, onResize]);

  /**
   * Memoized slotProps for Dialog component to prevent unnecessary re-renders.
   * Only updates when modal prop changes.
   */
  const dialogSlotProps = useMemo(
    () => ({
      root: {
        style: {
          // Allow pointer events to pass through when non-modal
          pointerEvents:
            modal === false ? ('none' as const) : ('auto' as const),
        },
      },
    }),
    [modal]
  );

  /**
   * Memoized sx styles for Dialog component to prevent unnecessary re-renders.
   * Only updates when modal prop changes.
   */
  const dialogSx = useMemo(
    () => ({
      // Additional styling if needed
      ...(modal === false && {
        '& .MuiDialog-container': {
          pointerEvents: 'none',
        },
        '& .MuiDialog-paper': {
          // Ensure the dialog paper itself still receives pointer events
          pointerEvents: 'auto !important',
        },
      }),
    }),
    [modal]
  );

  return (
    <React.Fragment>
      <Dialog
        open={open}
        onClose={handleClose}
        PaperComponent={RenderResizeableDraggablePaper}
        hideBackdrop={modal === false} // Hide backdrop for non-modal, show for modal
        disableEnforceFocus={modal === false} // Allow focus outside for non-modal
        aria-labelledby={dialogTitleId}
        slotProps={dialogSlotProps}
        sx={dialogSx}
      >
        <DraggableHandle
          ref={dragHandleRef}
          id={dialogDraggableHandleId}
          role="button"
          tabIndex={0}
          aria-label="Drag to move dialog. Use arrow keys to move, hold Shift for larger steps."
        >
          <Typography component="h3" sx={stableStyles.dialogTitle}>
            {title}
          </Typography>
          <div style={{ flex: 1 }}>&nbsp;</div>
          <WindowControls>
            <IconButton
              size="small"
              onClick={handleMinimize}
              aria-label="Minimize dialog"
              sx={{ padding: '2px' }}
              data-id="button-window-minimize"
            >
              <MinimizeIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleMaximize}
              data-id="button-window-maximize"
              aria-label={
                windowState === WindowState.Maximized
                  ? 'Restore dialog'
                  : 'Maximize dialog'
              }
              sx={{ padding: '2px' }}
            >
              {windowState === WindowState.Maximized ? (
                <RestoreIcon fontSize="small" />
              ) : (
                <MaximizeIcon fontSize="small" />
              )}
            </IconButton>
            <IconButton
              size="small"
              data-id="button-window-inline"
              onClick={handleCloseClick}
              aria-label="Close dialog"
              sx={{ padding: '2px' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </WindowControls>
        </DraggableHandle>
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
