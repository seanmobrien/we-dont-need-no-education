'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

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

/**
 * Context value interface
 */
export interface ChatPanelContextValue {
  config: ChatPanelConfig;
  setPosition: (position: DockPosition) => void;
  setSize: (width: number, height: number) => void;
  setDockSize: (size: number) => void;
  isDocked: boolean;
  isFloating: boolean;
  isInline: boolean;
}

/**
 * Local storage keys for persistence
 */
const STORAGE_KEYS = {
  POSITION: 'chatPanelPosition',
  SIZE: 'chatPanelSize',
  DOCK_SIZE: 'chatPanelDockSize',
} as const;

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ChatPanelConfig = {
  position: 'inline',
  size: {
    width: 600,
    height: 500,
  },
  dockSize: 300,
};

/**
 * Load configuration from localStorage
 */
const loadStoredConfig = (): ChatPanelConfig => {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_CONFIG;
  }

  try {
    const position = (localStorage.getItem(STORAGE_KEYS.POSITION) as DockPosition) || DEFAULT_CONFIG.position;
    const storedSize = localStorage.getItem(STORAGE_KEYS.SIZE);
    const storedDockSize = localStorage.getItem(STORAGE_KEYS.DOCK_SIZE);

    const size = storedSize ? JSON.parse(storedSize) : DEFAULT_CONFIG.size;
    const dockSize = storedDockSize ? parseInt(storedDockSize, 10) : DEFAULT_CONFIG.dockSize;

    return {
      position,
      size,
      dockSize,
    };
  } catch (error) {
    console.warn('Failed to load chat panel config from localStorage:', error);
    return DEFAULT_CONFIG;
  }
};

/**
 * Save configuration to localStorage
 */
const saveConfig = (config: ChatPanelConfig): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEYS.POSITION, config.position);
    localStorage.setItem(STORAGE_KEYS.SIZE, JSON.stringify(config.size));
    if (config.dockSize !== undefined) {
      localStorage.setItem(STORAGE_KEYS.DOCK_SIZE, config.dockSize.toString());
    }
  } catch (error) {
    console.warn('Failed to save chat panel config to localStorage:', error);
  }
};

/**
 * Create the context
 */
const ChatPanelContext = createContext<ChatPanelContextValue | null>(null);

/**
 * Hook to use the chat panel context
 */
export const useChatPanelContext = (): ChatPanelContextValue => {
  const context = useContext(ChatPanelContext);
  if (!context) {
    throw new Error('useChatPanelContext must be used within a ChatPanelProvider');
  }
  return context;
};

/**
 * Provider component props
 */
export interface ChatPanelProviderProps {
  children: React.ReactNode;
}

/**
 * Chat panel context provider
 */
export const ChatPanelProvider: React.FC<ChatPanelProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<ChatPanelConfig>(DEFAULT_CONFIG);
  const [isClient, setIsClient] = useState(false);

  // Load stored config on client side
  useEffect(() => {
    setIsClient(true);
    setConfig(loadStoredConfig());
  }, []);

  // Save config changes to localStorage
  useEffect(() => {
    if (isClient) {
      saveConfig(config);
    }
  }, [config, isClient]);

  const setPosition = useCallback((position: DockPosition) => {
    setConfig(prev => ({ ...prev, position }));
  }, []);

  const setSize = useCallback((width: number, height: number) => {
    setConfig(prev => ({
      ...prev,
      size: { width, height }
    }));
  }, []);

  const setDockSize = useCallback((size: number) => {
    setConfig(prev => ({ ...prev, dockSize: size }));
  }, []);

  // Computed properties
  const isDocked = config.position !== 'inline' && config.position !== 'floating';
  const isFloating = config.position === 'floating';
  const isInline = config.position === 'inline';

  const contextValue: ChatPanelContextValue = {
    config,
    setPosition,
    setSize,
    setDockSize,
    isDocked,
    isFloating,
    isInline,
  };

  return (
    <ChatPanelContext.Provider value={contextValue}>
      {children}
    </ChatPanelContext.Provider>
  );
};