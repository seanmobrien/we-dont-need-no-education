import { SetStateAction } from "react";

/**
 * Chat panel docking positions
 */
export type DockPosition = 
  | 'inline'      // Default inline position
  | 'floating'    // Floating dialog
  | 'top'         // Docked to top edge
  | 'bottom'      // Docked to bottom edge
  | 'left'        // Docked to left edge
  | 'right'       // Docked to right edge
  | 'top-left'    // Docked to top-left corner
  | 'top-right'   // Docked to top-right corner
  | 'bottom-left' // Docked to bottom-left corner
  | 'bottom-right'; // Docked to bottom-right corner

/**
 * Chat panel configuration interface
 */
export interface ChatPanelConfig {
  position: DockPosition;
  size: {
    width: number;
    height: number;
  };
  // For docked panels, this represents the panel size along the docked edge
  dockSize?: number;
}

export type Size = ChatPanelConfig['size'];

/**
 * Context value interface
 */
export interface ChatPanelContextValue {
  config: ChatPanelConfig;
  setPosition: (position: SetStateAction<DockPosition>) => void;
  setSize: (width: number, height: number) => void;  
  setDockSize: (size: SetStateAction<number | undefined>) => void;
  setFloating: (isFloating: SetStateAction<boolean>) => void;
  isDocked: boolean;
  isFloating: boolean;
  isInline: boolean;
  debounced: {
    setSize: (width: number, height: number) => Promise<void>;
  },
  dockPanel: HTMLDivElement | null;
  setDockPanel: (panel: HTMLDivElement | null) => void;
}

