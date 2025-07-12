'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Box, IconButton, Paper, styled } from '@mui/material';
import { Resizable } from 'react-resizable';
import CloseIcon from '@mui/icons-material/Close';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import { DockPosition, useChatPanelContext } from './chat-panel-context';

/**
 * Props for the DockedPanel component
 */
export interface DockedPanelProps {
  children: React.ReactNode;
  position: DockPosition;
  onUndock: () => void;
  onFloat: () => void;
  title?: string;
}

/**
 * Styled components
 */
const DockedContainer = styled(Paper, {
  shouldForwardProp: (prop) => !['dockPosition'].includes(prop as string)
})<{ dockPosition: DockPosition }>(({ theme, dockPosition }) => {
  const baseStyles = {
    position: 'fixed' as const,
    zIndex: theme.zIndex.drawer,
    backgroundColor: theme.palette.background.paper,
    borderRadius: 0,
    boxShadow: theme.shadows[8],
    display: 'flex',
    flexDirection: 'column' as const,
  };

  // Position-specific styles
  switch (dockPosition) {
    case 'top':
      return {
        ...baseStyles,
        top: 0,
        left: 0,
        right: 0,
        borderBottom: `1px solid ${theme.palette.divider}`,
      };
    case 'bottom':
      return {
        ...baseStyles,
        bottom: 0,
        left: 0,
        right: 0,
        borderTop: `1px solid ${theme.palette.divider}`,
      };
    case 'left':
      return {
        ...baseStyles,
        top: 0,
        left: 0,
        bottom: 0,
        borderRight: `1px solid ${theme.palette.divider}`,
      };
    case 'right':
      return {
        ...baseStyles,
        top: 0,
        right: 0,
        bottom: 0,
        borderLeft: `1px solid ${theme.palette.divider}`,
      };
    case 'top-left':
      return {
        ...baseStyles,
        top: 0,
        left: 0,
        borderBottom: `1px solid ${theme.palette.divider}`,
        borderRight: `1px solid ${theme.palette.divider}`,
      };
    case 'top-right':
      return {
        ...baseStyles,
        top: 0,
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
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
});

const HeaderControls = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
});

/**
 * Get resize handles based on dock position
 */
const getResizeHandles = (position: DockPosition): string => {
  switch (position) {
    case 'top':
      return 's'; // bottom handle
    case 'bottom':
      return 'n'; // top handle
    case 'left':
      return 'e'; // right handle
    case 'right':
      return 'w'; // left handle
    case 'top-left':
      return 'se'; // bottom-right handle
    case 'top-right':
      return 'sw'; // bottom-left handle
    case 'bottom-left':
      return 'ne'; // top-right handle
    case 'bottom-right':
      return 'nw'; // top-left handle
    default:
      return '';
  }
};

/**
 * Get initial size based on dock position
 */
const getInitialSize = (position: DockPosition, defaultSize: number) => {
  const isVertical = ['left', 'right'].includes(position);
  const isHorizontal = ['top', 'bottom'].includes(position);
  
  if (isVertical) {
    return { width: defaultSize, height: window.innerHeight };
  } else if (isHorizontal) {
    return { width: window.innerWidth, height: defaultSize };
  } else {
    // Corner positions
    return { width: defaultSize, height: defaultSize };
  }
};

/**
 * DockedPanel component that handles docked chat panel positioning and resizing
 */
export const DockedPanel: React.FC<DockedPanelProps> = ({
  children,
  position,
  onUndock,
  onFloat,
  title = 'Chat Panel',
}) => {
  const { config, setDockSize } = useChatPanelContext();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [size, setSize] = useState(() => 
    getInitialSize(position, config.dockSize || 300)
  );

  // Update size when dock size changes
  useEffect(() => {
    setSize(getInitialSize(position, config.dockSize || 300));
  }, [position, config.dockSize]);

  // Handle resize
  const handleResize = useCallback((event: React.SyntheticEvent, { size: newSize }: { size: { width: number; height: number } }) => {
    setSize(newSize);
    
    // Update dock size in context based on position
    let dockSize: number;
    if (['left', 'right'].includes(position)) {
      dockSize = newSize.width;
    } else if (['top', 'bottom'].includes(position)) {
      dockSize = newSize.height;
    } else {
      // Corner positions - use the larger dimension
      dockSize = Math.max(newSize.width, newSize.height);
    }
    
    setDockSize(dockSize);
  }, [position, setDockSize]);

  // Get resize handles for this position
  const resizeHandles = getResizeHandles(position);

  // Create resizable constraints
  const minConstraints: [number, number] = [200, 150];
  const maxConstraints: [number, number] = [
    window.innerWidth * 0.8,
    window.innerHeight * 0.8
  ];

  return (
    <Resizable
      width={size.width}
      height={size.height}
      onResize={handleResize}
      resizeHandles={resizeHandles.split('') as Array<'s' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne'>}
      minConstraints={minConstraints}
      maxConstraints={maxConstraints}
    >
      <DockedContainer
        ref={containerRef}
        dockPosition={position}
        style={{
          width: size.width,
          height: size.height,
        }}
      >
        <DockedHeader>
          <Box sx={{ fontWeight: 'medium', fontSize: '0.875rem' }}>
            {title}
          </Box>
          <HeaderControls>
            <IconButton
              size="small"
              onClick={onFloat}
              aria-label="Float panel"
              sx={{ padding: '2px' }}
            >
              <OpenInFullIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={onUndock}
              aria-label="Close panel"
              sx={{ padding: '2px' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </HeaderControls>
        </DockedHeader>
        <DockedContent>
          {children}
        </DockedContent>
      </DockedContainer>
    </Resizable>
  );
};