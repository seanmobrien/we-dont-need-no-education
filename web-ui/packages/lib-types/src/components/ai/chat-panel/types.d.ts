/**
 * Type definitions for AI chat panel
 * @module components/ai/chat-panel/types
 */

import { Dispatch, SetStateAction } from 'react';


/**
 * Available AI providers
 * @deprecated Use {@see @compliance-theater/types/lib/ai/core/AiProviderType} instead.
 */
export type AiProvider = 'azure' | 'google' | 'openai';

/**
 * Model types available across providers
 * @deprecated Use {@see @compliance-theater/types/lib/ai/core/ModelType} instead.
 */
export type ModelType =
  | 'lofi'
  | 'hifi'
  | 'reasoning-medium'
  | 'reasoning-high';

/**
 * Provider configuration with display name and available models
 */
export type ProviderConfig = {
  id: AiProvider;
  displayName: string;
  models: Array<{
    id: ModelType;
    displayName: string;
    available: boolean;
  }>;
}

/**
 * Combined model selection state
 */
export type ModelSelection = {
  provider: AiProvider;
  model: ModelType;
}

/**
 * Chat panel docking positions
 */
export type DockPosition =
  | 'inline' // Default inline position
  | 'floating' // Floating dialog
  | 'top' // Docked to top edge
  | 'bottom' // Docked to bottom edge
  | 'left' // Docked to left edge
  | 'right' // Docked to right edge
  | 'top-left' // Docked to top-left corner
  | 'top-right' // Docked to top-right corner
  | 'bottom-left' // Docked to bottom-left corner
  | 'bottom-right'; // Docked to bottom-right corner

/**
 * Chat panel configuration interface
 */
export type ChatPanelConfig = {
  position: DockPosition;
  size: {
    width: number;
    height: number;
  };
  dockSize?: number;
};

export type Size = ChatPanelConfig['size'];

/**
 * Context value interface for chat panel state management
 */
export type ChatPanelContextValue = {
  config: ChatPanelConfig;
  setPosition: (position: SetStateAction<DockPosition>) => void;
  setSize: (width: number, height: number) => void;
  setDockSize: (size: SetStateAction<number | undefined>) => void;
  setFloating: (isFloating: SetStateAction<boolean>) => void;
  setCaseFileId: Dispatch<SetStateAction<string | null>>;
  isDocked: boolean;
  isFloating: boolean;
  isInline: boolean;
  caseFileId: string | null;
  debounced: {
    setSize: (width: number, height: number) => Promise<void>;
  };
  dockPanel: HTMLDivElement | null;
  setDockPanel: (panel: HTMLDivElement | null) => void;
};

