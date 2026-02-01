'use client';

import React, { useState, useRef, useCallback } from 'react';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import {
  stableAnchorOrigin,
  stableTransformOrigin,
} from '@/components/flyout-props';

/**
 * Props for the FlyoutMenu component.
 *
 * The FlyoutMenu is a menu item that, when hovered or clicked, opens a flyout submenu.
 * State management for the open/close behavior is controlled externally via the `isOpen` and `onHover` props.
 */
export interface FlyoutMenuProps {
  /**
   * The label text to display for the menu item.
   */
  label: string;
  /**
   * Optional icon to display alongside the label.
   */
  icon?: React.ReactNode;
  /**
   * The submenu content to render inside the flyout.
   */
  children: React.ReactNode;
  /**
   * If true, the menu item is visually marked as active/selected.
   */
  active?: boolean;
  /**
   * Optional test id for querying in tests.
   */
  dataTestId?: string;
  /**
   * Controls whether the flyout menu is open.
   * This prop is managed externally to support controlled open/close state.
   */
  isOpen: boolean;
  /**
   * Callback invoked when the menu item is hovered or clicked.
   * Used to notify the parent to update the open/close state.
   */
  onHover: () => void;
}

export const FlyoutMenu = ({
  label,
  icon,
  children,
  active,
  dataTestId,
  isOpen,
  onHover,
}: FlyoutMenuProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuItemRef = useRef<HTMLLIElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (menuItemRef.current) {
      setAnchorEl(menuItemRef.current);
    }
    onHover();
  }, [onHover]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      handleMouseEnter();
    },
    [handleMouseEnter],
  );

  return (
    <>
      <MenuItem
        ref={menuItemRef}
        onMouseEnter={handleMouseEnter}
        onClick={handleClick}
        selected={active}
        data-testid={dataTestId}
      >
        <ChevronLeftIcon fontSize="small" sx={{ ml: 'auto' }} />
        <ListItemIcon>{icon}</ListItemIcon>
        <ListItemText>{label}</ListItemText>
      </MenuItem>
      <Menu
        anchorEl={anchorEl}
        open={isOpen && Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={stableAnchorOrigin}
        transformOrigin={stableTransformOrigin}
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        slotProps={{
          backdrop: {
            invisible: true,
            sx: { pointerEvents: 'none' },
          },
        }}
        style={{ pointerEvents: 'none' }}
        PaperProps={{
          style: { pointerEvents: 'auto' },
        }}
      >
        {children}
      </Menu>
    </>
  );
};
