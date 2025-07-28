/**
 * @fileoverview Type definitions for the resizable draggable dialog component system.
 * This module contains all TypeScript interfaces, types, and type utilities used
 * throughout the resizable draggable dialog components.
 *
 * The type system is designed to provide strong typing for:
 * - Size management and constraints
 * - Component props with proper Material-UI integration
 * - Callback functions for external size control
 * - Dialog configuration options
 *
 * @author NoEducation Team
 * @version 1.0.0
 * @since 2025-07-07
 */

import { DialogProps } from '@mui/material/Dialog';
import { PaperProps } from '@mui/material/Paper';
import React, { JSX, PropsWithChildren } from 'react';
import DialogAction from '@mui/material/DialogActions';
import { FirstParameter } from '@/lib/typescript';
type DialogActionProps = FirstParameter<typeof DialogAction>;
/**
 * Represents the dimensions of a dialog or component.
 *
 * @interface Size
 * @property {number} height - Height in pixels
 * @property {number} width - Width in pixels
 *
 * @example
 * ```tsx
 * const dialogSize: Size = { height: 400, width: 600 };
 * ```
 */
export type Pixels = number & { __brand: 'pixels' };
export type Size = { height: Pixels; width: Pixels };

/**
 * Function type for reading or setting component size.
 *
 * This type supports two modes of operation:
 * 1. Getter mode: Called without parameters, returns current size
 * 2. Setter mode: Called with Size parameter, updates the size
 *
 * @typedef {Function} RefineSizeFunction
 * @param {Size} [size] - Optional size to set
 * @returns {Size|void} Current size when called as getter, void when called as setter
 *
 * @example
 * ```tsx
 * // As getter
 * const currentSize = refineSizeFunction();
 *
 * // As setter
 * refineSizeFunction({ width: 500, height: 300 });
 * ```
 */
export type RefineSizeFunction = (() => Size) | ((size: Size) => void);

/**
 * React state setter type for the RefineSizeFunction.
 *
 * This type is used to pass the ability to set the refine size function
 * from child components back to parent components, enabling external
 * control of dialog sizing.
 *
 * @typedef {React.Dispatch<React.SetStateAction<RefineSizeFunction>>} SetRefineSizeFunction
 *
 * @example
 * ```tsx
 * const [refineSizeFunction, setRefineSizeFunction] = useState<RefineSizeFunction>();
 *
 * // Pass to child component
 * <ResizeableDraggablePaper setRefineSizeProps={setRefineSizeFunction} />
 * ```
 */
export type SetRefineSizeFunction = React.Dispatch<
  React.SetStateAction<RefineSizeFunction>
>;

/**
 * Props interface for the ResizeableDraggablePaper component.
 *
 * Extends Material-UI PaperProps while adding resize and drag-specific properties.
 * This interface ensures type safety when configuring the interactive paper component.
 *
 * @interface ResizeableDraggablePaperProps
 * @extends {PaperProps}
 * @property {number} [height] - Initial height in pixels
 * @property {number} [width] - Initial width in pixels
 * @property {[number, number]} [minConstraints] - Minimum [width, height] constraints
 * @property {[number, number]} [maxConstraints] - Maximum [width, height] constraints
 * @property {SetRefineSizeFunction} [setRefineSizeProps] - Callback for external size control
 * @property {string} [dialogId] - ID of the drag handle element
 *
 * @example
 * ```tsx
 * const paperProps: ResizeableDraggablePaperProps = {
 *   height: 400,
 *   width: 600,
 *   minConstraints: [200, 150],
 *   maxConstraints: [1000, 800],
 *   elevation: 3
 * };
 * ```
 */
export type ResizeableDraggablePaperProps = PaperProps & {
  height: number;
  width: number;
  minConstraints?: [number, number];
  maxConstraints?: [number, number];
  dialogId?: string;
  onResize?: (width: number, height: number) => void;
};

/**
 * Props interface for the ResizeableDraggableDialog component.
 *
 * Extends Material-UI DialogProps while providing additional configuration
 * for resize/drag behavior, modal settings, and size management.
 *
 * @interface ResizeableDraggableDialogProps
 * @extends {PropsWithChildren<Omit<DialogProps, 'hideBackdrop' | 'disableEnforceFocus'>>}
 * @property {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} isOpenState - Dialog open state tuple
 * @property {Omit<ResizeableDraggablePaperProps, 'setRefineSizeProps' | 'width' | 'height' | 'minConstraints' | 'maxConstraints' | 'dialogId'>} [paperProps] - Props for underlying paper component
 * @property {boolean} [modal] - Whether dialog should be modal (blocking background interaction)
 * @property {() => typeof DialogActions} [dialogActions] - Function returning dialog actions component
 * @property {SetRefineSizeFunction} [setRefineSizeProps] - Callback for external size control
 * @property {number} [initialHeight] - Initial height in pixels
 * @property {number} [initialWidth] - Initial width in pixels
 * @property {[number, number]} [minConstraints] - Minimum size constraints
 * @property {[number, number]} [maxConstraints] - Maximum size constraints
 *
 * @example
 * ```tsx
 * const dialogProps: ResizeableDraggableDialogProps = {
 *   isOpenState: [isOpen, setIsOpen],
 *   title: "My Dialog",
 *   modal: false,
 *   initialWidth: 500,
 *   initialHeight: 400,
 *   minConstraints: [300, 200],
 *   children: <div>Dialog content</div>
 * };
 * ```
 */
export type ResizeableDraggableDialogProps = PropsWithChildren<
  Omit<DialogProps, 'open' | 'hideBackdrop' | 'disableEnforceFocus' | 'onClose'> & {    
    isOpenState: boolean;
    paperProps?: Omit<
      ResizeableDraggablePaperProps,
      | 'setRefineSizeProps'
      | 'width'
      | 'height'
      | 'minConstraints'
      | 'maxConstraints'
      | 'dialogId'
    >;
    modal?: boolean;
    dialogActions?: (props: DialogActionProps) => JSX.Element;    
    /**
     * @deprecated I dont know if we want to set this from here?
     */
    initialHeight?: number;
    /**
     * @deprecated I dont know if we want to set this from here?
     */
    initialWidth?: number;
    height?: number;
    width?: number;
    minConstraints?: [number, number];
    maxConstraints?: [number, number];
    /**
     * Called to notify parent of new height/width
     * @param width {number} The new width.
     * @param height {number} The new height.     
     */
    onResize?: (width: number, height: number) => void;
    /**
     * Called to notify parent of a dialog close event
     * @param evt {Event} The event that triggered the close.
     * @param reason {string} The reason for the close, such as 'backdropClick' or 'escapeKeyDown'.
     */
    onClose: (evt: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, reason: 'backdropClick' | 'escapeKeyDown' | '') => void;
  }
>;


/**
 * Runtime validation function for Size type.
 *
 * This function checks if the given size object conforms to the Size interface,
 * ensuring that height and width are positive numbers.
 *
 * @function isValidSize
 * @param {unknown} size - The size object to validate
 * @returns {boolean} True if size is valid, false otherwise
 *
 * @example
 * ```tsx
 * const sizeToTest = { height: 400, width: 600 };
 * const isValid = isValidSize(sizeToTest); // true
 * ```
 */
export const isValidSize = (size: unknown): size is Size => {
  return (
    typeof size === 'object' &&
    size !== null &&
    'height' in size &&
    'width' in size &&
    typeof size.height === 'number' &&
    typeof size.width === 'number' &&
    size.height > 0 &&
    size.width > 0
  );
};
