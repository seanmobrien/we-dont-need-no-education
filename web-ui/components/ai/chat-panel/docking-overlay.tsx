'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, styled } from '@mui/material';
import { DockPosition } from './chat-panel-context';

/**
 * Docking zone data
 */
export interface DockZone {
  position: DockPosition;
  rect: DOMRect;
  element: HTMLElement;
}

/**
 * Props for the DockingOverlay component
 */
export interface DockingOverlayProps {
  isActive: boolean;
  onDock: (position: DockPosition) => void;
  isDashboardLayout?: boolean;
}

/**
 * Styled components for docking zones
 */
const DockZoneOverlay = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isHighlighted'
})<{ isHighlighted: boolean }>(({ theme, isHighlighted }) => ({
  position: 'fixed',
  backgroundColor: isHighlighted 
    ? theme.palette.primary.main 
    : 'transparent',
  border: `2px dashed ${theme.palette.primary.main}`,
  opacity: isHighlighted ? 0.7 : 0.3,
  transition: 'all 0.2s ease-in-out',
  pointerEvents: 'none',
  zIndex: theme.zIndex.tooltip,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.primary.contrastText,
  fontWeight: 'bold',
  fontSize: '0.875rem',
}));

/**
 * Docking zone positions and their configurations
 * Using percentage-based zones that are easier to calculate
 */
const DOCK_ZONES = {
  // Edge zones
  top: { 
    getRect: () => ({ 
      left: 0, 
      top: 0, 
      width: window.innerWidth, 
      height: 80 
    }), 
    label: 'Dock Top' 
  },
  bottom: { 
    getRect: () => ({ 
      left: 0, 
      top: window.innerHeight - 80, 
      width: window.innerWidth, 
      height: 80 
    }), 
    label: 'Dock Bottom' 
  },
  left: { 
    getRect: () => ({ 
      left: 0, 
      top: 80, 
      width: 80, 
      height: window.innerHeight - 160 
    }), 
    label: 'Dock Left' 
  },
  right: { 
    getRect: () => ({ 
      left: window.innerWidth - 80, 
      top: 80, 
      width: 80, 
      height: window.innerHeight - 160 
    }), 
    label: 'Dock Right' 
  },
  
  // Corner zones
  'top-left': { 
    getRect: () => ({ 
      left: 0, 
      top: 0, 
      width: 80, 
      height: 80 
    }), 
    label: 'Top Left' 
  },
  'top-right': { 
    getRect: () => ({ 
      left: window.innerWidth - 80, 
      top: 0, 
      width: 80, 
      height: 80 
    }), 
    label: 'Top Right' 
  },
  'bottom-left': { 
    getRect: () => ({ 
      left: 0, 
      top: window.innerHeight - 80, 
      width: 80, 
      height: 80 
    }), 
    label: 'Bottom Left' 
  },
  'bottom-right': { 
    getRect: () => ({ 
      left: window.innerWidth - 80, 
      top: window.innerHeight - 80, 
      width: 80, 
      height: 80 
    }), 
    label: 'Bottom Right' 
  },
} as const;


/**
 * Calculate zone bounds for dashboard layout
 */
const getDashboardZoneBounds = (zone: typeof DOCK_ZONES[keyof typeof DOCK_ZONES], dashboardRect: DOMRect) => {
  const rect = zone.getRect();
  
  // For dashboard layout, adjust zones to be relative to dashboard container
  return {
    left: Math.max(rect.left, dashboardRect.left),
    top: Math.max(rect.top, dashboardRect.top),
    width: Math.min(rect.width, dashboardRect.width),
    height: Math.min(rect.height, dashboardRect.height),
  };
};

/**
 * DockingOverlay component that shows docking zones during drag operations
 */
export const DockingOverlay: React.FC<DockingOverlayProps> = ({ 
  isActive, 
  onDock, 
  isDashboardLayout = false 
}) => {
  const [highlightedZone, setHighlightedZone] = useState<DockPosition | null>(null);
  const dashboardRef = useRef<HTMLElement | null>(null);

  // Find dashboard container when in dashboard layout
  useEffect(() => {
    if (isDashboardLayout) {
      // Look for the dashboard container - adjust selector as needed
      const dashboard = document.querySelector('[role="main"]') as HTMLElement ||
                       document.querySelector('.MuiContainer-root') as HTMLElement ||
                       document.body;
      dashboardRef.current = dashboard;
    }
  }, [isDashboardLayout]);

  // Handle mouse movement to determine highlighted zone
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isActive) return;

    const { clientX: x, clientY: y } = event;

    // Check which zone the mouse is in
    let foundZone: DockPosition | null = null;
    
    for (const [position, zone] of Object.entries(DOCK_ZONES)) {
      let rect;
      if (isDashboardLayout && dashboardRef.current) {
        rect = getDashboardZoneBounds(zone, dashboardRef.current.getBoundingClientRect());
      } else {
        rect = zone.getRect();
      }
        
      if (x >= rect.left && x <= rect.left + rect.width && y >= rect.top && y <= rect.top + rect.height) {
        foundZone = position as DockPosition;
        break;
      }
    }

    setHighlightedZone(foundZone);
  }, [isActive, isDashboardLayout]);

  // Handle mouse up to trigger docking
  const handleMouseUp = useCallback(() => {
    if (highlightedZone && highlightedZone !== 'inline' && highlightedZone !== 'floating') {
      onDock(highlightedZone);
    }
    setHighlightedZone(null);
  }, [highlightedZone, onDock]);

  // Add/remove event listeners
  useEffect(() => {
    if (!isActive) {
      setHighlightedZone(null);
      return;
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isActive, handleMouseMove, handleMouseUp]);

  if (!isActive) {
    return null;
  }

  return (
    <>
      {Object.entries(DOCK_ZONES).map(([position, zone]) => {
        const dockPosition = position as DockPosition;
        const isHighlighted = highlightedZone === dockPosition;
        
        // Calculate final zone bounds
        let rect;
        if (isDashboardLayout && dashboardRef.current) {
          rect = getDashboardZoneBounds(zone, dashboardRef.current.getBoundingClientRect());
        } else {
          rect = zone.getRect();
        }

        return (
          <DockZoneOverlay
            key={position}
            isHighlighted={isHighlighted}
            sx={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            }}
          >
            {isHighlighted && zone.label}
          </DockZoneOverlay>
        );
      })}
    </>
  );
};

/**
 * Hook to use docking functionality
 */
export const useDocking = () => {
  const [isDragging, setIsDragging] = useState(false);

  const startDragging = useCallback(() => {
    setIsDragging(true);
  }, []);

  const stopDragging = useCallback(() => {
    setIsDragging(false);
  }, []);

  return {
    isDragging,
    startDragging,
    stopDragging,
  };
};