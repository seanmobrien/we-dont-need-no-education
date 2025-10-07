/**
 * @fileoverview Memory Status Indicator Styles
 *
 * Pre-computed stable sx objects for memory status indicators.
 * Generated at module load time for zero runtime object creation.
 *
 * @module components/memory-status/memory-status-styles
 */

import type { Theme } from '@mui/material';

/**
 * Status color variants that map to Material-UI theme colors
 */
type StatusColor = 'success' | 'warning' | 'error' | 'default';

/**
 * Size variants for the memory status indicator
 */
type Size = 'small' | 'medium';

/**
 * Creates a Box sx object for the given status color and size
 *
 * @param status - The status color variant
 * @param size - The size variant
 * @returns Pre-configured sx object for Material-UI Box
 */
function createBoxSx(status: StatusColor, size: Size) {
  const sizeProps =
    size === 'small'
      ? { minWidth: 24, minHeight: 24 }
      : { minWidth: 32, minHeight: 32 };

  const colorProp =
    status === 'default'
      ? (theme: Theme) => theme.palette.text.primary
      : (theme: Theme) => theme.palette[status].main;

  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...sizeProps,
    borderRadius: 1,
    cursor: 'pointer',
    color: colorProp,
    '&:hover': {
      backgroundColor: 'action.hover',
    },
  } as const;
}

/**
 * All possible status-size combinations generated at module load time.
 * Zero object creation during React renders!
 */
export const BOX_SX_VARIANTS = {
  'success-small': createBoxSx('success', 'small'),
  'success-medium': createBoxSx('success', 'medium'),
  'warning-small': createBoxSx('warning', 'small'),
  'warning-medium': createBoxSx('warning', 'medium'),
  'error-small': createBoxSx('error', 'small'),
  'error-medium': createBoxSx('error', 'medium'),
  'default-small': createBoxSx('default', 'small'),
  'default-medium': createBoxSx('default', 'medium'),
} as const;

/**
 * Type for accessing BOX_SX_VARIANTS keys in a type-safe manner
 */
export type BoxSxVariantKey = keyof typeof BOX_SX_VARIANTS;
