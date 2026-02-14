import React, { useState, useEffect, useMemo, } from 'react';
import { debounce } from '@/lib/react-util/debounce';
import { ChatPanelContext } from './chat-panel-context';
import { isKeyOf } from '@compliance-theater/typescript';
import { errorReporter } from '@/lib/error-monitoring/error-reporter';
const STORAGE_KEYS = {
    POSITION: 'chatPanelPosition',
    SIZE: 'chatPanelSize',
    DOCK_SIZE: 'chatPanelDockSize',
};
const DEFAULT_CONFIG = {
    position: 'inline',
    size: {
        width: 600,
        height: 500,
    },
    dockSize: 300,
};
const loadStoredConfig = () => {
    if (typeof localStorage === 'undefined') {
        return DEFAULT_CONFIG;
    }
    try {
        const position = localStorage.getItem(STORAGE_KEYS.POSITION) ||
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
    }
    catch (error) {
        errorReporter((r) => r.reportError(error));
        return DEFAULT_CONFIG;
    }
};
const saveConfig = (config) => {
    if (typeof localStorage === 'undefined') {
        return;
    }
    try {
        localStorage.setItem(STORAGE_KEYS.POSITION, config.position);
        localStorage.setItem(STORAGE_KEYS.SIZE, JSON.stringify(config.size));
        if (config.dockSize !== undefined) {
            localStorage.setItem(STORAGE_KEYS.DOCK_SIZE, config.dockSize.toString());
        }
    }
    catch (error) {
        errorReporter((r) => r.reportError(error));
    }
};
export const ChatPanelProvider = ({ children }) => {
    const [config, setConfigState] = useState(DEFAULT_CONFIG);
    const [isClient, setIsClient] = useState(false);
    const [dockPanel, setDockPanel] = useState(null);
    const [caseFileId, setCaseFileId] = useState(null);
    const [lastCompletionTime, setLastCompletionTime] = useState(null);
    useEffect(() => {
        setIsClient(true);
        setConfigState(loadStoredConfig());
    }, []);
    useEffect(() => {
        if (isClient) {
            saveConfig(config);
        }
    }, [config, isClient]);
    const { setPosition, setSize, setDockSize, setFloating, isDocked, isFloating, isInline, debounced, } = useMemo(() => {
        const smartSetConfig = (arg) => {
            const newConfig = typeof arg === 'function' ? arg(config) : arg;
            if (!newConfig || !config || Object.is(newConfig, config)) {
                return;
            }
            const checkKeys = ['position', 'size.height', 'dockSize', 'caseFileId'];
            const fieldsEqual = (x, y, key) => {
                if (key.includes('.')) {
                    const [part, ...parts] = key.split('.');
                    if (!isKeyOf(part, x)) {
                        return true;
                    }
                    const left = x[part];
                    if (!left && left !== null) {
                        return false;
                    }
                    const right = y[part];
                    if (!right && left) {
                        return false;
                    }
                    if (typeof left !== 'object') {
                        return false;
                    }
                    return fieldsEqual(left, right, parts.join('.'));
                }
                if (!isKeyOf(key, x)) {
                    return true;
                }
                return typeof x[key] === 'object'
                    ? Object.is(x[key], y[key])
                    : x[key] == y[key];
            };
            const areEqual = checkKeys.every((key) => fieldsEqual(newConfig, config, key));
            if (!areEqual) {
                if (newConfig.size?.height !== undefined &&
                    newConfig.size.height < 300) {
                    newConfig.size.height = 300;
                }
                setConfigState({
                    ...config,
                    ...newConfig,
                });
            }
        };
        const wrapConfigProp = (key, value) => {
            if (typeof value === 'function') {
                const fn = value;
                return (prev) => ({ [key]: fn(prev[key]) });
            }
            return { [key]: value };
        };
        const setSizeCallback = (width, height) => smartSetConfig({ size: { width, height } });
        return {
            setConfig: smartSetConfig,
            setPosition: (position) => smartSetConfig(wrapConfigProp('position', position)),
            setSize: setSizeCallback,
            setDockSize: (size) => smartSetConfig(wrapConfigProp('dockSize', size)),
            setFloating: (isFloating) => {
                if (typeof isFloating === 'function') {
                    const fn = isFloating;
                    smartSetConfig((prev) => ({
                        position: fn(prev.position === 'floating') ? 'floating' : 'inline',
                    }));
                }
                else {
                    smartSetConfig({ position: isFloating ? 'floating' : 'inline' });
                }
            },
            setCaseFileId,
            debounced: {
                setSize: debounce(setSizeCallback, 500),
            },
            isDocked: config.position !== 'inline' && config.position !== 'floating',
            isFloating: config.position === 'floating',
            isInline: config.position === 'inline',
        };
    }, [config]);
    const contextValue = {
        config,
        setPosition,
        setSize,
        setDockSize,
        setFloating,
        setCaseFileId,
        isDocked,
        isFloating,
        isInline,
        debounced,
        dockPanel,
        setDockPanel,
        caseFileId,
        lastCompletionTime,
        setLastCompletionTime,
    };
    return (<ChatPanelContext.Provider value={contextValue}>
      {children}
    </ChatPanelContext.Provider>);
};
export default ChatPanelProvider;
//# sourceMappingURL=chat-panel-provider.jsx.map