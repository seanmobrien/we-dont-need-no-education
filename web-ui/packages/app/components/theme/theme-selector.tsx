'use client';
import React, { useState, useMemo } from 'react';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListSubheader from '@mui/material/ListSubheader';
import Tooltip from '@mui/material/Tooltip';
import PaletteIcon from '@mui/icons-material/Palette';
import { type ThemeType } from '@compliance-theater/themes';
import { themeDisplayNames } from '@compliance-theater/themes';
import { useTheme } from '@compliance-theater/themes';

const availableThemes: ThemeType[] = ['dark', 'light'] as const;
const origins = {
  anchor: {
    vertical: 'bottom',
    horizontal: 'right',
  },
  transform: {
    vertical: 'top',
    horizontal: 'right',
  },
} as const;
const slotProps = {
  list: {
    'aria-labelledby': 'theme-selector-button',
  },
} as const;

export const ThemeSelector = () => {
  const { currentTheme, setTheme } = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const { handleMenuClick, handleThemeSelect } = useMemo(() => {
    const handleMenuClick = (
      { currentTarget }: { currentTarget?: HTMLElement; data?: string } = {
        currentTarget: undefined,
      },
      reason?: 'backdropClick' | 'escapeKeyDown',
    ) => {
      const newAnchorEl =
        reason === 'backdropClick' ||
        reason === 'escapeKeyDown' ||
        !currentTarget
          ? null
          : currentTarget;
      if (!Object.is(anchorEl, newAnchorEl)) {
        setAnchorEl(newAnchorEl);
      }
    };

    const handleThemeSelect = ({
      currentTarget,
    }: React.MouseEvent<HTMLElement>) => {
      const themeType = currentTarget?.dataset?.theme as ThemeType;
      if (!!themeType && currentTheme !== themeType) {
        setTheme(themeType);
        document.cookie = `theme=${encodeURIComponent(themeType)}; path=/; max-age=31536000`;
      }
      handleMenuClick();
    };
    return {
      handleMenuClick,
      handleThemeSelect,
    };
  }, [anchorEl, currentTheme, setTheme]);

  return (
    <>
      <Tooltip title="Change Theme">
        <IconButton
          edge="end"
          onClick={handleMenuClick}
          data-id="theme-selector-button"
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
        data-id="menu-theme-selector"
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClick}
        anchorOrigin={origins.anchor}
        transformOrigin={origins.transform}
        slotProps={slotProps}
      >
        <ListSubheader>{`Current: ${themeDisplayNames[currentTheme]}`}</ListSubheader>
        {availableThemes.map((themeType) => (
          <MenuItem
            data-id={`menu-id-theme-selector-${themeType}`}
            key={themeType}
            data-theme={themeType as string}
            onClick={handleThemeSelect}
            selected={themeType === currentTheme}
          >
            {themeDisplayNames[themeType]}
          </MenuItem>
        ))}
        <ListSubheader>{`Current: ${themeDisplayNames[currentTheme]}`}</ListSubheader>
        {availableThemes.map((themeType) => (
          <MenuItem
            data-id={`menu-id-theme-selector-${themeType}`}
            key={themeType}
            data-theme={themeType as string}
            onClick={handleThemeSelect}
            selected={themeType === currentTheme}
          >
            {themeDisplayNames[themeType]}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
