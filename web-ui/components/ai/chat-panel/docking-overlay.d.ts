/**
 * Type definitions for docking overlay
 * @module components/ai/chat-panel/docking-overlay
 */
import React from 'react';
import type { DockPosition } from './types';

declare module '@/components/ai/chat-panel/docking-overlay' {
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
   * Zone labels for display
   */
  export const ZONE_LABELS: {
    readonly top: 'Dock Top';
    readonly bottom: 'Dock Bottom';
    readonly left: 'Dock Left';
    readonly right: 'Dock Right';
    readonly 'top-left': 'Top Left';
    readonly 'top-right': 'Top Right';
    readonly 'bottom-left': 'Bottom Left';
    readonly 'bottom-right': 'Bottom Right';
  };

  /**
   * Get docking zone rect based on current window dimensions
   */
  export function getDockZoneRect(
    zoneName: keyof typeof ZONE_LABELS,
    windowWidth: number,
    windowHeight: number,
  ): { left: number; top: number; width: number; height: number };

  /**
   * Calculate zone bounds for dashboard layout
   */
  export function getDashboardZoneBounds(
    zone: {
      getRect: () => {
        left: number;
        top: number;
        width: number;
        height: number;
      };
      label: string;
    },
    dashboardRect: DOMRect,
  ): { left: number; top: number; width: number; height: number };

  /**
   * DockingOverlay component that shows docking zones during drag operations
   */
  export const DockingOverlay: React.FC<DockingOverlayProps>;

  /**
   * Hook to use docking functionality
   */
  export function useDocking(): {
    isDragging: boolean;
    startDragging: () => void;
    stopDragging: () => void;
  };
}
