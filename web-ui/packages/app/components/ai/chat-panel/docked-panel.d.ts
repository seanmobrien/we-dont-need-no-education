/**
 * Type definitions for docked panel
 * @module components/ai/chat-panel/docked-panel
 */
import React from 'react';
import type { DockPosition } from './types';

declare module '@/components/ai/chat-panel/docked-panel' {
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
   * Get resize handles based on dock position
   */
  export function getResizeHandles(position: DockPosition): string;

  /**
   * Get initial size based on dock position
   */
  export function getInitialSize(
    position: DockPosition,
    defaultSize: number,
  ): { width: number; height: number };

  /**
   * DockedPanel component that handles docked chat panel positioning and resizing
   */
  export const DockedPanel: React.FC<DockedPanelProps>;
}
