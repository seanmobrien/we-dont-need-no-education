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
import { ResizableBox, ResizeHandle } from 'react-resizable';
import { useCallback } from 'react';
import type {
  ResizeableDraggablePaperProps,
} from './types';
import 'react-resizable/css/styles.css';

/**
 * Default resize handles configuration for the resizable component.
 * Includes all 8 directional handles: corners and edges.
 * @constant {string[]}
 */
const stableResizeHandles: ResizeHandle[] = ['sw', 'se', 'nw', 'ne', 'w', 'e', 'n', 's'] as const;

/**
 * Default minimum size constraints [width, height] in pixels.
 * Ensures the dialog remains usable at small sizes.
 * @constant {[number, number]}
 */
const defaultMinConstraints: [number, number] | undefined = [200, 200] as const;

/**
 * Default maximum size constraints [width, height] in pixels.
 * Prevents the dialog from becoming too large on small screens.
 * @constant {[number, number]}
 */
const defaultMaxConstraints: [number, number] | undefined = undefined;

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
 * const [height, setHeight] = useState(400);
 * const [width, setWidth] = useState(600);
 * const onResize = useCallback((height: number, width: number) => {
 *   setHeight(height);
 *   setWidth(width);
 * });
 *
 * <ResizeableDraggablePaper
 *   height={400}
 *   width={600}
 *   onResize={onResize}
 *   minConstraints={[200, 150]}
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
  height,
  width,
  /*
  height: initialHeight,
  width: initialWidth,
  setRefineSizeProps,
  */
  minConstraints,
  maxConstraints,
  dialogId,
  children,
  onResize,
  ...props
}: ResizeableDraggablePaperProps) => {
  const nodeRef = React.useRef<HTMLDivElement>(null);
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
      // Trigger the onResize callback to notify parent
      // of resize request; note parent maintains state through
      // this callback, we may want to consider making it non-optional
      onResize?.(newWidth, newHeight);
    },
    [onResize],
  );
  
  return (
    <Draggable
      nodeRef={nodeRef as React.RefObject<HTMLDivElement>}
      handle={`#${dialogId ?? 'draggable-dialog'}`}
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
              maxWidth: '100%',
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
