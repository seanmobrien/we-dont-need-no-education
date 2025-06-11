'use client';
import React, { useState, useCallback } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListSubheader,
  Tooltip,
} from '@mui/material';
import { Palette as PaletteIcon } from '@mui/icons-material';
import { useTheme } from '@/lib/themes/provider';
import { ThemeType, themeDisplayNames } from '@/lib/themes/definitions';

export const ThemeSelector = () => {
  const { currentTheme, setTheme } = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleThemeSelect = useCallback((themeType: ThemeType) => {
    setTheme(themeType);
    handleClose();
  }, [setTheme, handleClose]);

  const availableThemes: ThemeType[] = ['dark', 'colorful'];

  return (
    <>
      <Tooltip title="Change Theme">
        <IconButton
          edge="end"
          onClick={handleMenuClick}
          id="theme-selector-button"
          aria-controls={open ? 'theme-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
        >
          <PaletteIcon />
        </IconButton>
      </Tooltip>
      <Menu
        id="theme-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          list: {
            'aria-labelledby': 'theme-selector-button',
          },
        }}
      >
        <ListSubheader>{`Current: ${themeDisplayNames[currentTheme]}`}</ListSubheader>
        {availableThemes.map((themeType) => (
          <MenuItem
            key={themeType}
            onClick={() => handleThemeSelect(themeType)}
            selected={themeType === currentTheme}
          >
            {themeDisplayNames[themeType]}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};