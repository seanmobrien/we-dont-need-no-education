'use client';

import { debounce } from "@/lib/react-util/debounce";
import { ChatPanelConfig, ChatPanelContextValue, DockPosition } from './types';
import React, { createContext, useContext, useState, useEffect, useMemo, SetStateAction } from 'react';


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
  const [config, setConfigState] = useState<ChatPanelConfig>(DEFAULT_CONFIG);
  const [isClient, setIsClient] = useState(false);
  const [dockPanel, setDockPanel] = useState<HTMLDivElement | null>(null);

  // Load stored config on client side
  useEffect(() => {
    setIsClient(true);
    setConfig(loadStoredConfig());
  // Empty ref array - we want this to run on the initial mount and that's about it
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sneaky useEffect to support automatically saving config values to local storage whenever they change
  useEffect(() => {
    if (isClient) {
      saveConfig(config);
    }
  }, [config, isClient]);

  const {
    setConfig,
    setPosition,
    setSize,
    setDockSize,
    setFloating,
    isDocked,
    isFloating,
    isInline,
    debounced,
  } = useMemo(() =>{

    const smartSetConfig = (arg: Partial<ChatPanelConfig> | ((prev: ChatPanelConfig) => Partial<ChatPanelConfig>)) => {
      // Get value out of config, then check for object.is equality as a super-quick early-out
      const newConfig: Partial<ChatPanelConfig> = typeof arg === 'function'
        ? arg(config)
        : arg;
      // Guard against premature initialization or reassignment-to-self tomfoolery
      if (!newConfig || !config || Object.is(newConfig, config)) {
        return; // No change, early exit
      }      
      // Guard against unecessary renders by ensuring there's an actual change to be made
      if (
      (newConfig.position && config.position !== newConfig.position)
      || (newConfig.size && (
        config.size.width !== newConfig.size.width
        || config.size.height !== newConfig.size.height
      ))
      || (newConfig.dockSize && config.dockSize !== newConfig.dockSize)      
      )
      {
        // Spread current config and provided partial into a new object to force state update
        setConfigState({
          ...config,
          ...newConfig,
        });
      }
    };
    
    /**
     * Converts config property SetStateAction-style argument into it's ChatPanelConfig equivalent
     * @param key A key identifying the target property.
     * @param value The value to set for the property.
     * @returns A partial config object or a function that takes the previous config and returns a partial config object.
     */
    const wrapConfigProp = <K extends keyof ChatPanelConfig>(
      key: K, 
      value:SetStateAction<Pick<ChatPanelConfig, K>[K]>
    ): Partial<ChatPanelConfig> | ((prev: ChatPanelConfig) => Partial<ChatPanelConfig>) => {
      // Do we have a function property?
      if (typeof value === 'function') {
        return (prev: ChatPanelConfig) => ({
          // yes; call it with the current value and then return it as the new one....smartSetConfig will handle render reduction for us :)
          [key]: value(prev[key]),
        });
      }
      // No, just return the value as a new partial confiog and let smartSetConfig take care of the rest
      return {
        [key]: value,
      };
    };
    const setSizeCallback = (width: number, height: number) => smartSetConfig({ size: { width, height } });
    return {
      setConfig: smartSetConfig,
      setPosition: (position: SetStateAction<DockPosition>) => smartSetConfig(wrapConfigProp('position', position)),
      setSize: setSizeCallback,
      setDockSize: (size: SetStateAction<number | undefined>) => smartSetConfig(wrapConfigProp('dockSize', size)),
      setFloating: (isFloating: SetStateAction<boolean>) => {
        if (typeof isFloating === 'function') {
          smartSetConfig((prev) => ({
            position: isFloating(prev.position === 'floating') ? 'floating' : 'inline',
          }));
        } else {
          smartSetConfig({ position: isFloating ? 'floating' : 'inline' });
        }
      },
      debounced: {
        setSize: debounce<void, (height:number, width: number) => void>(setSizeCallback, 500),
      },
      isDocked: config.position !== 'inline' && config.position !== 'floating',
      isFloating: config.position === 'floating',
      isInline: config.position === 'inline',
    };
  }, [config]);


  // Computed properties
  
  const contextValue: ChatPanelContextValue = {
    config,
    setPosition,
    setSize,
    setDockSize,
    setFloating,
    isDocked,
    isFloating,
    isInline,
    debounced,    
    dockPanel,
    setDockPanel,
  };

  return (
    <ChatPanelContext.Provider value={contextValue}>
      {children}
    </ChatPanelContext.Provider>
  );
};
