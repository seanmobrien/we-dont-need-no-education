'use client';
import React, { useState, useRef, useCallback } from 'react';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { stableAnchorOrigin, stableTransformOrigin, } from '@/components/flyout-props';
export const FlyoutMenu = ({ label, icon, children, active, dataTestId, isOpen, onHover, }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const menuItemRef = useRef(null);
    const handleMouseEnter = useCallback(() => {
        if (menuItemRef.current) {
            setAnchorEl(menuItemRef.current);
        }
        onHover();
    }, [onHover]);
    const handleClick = useCallback((e) => {
        e.stopPropagation();
        handleMouseEnter();
    }, [handleMouseEnter]);
    return (<>
      <MenuItem ref={menuItemRef} onMouseEnter={handleMouseEnter} onClick={handleClick} selected={active} data-testid={dataTestId}>
        <ChevronLeftIcon fontSize="small" sx={{ ml: 'auto' }}/>
        <ListItemIcon>{icon}</ListItemIcon>
        <ListItemText>{label}</ListItemText>
      </MenuItem>
      <Menu anchorEl={anchorEl} open={isOpen && Boolean(anchorEl)} onClose={() => setAnchorEl(null)} anchorOrigin={stableAnchorOrigin} transformOrigin={stableTransformOrigin} disableAutoFocus disableEnforceFocus disableRestoreFocus slotProps={{
            backdrop: {
                invisible: true,
                sx: { pointerEvents: 'none' },
            },
        }} style={{ pointerEvents: 'none' }} PaperProps={{
            style: { pointerEvents: 'auto' },
        }}>
        {children}
      </Menu>
    </>);
};
//# sourceMappingURL=flyout-menu.jsx.map