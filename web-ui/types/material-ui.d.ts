/**
 * @fileoverview Material-UI TypeScript type extensions and customizations
 *
 * This module extends the official Material-UI (@mui/material) types with custom
 * properties and interfaces specific to this application's design system.
 * It provides enhanced type safety for Material-UI components while maintaining
 * compatibility with the official library types.
 *
 * @example
 * ```typescript
 * import { Checkbox } from '@mui/material';
 *
 * // Extended Checkbox with custom inputProps support
 * <Checkbox
 *   inputProps={{
 *     'aria-label': 'Custom checkbox'
 *   }}
 * />
 * ```
 */

import '@mui/material';

declare module '@mui/material' {
  /**
   * Extended Checkbox component props with additional input properties support.
   * This interface augments the standard Material-UI CheckboxProps to include
   * enhanced inputProps typing for better accessibility and customization.
   */
  export interface CheckboxProps {
    /**
     * Properties to apply to the underlying input element.
     * Supports standard HTML input attributes and ARIA properties.
     */
    inputProps?: unknown;
  }
}
