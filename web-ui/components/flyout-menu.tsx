'use client';

import React, { useState, useRef, useCallback } from 'react';
import { MenuItem, ListItemIcon, ListItemText, Menu } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import {
  stableAnchorOrigin,
  stableTransformOrigin,
} from '@/components/flyout-props';

export interface FlyoutMenuProps {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  dataTestId?: string;
  isOpen: boolean;
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
