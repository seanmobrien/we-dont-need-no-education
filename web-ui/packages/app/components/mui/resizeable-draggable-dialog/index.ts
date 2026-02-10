/**
 * @fileoverview Entry point for the resizable draggable dialog component library.
 * This module provides the main export for the ResizableDraggableDialog component
 * and serves as the public API for the dialog system.
 *
 * The component library provides a complete solution for creating interactive dialogs
 * with resize and drag capabilities built on top of Material-UI components.
 *
 * @author NoEducation Team
 * @version 1.0.0
 * @since 2025-07-07
 *
 * @example
 * ```tsx
 * import ResizableDraggableDialog from '@/components/mui/resizeable-draggable-dialog';
 *
 * function MyComponent() {
 *   const [isOpen, setIsOpen] = useState(false);
 *
 *   return (
 *     <ResizableDraggableDialog
 *       isOpenState={[isOpen, setIsOpen]}
 *       title="Interactive Dialog"
 *       modal={false}
 *       initialWidth={600}
 *       initialHeight={400}
 *     >
 *       <p>This dialog can be resized and dragged!</p>
 *     </ResizableDraggableDialog>
 *   );
 * }
 * ```
 *
 * @module ResizableDraggableDialog
 */

import ResizableDraggableDialog from './dialog';

/**
 * The main resizable draggable dialog component.
 *
 * This is the primary export that combines all the functionality of the dialog system
 * into a single, easy-to-use component. It includes:
 * - Drag functionality with customizable handle
 * - Resize capabilities with configurable constraints
 * - Modal and non-modal modes
 * - Material-UI theming integration
 * - Accessibility features
 *
 * @component
 * @default
 */
export default ResizableDraggableDialog;

// Re-export types for convenience
export type {
  Size,
  RefineSizeFunction,
  SetRefineSizeFunction,
  ResizeableDraggablePaperProps,
  ResizeableDraggableDialogProps,
} from './types';

export { isValidSize } from './types';
