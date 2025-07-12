/**
 * @fileoverview Resizable and draggable paper component that wraps Material-UI Paper with interactive capabilities.
 * This module integrates react-draggable and react-resizable to provide a fully interactive p          <Paper
            {...props}
            style={{
              height: `${height}px`,
              width: `${width}px`,
              maxHeight: '100%',
              margin: 0,
            }}
          >
            {props.children}
          </Paper>onent
 * that can be used as a custom PaperComponent in Material-UI Dialogs.
 *
 * The component manages its own size state and provides callbacks for external size control,
 * making it suitable for complex dialog implementations that need programmatic size management.
 *
 * @author NoEducation Team
 * @version 1.0.0
 * @since 2025-07-07
 * @requires react-draggable
 * @requires react-resizable
 * @requires @mui/material/Paper
 */

'use client';

import * as React from 'react';
import Paper from '@mui/material/Paper';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { useCallback, useState } from 'react';
import type {
  RefineSizeFunction,
  ResizeableDraggablePaperProps,
  Size,
} from './types';
import 'react-resizable/css/styles.css';

/**
 * Default resize handles configuration for the resizable component.
 * Includes all 8 directional handles: corners and edges.
 * @constant {string[]}
 */
const stableResizeHandles = ['sw', 'se', 'nw', 'ne', 'w', 'e', 'n', 's'];

/**
 * Default minimum size constraints [width, height] in pixels.
 * Ensures the dialog remains usable at small sizes.
 * @constant {[number, number]}
 */
const defaultMinConstraints = [300, 200];

/**
 * Default maximum size constraints [width, height] in pixels.
 * Prevents the dialog from becoming too large on small screens.
 * @constant {[number, number]}
 */
const defaultMaxConstraints = [800, 600];

/**
 * A resizable and draggable paper component that extends Material-UI Paper functionality.
 *
 * This component combines:
 * - Material-UI Paper for consistent styling and theming
 * - react-draggable for drag functionality
 * - react-resizable for resize capabilities
 * - Internal size state management
 * - External size control through callbacks
 *
 * The component is designed to be used as a PaperComponent in Material-UI Dialogs,
 * providing a seamless way to make dialogs interactive.
 *
 * @component
 * @example
 * ```tsx
 * // Basic usage
 * <ResizeableDraggablePaper
 *   height={400}
 *   width={600}
 *   dialogId="my-dialog"
 * />
 *
 * // With size control callback
 * const [refineSizeFunction, setRefineSizeFunction] = useState();
 *
 * <ResizeableDraggablePaper
 *   height={400}
 *   width={600}
 *   setRefineSizeProps={setRefineSizeFunction}
 *   minConstraints={[200, 150]}
 *   maxConstraints={[1200, 800]}
 * />
 * ```
 *
 * @param {ResizeableDraggablePaperProps} props - The component props
 * @param {number} [props.height] - Initial height in pixels
 * @param {number} [props.width] - Initial width in pixels
 * @param {SetRefineSizeFunction} [props.setRefineSizeProps] - Callback to expose size control function
 * @param {[number, number]} [props.minConstraints] - Minimum [width, height] constraints
 * @param {[number, number]} [props.maxConstraints] - Maximum [width, height] constraints
 * @param {string} [props.dialogId] - ID of the drag handle element
 * @param {...PaperProps} props.props - Additional props passed to Material-UI Paper
 *
 * @returns {JSX.Element} The rendered resizable draggable paper component
 */
const ResizeableDraggablePaper = ({
  height: initialHeight,
  width: initialWidth,
  setRefineSizeProps,
  minConstraints,
  maxConstraints,
  dialogId,
  children,
  onResize,
  onDragStart,
  onDragStop,
  ...props
}: ResizeableDraggablePaperProps) => {
  const nodeRef = React.useRef<HTMLDivElement>(null);

  const [height, setHeight] = useState(initialHeight ?? 300);
  const [width, setWidth] = useState(initialWidth ?? 400);

  // Update state when props change (e.g., maximize/minimize)
  React.useEffect(() => {
    if (initialHeight !== undefined && initialHeight !== height) {
      setHeight(initialHeight);
    }
  }, [initialHeight, height]);

  React.useEffect(() => {
    if (initialWidth !== undefined && initialWidth !== width) {
      setWidth(initialWidth);
    }
  }, [initialWidth, width]);

  /**
   * Handles resize events from the ResizableBox component.
   *
   * Updates the internal size state when the user resizes the dialog.
   * Only updates state if the new dimensions are different from current ones
   * to prevent unnecessary re-renders.
   *
   * @function onDialogResize
   * @param {unknown} event - The resize event (unused)
   * @param {object} data - Resize event data
   * @param {object} data.size - New size information
   * @param {number} data.size.width - New width in pixels
   * @param {number} data.size.height - New height in pixels
   */
  const onDialogResize = useCallback(
    (
      event: unknown,
      {
        size: { width: newWidth, height: newHeight },
      }: { size: { width: number; height: number } },
    ) => {
      if (newWidth !== width) {
        setWidth(newWidth);
      }
      if (newHeight !== height) {
        setHeight(newHeight);
      }
      // Trigger the onResize callback if provided
      if (onResize) {
        onResize(newWidth, newHeight);
      }
    },
    [height, width, onResize],
  );

  /**
   * Provides external access to the component's size state and control.
   *
   * This function serves dual purposes:
   * 1. When called with a Size parameter, it updates the component's internal size state
   * 2. When called without parameters, it returns the current size state
   *
   * This enables external components to both read and control the dialog size
   * programmatically, which is useful for features like "restore size" or
   * "maximize/minimize" functionality.
   *
   * @function refineSize
   * @param {Size} [size] - Optional size to set. If provided, updates internal state
   * @param {number} size.width - Width in pixels
   * @param {number} size.height - Height in pixels
   * @returns {Size|void} Current size if no parameter provided, void if setting size
   *
   * @example
   * ```tsx
   * // Get current size
   * const currentSize = refineSize();
   *
   * // Set new size
   * refineSize({ width: 600, height: 400 });
   * ```
   */
  const refineSize = useCallback<RefineSizeFunction>(
    (size?: Size) => {
      if (size) {
        if (height !== size.height) {
          setHeight(size.height);
        }
        if (width !== size.width) {
          setWidth(size.width);
        }
      } else {
        return {
          height,
          width,
        };
      }
    },
    [height, width],
  );

  // Use useEffect to avoid setState during render
  React.useEffect(() => {
    if (setRefineSizeProps) {
      setRefineSizeProps(() => refineSize);
    }
  }, [setRefineSizeProps, refineSize]);

  return (
    <Draggable
      nodeRef={nodeRef as React.RefObject<HTMLDivElement>}
      handle={`#${dialogId ?? 'draggable-dialog'}`}
      cancel={'[class*="MuiDialogContent-root"]'}
      onStart={onDragStart}
      onStop={onDragStop}
    >
      <div ref={nodeRef}>
        <ResizableBox
          className="box"
          width={width}
          height={height}
          minConstraints={minConstraints ?? defaultMinConstraints}
          maxConstraints={maxConstraints ?? defaultMaxConstraints}
          resizeHandles={stableResizeHandles}
          onResize={onDialogResize}
        >
          <Paper
            {...props}
            style={{
              height: `${height}px`,
              width: `${width}px`,
              maxHeight: '100%',
              margin: 0,
            }}
          >
            {children}
          </Paper>
        </ResizableBox>
      </div>
    </Draggable>
  );
};

export default ResizeableDraggablePaper;
