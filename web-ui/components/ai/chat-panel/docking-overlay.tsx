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
 */
const DOCK_ZONES = {
  // Edge zones
  top: { top: 0, left: 0, right: 0, height: 80, label: 'Dock Top' },
  bottom: { bottom: 0, left: 0, right: 0, height: 80, label: 'Dock Bottom' },
  left: { top: 80, bottom: 80, left: 0, width: 80, label: 'Dock Left' },
  right: { top: 80, bottom: 80, right: 0, width: 80, label: 'Dock Right' },
  
  // Corner zones
  'top-left': { top: 0, left: 0, width: 80, height: 80, label: 'Top Left' },
  'top-right': { top: 0, right: 0, width: 80, height: 80, label: 'Top Right' },
  'bottom-left': { bottom: 0, left: 0, width: 80, height: 80, label: 'Bottom Left' },
  'bottom-right': { bottom: 0, right: 0, width: 80, height: 80, label: 'Bottom Right' },
} as const;

/**
 * Calculate if a point is within a dock zone
 */
const isPointInZone = (x: number, y: number, zone: typeof DOCK_ZONES[keyof typeof DOCK_ZONES]): boolean => {
  const { innerWidth, innerHeight } = window;
  
  const left = 'left' in zone ? zone.left : ('right' in zone ? innerWidth - zone.right - (zone.width || 0) : 0);
  const top = 'top' in zone ? zone.top : ('bottom' in zone ? innerHeight - zone.bottom - (zone.height || 0) : 0);
  const width = zone.width || ('right' in zone ? zone.right + (zone.width || 0) : innerWidth - left);
  const height = zone.height || ('bottom' in zone ? zone.bottom + (zone.height || 0) : innerHeight - top);
  
  return x >= left && x <= left + width && y >= top && y <= top + height;
};

/**
 * Calculate zone bounds for dashboard layout
 */
const getDashboardZoneBounds = (zone: typeof DOCK_ZONES[keyof typeof DOCK_ZONES], dashboardRect: DOMRect) => {
  const bounds = { ...zone };
  
  // For dashboard layout, adjust zones to be relative to dashboard container
  if ('left' in bounds && bounds.left === 0) {
    bounds.left = dashboardRect.left;
  }
  if ('right' in bounds && bounds.right === 0) {
    bounds.right = window.innerWidth - dashboardRect.right;
  }
  if ('top' in bounds && bounds.top === 0) {
    bounds.top = dashboardRect.top;
  }
  if ('bottom' in bounds && bounds.bottom === 0) {
    bounds.bottom = window.innerHeight - dashboardRect.bottom;
  }
  
  return bounds;
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
    setMousePosition({ x, y });

    // Check which zone the mouse is in
    let foundZone: DockPosition | null = null;
    
    for (const [position, zone] of Object.entries(DOCK_ZONES)) {
      const zoneBounds = isDashboardLayout && dashboardRef.current
        ? getDashboardZoneBounds(zone, dashboardRef.current.getBoundingClientRect())
        : zone;
        
      if (isPointInZone(x, y, zoneBounds)) {
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
        const zoneBounds = isDashboardLayout && dashboardRef.current
          ? getDashboardZoneBounds(zone, dashboardRef.current.getBoundingClientRect())
          : zone;

        return (
          <DockZoneOverlay
            key={position}
            isHighlighted={isHighlighted}
            sx={{
              ...zoneBounds,
              // Convert zone bounds to CSS properties
              ...(zoneBounds.width && { width: zoneBounds.width }),
              ...(zoneBounds.height && { height: zoneBounds.height }),
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