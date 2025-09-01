import React, { useState, useEffect, useMemo, SetStateAction } from 'react';
import { debounce } from '@/lib/react-util/debounce';
import { ChatPanelConfig, ChatPanelContextValue, DockPosition } from './types';
import { ChatPanelContext } from './chat-panel-context';

const STORAGE_KEYS = {
  POSITION: 'chatPanelPosition',
  SIZE: 'chatPanelSize',
  DOCK_SIZE: 'chatPanelDockSize',
} as const;

const DEFAULT_CONFIG: ChatPanelConfig = {
  position: 'inline',
  size: {
    width: 600,
    height: 500,
  },
  dockSize: 300,
};

const loadStoredConfig = (): ChatPanelConfig => {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_CONFIG;
  }
  try {
    const position =
      (localStorage.getItem(STORAGE_KEYS.POSITION) as DockPosition) ||
      DEFAULT_CONFIG.position;
    const storedSize = localStorage.getItem(STORAGE_KEYS.SIZE);
    const storedDockSize = localStorage.getItem(STORAGE_KEYS.DOCK_SIZE);

    const size = storedSize ? JSON.parse(storedSize) : DEFAULT_CONFIG.size;
    const dockSize = storedDockSize
      ? parseInt(storedDockSize, 10)
      : DEFAULT_CONFIG.dockSize;

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

export interface ChatPanelProviderProps {
  children: React.ReactNode;
}

export const ChatPanelProvider: React.FC<ChatPanelProviderProps> = ({
  children,
}) => {
  const [config, setConfigState] = useState<ChatPanelConfig>(DEFAULT_CONFIG);
  const [isClient, setIsClient] = useState(false);
  const [dockPanel, setDockPanel] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsClient(true);
    setConfigState(loadStoredConfig());
  }, []);

  useEffect(() => {
    if (isClient) {
      saveConfig(config);
    }
  }, [config, isClient]);

  const {
    setPosition,
    setSize,
    setDockSize,
    setFloating,
    isDocked,
    isFloating,
    isInline,
    debounced,
  } = useMemo(() => {
    const smartSetConfig = (
      arg:
        | Partial<ChatPanelConfig>
        | ((prev: ChatPanelConfig) => Partial<ChatPanelConfig>),
    ) => {
      const newConfig: Partial<ChatPanelConfig> =
        typeof arg === 'function' ? arg(config) : arg;
      if (!newConfig || !config || Object.is(newConfig, config)) {
        return;
      }
      if (
        (newConfig.position && config.position !== newConfig.position) ||
        (newConfig.size &&
          (config.size.width !== newConfig.size.width ||
            config.size.height !== newConfig.size.height)) ||
        (newConfig.dockSize && config.dockSize !== newConfig.dockSize)
      ) {
        setConfigState({
          ...config,
          ...newConfig,
        });
      }
    };

    const wrapConfigProp = <K extends keyof ChatPanelConfig>(
      key: K,
      value: SetStateAction<Pick<ChatPanelConfig, K>[K]>,
    ):
      | Partial<ChatPanelConfig>
      | ((prev: ChatPanelConfig) => Partial<ChatPanelConfig>) => {
      if (typeof value === 'function') {
        const fn = value as (
          prev: Pick<ChatPanelConfig, K>[K],
        ) => Pick<ChatPanelConfig, K>[K];
        return (prev: ChatPanelConfig) =>
          ({ [key]: fn(prev[key]) }) as Partial<ChatPanelConfig>;
      }
      return { [key]: value } as Partial<ChatPanelConfig>;
    };

    const setSizeCallback = (width: number, height: number) =>
      smartSetConfig({ size: { width, height } });

    return {
      setConfig: smartSetConfig,
      setPosition: (position: SetStateAction<DockPosition>) =>
        smartSetConfig(wrapConfigProp('position', position)),
      setSize: setSizeCallback,
      setDockSize: (size: SetStateAction<number | undefined>) =>
        smartSetConfig(wrapConfigProp('dockSize', size)),
      setFloating: (isFloating: SetStateAction<boolean>) => {
        if (typeof isFloating === 'function') {
          const fn = isFloating as (current: boolean) => boolean;
          smartSetConfig((prev) => ({
            position: fn(prev.position === 'floating') ? 'floating' : 'inline',
          }));
        } else {
          smartSetConfig({ position: isFloating ? 'floating' : 'inline' });
        }
      },
      debounced: {
        setSize: debounce<void, (height: number, width: number) => void>(
          setSizeCallback,
          500,
        ),
      },
      isDocked: config.position !== 'inline' && config.position !== 'floating',
      isFloating: config.position === 'floating',
      isInline: config.position === 'inline',
    };
  }, [config]);

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

export default ChatPanelProvider;
