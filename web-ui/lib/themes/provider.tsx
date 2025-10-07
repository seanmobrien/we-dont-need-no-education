'use client';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  PropsWithChildren,
} from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import type { ThemeType, ThemeContextType } from './types';
import { themes } from './definitions';
import { Loading } from '/components/general/loading';
import { log } from '/lib/logger';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  defaultTheme?: ThemeType;
}

const THEME_STORAGE_KEY = 'selectedTheme';

export const ThemeProvider = ({
  children,
  defaultTheme = 'dark',
}: PropsWithChildren<ThemeProviderProps>) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(defaultTheme);
  const [hasMounted, setHasMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    if (!hasMounted && typeof window !== 'undefined') {
      setHasMounted(true);
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeType;
      if (
        savedTheme &&
        savedTheme !== currentTheme &&
        (savedTheme === 'dark' || savedTheme === 'light')
      ) {
        setCurrentTheme(savedTheme);
      }
    }
  }, [hasMounted, currentTheme]);

  // Update CSS data-theme attribute when theme changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', currentTheme);
      document.documentElement.setAttribute(
        'data-toolpad-color-scheme',
        currentTheme,
      );
      document.documentElement.setAttribute(
        'data-mui-color-scheme',
        currentTheme,
      );
    }
  }, [currentTheme]);

  const setTheme = useCallback(
    (theme: ThemeType) => {
      log((l) => l.debug(`setTheme called with: ${theme}`));
      if (theme === currentTheme) {
        return; // Skip redundant updates
      }
      setCurrentTheme(theme);
      if (typeof window !== 'undefined') {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      }
    },
    [currentTheme],
  );

  const contextValue: ThemeContextType = {
    theme: themes[currentTheme],
    currentTheme,
    setTheme,
  };

  return (
    <>
      <ThemeContext.Provider value={contextValue}>
        <MuiThemeProvider theme={themes[currentTheme]} defaultMode="dark">
          {hasMounted ? children : <Loading />}
        </MuiThemeProvider>
      </ThemeContext.Provider>
    </>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
