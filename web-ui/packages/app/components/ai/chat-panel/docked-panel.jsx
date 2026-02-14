'use client';
import React, { useCallback, useState, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';
import { Resizable } from 'react-resizable';
import CloseIcon from '@mui/icons-material/Close';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import { useChatPanelContext } from './chat-panel-context';
const DockedContainer = styled(Paper, {
    shouldForwardProp: (prop) => !['dockPosition'].includes(prop)
})(({ theme, dockPosition }) => {
    const baseStyles = {
        position: 'fixed',
        zIndex: theme.zIndex.drawer,
        backgroundColor: theme.palette.background.paper,
        borderRadius: 0,
        boxShadow: theme.shadows[8],
        display: 'flex',
        flexDirection: 'column',
    };
    const headerHeight = 64;
    switch (dockPosition) {
        case 'top':
            return {
                ...baseStyles,
                top: headerHeight,
                left: 0,
                right: 0,
                maxHeight: `calc(50vh - ${headerHeight}px)`,
                borderBottom: `1px solid ${theme.palette.divider}`,
            };
        case 'bottom':
            return {
                ...baseStyles,
                bottom: 0,
                left: 0,
                right: 0,
                maxHeight: '50vh',
                borderTop: `1px solid ${theme.palette.divider}`,
            };
        case 'left':
            return {
                ...baseStyles,
                top: headerHeight,
                left: 0,
                bottom: 0,
                borderRight: `1px solid ${theme.palette.divider}`,
            };
        case 'right':
            return {
                ...baseStyles,
                top: headerHeight,
                right: 0,
                bottom: 0,
                borderLeft: `1px solid ${theme.palette.divider}`,
            };
        case 'top-left':
            return {
                ...baseStyles,
                top: headerHeight,
                left: 0,
                borderBottom: `1px solid ${theme.palette.divider}`,
                borderRight: `1px solid ${theme.palette.divider}`,
            };
        case 'top-right':
            return {
                ...baseStyles,
                top: headerHeight,
                right: 0,
                borderBottom: `1px solid ${theme.palette.divider}`,
                borderLeft: `1px solid ${theme.palette.divider}`,
            };
        case 'bottom-left':
            return {
                ...baseStyles,
                bottom: 0,
                left: 0,
                borderTop: `1px solid ${theme.palette.divider}`,
                borderRight: `1px solid ${theme.palette.divider}`,
            };
        case 'bottom-right':
            return {
                ...baseStyles,
                bottom: 0,
                right: 0,
                borderTop: `1px solid ${theme.palette.divider}`,
                borderLeft: `1px solid ${theme.palette.divider}`,
            };
        default:
            return baseStyles;
    }
});
const DockedHeader = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.grey[100],
    borderBottom: `1px solid ${theme.palette.divider}`,
    minHeight: 40,
    '&:hover': {
        backgroundColor: theme.palette.grey[200],
    },
}));
const DockedContent = styled(Box)({
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
});
const HeaderControls = styled(Box)({
    display: 'flex',
    alignItems: 'center',
    gap: 4,
});
const getResizeHandles = (position) => {
    switch (position) {
        case 'top':
            return 's';
        case 'bottom':
            return 'n';
        case 'left':
            return 'e';
        case 'right':
            return 'w';
        case 'top-left':
            return 'se';
        case 'top-right':
            return 'sw';
        case 'bottom-left':
            return 'ne';
        case 'bottom-right':
            return 'nw';
        default:
            return '';
    }
};
const getInitialSize = (position, defaultSize) => {
    const isVertical = ['left', 'right'].includes(position);
    const isHorizontal = ['top', 'bottom'].includes(position);
    if (isVertical) {
        return { width: defaultSize, height: window.innerHeight };
    }
    else if (isHorizontal) {
        return { width: window.innerWidth, height: defaultSize };
    }
    else {
        return { width: defaultSize, height: defaultSize };
    }
};
export const DockedPanel = ({ children, position, onUndock, onFloat, title = 'Chat Panel', }) => {
    const { config, setDockSize } = useChatPanelContext();
    const containerRef = useRef(null);
    const [size, setSize] = useState(() => getInitialSize(position, config.dockSize || 300));
    useEffect(() => {
        setSize(getInitialSize(position, config.dockSize || 300));
    }, [position, config.dockSize]);
    const handleResize = useCallback((event, { size: newSize }) => {
        setSize(newSize);
        let dockSize;
        if (['left', 'right'].includes(position)) {
            dockSize = newSize.width;
        }
        else if (['top', 'bottom'].includes(position)) {
            dockSize = newSize.height;
        }
        else {
            dockSize = Math.max(newSize.width, newSize.height);
        }
        setDockSize(dockSize);
    }, [position, setDockSize]);
    const resizeHandles = getResizeHandles(position);
    const minConstraints = [200, 150];
    const maxConstraints = [
        window.innerWidth * 0.8,
        window.innerHeight * 0.8
    ];
    return (<Resizable width={size.width} height={size.height} onResize={handleResize} resizeHandles={resizeHandles.split('')} minConstraints={minConstraints} maxConstraints={maxConstraints}>
      <DockedContainer ref={containerRef} dockPosition={position} style={{
            width: size.width,
            height: size.height,
        }}>
        <DockedHeader>
          <Box sx={{ fontWeight: 'medium', fontSize: '0.875rem' }}>
            {title}
          </Box>
          <HeaderControls>
            <IconButton size="small" onClick={onFloat} aria-label="Float panel" sx={{ padding: '2px' }}>
              <OpenInFullIcon fontSize="small"/>
            </IconButton>
            <IconButton size="small" onClick={onUndock} aria-label="Close panel" sx={{ padding: '2px' }}>
              <CloseIcon fontSize="small"/>
            </IconButton>
          </HeaderControls>
        </DockedHeader>
        <DockedContent>
          {children}
        </DockedContent>
      </DockedContainer>
    </Resizable>);
};
//# sourceMappingURL=docked-panel.jsx.map