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
 * Zone labels for display
 */
const ZONE_LABELS = {
  top: 'Dock Top',
  bottom: 'Dock Bottom', 
  left: 'Dock Left',
  right: 'Dock Right',
  'top-left': 'Top Left',
  'top-right': 'Top Right',
  'bottom-left': 'Bottom Left',
  'bottom-right': 'Bottom Right',
} as const;

/**
 * Get docking zone rect based on current window dimensions
 */
const getDockZoneRect = (zoneName: keyof typeof DOCK_ZONES, windowWidth: number, windowHeight: number) => {
  switch (zoneName) {
    case 'top':
      return { left: 0, top: 0, width: windowWidth, height: 100 };
    case 'bottom':
      return { left: 0, top: windowHeight - 100, width: windowWidth, height: 100 };
    case 'left':
      return { left: 0, top: 100, width: 100, height: windowHeight - 200 };
    case 'right':
      return { left: windowWidth - 100, top: 100, width: 100, height: windowHeight - 200 };
    case 'top-left':
      return { left: 0, top: 0, width: 100, height: 100 };
    case 'top-right':
      return { left: windowWidth - 100, top: 0, width: 100, height: 100 };
    case 'bottom-left':
      return { left: 0, top: windowHeight - 100, width: 100, height: 100 };
    case 'bottom-right':
      return { left: windowWidth - 100, top: windowHeight - 100, width: 100, height: 100 };
    default:
      return { left: 0, top: 0, width: 0, height: 0 };
  }
};


/**
 * Calculate zone bounds for dashboard layout
 */
const getDashboardZoneBounds = (zone: { getRect: () => { left: number; top: number; width: number; height: number }, label: string }, dashboardRect: DOMRect) => {
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
  const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 });
  const dashboardRef = useRef<HTMLElement | null>(null);

  // Update window dimensions
  useEffect(() => {
    const updateDimensions = () => {
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

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
    if (!isActive || windowDimensions.width === 0 || windowDimensions.height === 0) return;

    const { clientX: x, clientY: y } = event;

    // Check which zone the mouse is in
    let foundZone: DockPosition | null = null;
    
    for (const zoneName of Object.keys(ZONE_LABELS) as Array<keyof typeof ZONE_LABELS>) {
      let rect;
      if (isDashboardLayout && dashboardRef.current) {
        const baseRect = getDockZoneRect(zoneName, windowDimensions.width, windowDimensions.height);
        rect = getDashboardZoneBounds({ getRect: () => baseRect, label: ZONE_LABELS[zoneName] }, dashboardRef.current.getBoundingClientRect());
      } else {
        rect = getDockZoneRect(zoneName, windowDimensions.width, windowDimensions.height);
      }
        
      if (x >= rect.left && x <= rect.left + rect.width && y >= rect.top && y <= rect.top + rect.height) {
        foundZone = zoneName as DockPosition;
        break;
      }
    }

    setHighlightedZone(foundZone);
  }, [isActive, isDashboardLayout, windowDimensions.width, windowDimensions.height]);

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
      {Object.keys(ZONE_LABELS).map((zoneName) => {
        const dockPosition = zoneName as DockPosition;
        const isHighlighted = highlightedZone === dockPosition;
        
        // Calculate final zone bounds
        let rect;
        if (isDashboardLayout && dashboardRef.current) {
          const baseRect = getDockZoneRect(dockPosition, windowDimensions.width, windowDimensions.height);
          rect = getDashboardZoneBounds({ getRect: () => baseRect, label: ZONE_LABELS[dockPosition] }, dashboardRef.current.getBoundingClientRect());
        } else {
          rect = getDockZoneRect(dockPosition, windowDimensions.width, windowDimensions.height);
        }

        return (
          <DockZoneOverlay
            key={zoneName}
            isHighlighted={isHighlighted}
            sx={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            }}
          >
            {isHighlighted && ZONE_LABELS[dockPosition]}
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