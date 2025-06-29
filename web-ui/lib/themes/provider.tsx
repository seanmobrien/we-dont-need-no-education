'use client';
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { ThemeType, themes } from './definitions';
import Loading from '@/components/general/loading';

interface ThemeContextType {
  currentTheme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeType;
}

const THEME_STORAGE_KEY = 'selectedTheme';

export const ThemeProvider = ({
  children,
  defaultTheme = 'dark',
}: ThemeProviderProps) => {
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
        (savedTheme === 'dark' || savedTheme === 'colorful')
      ) {
        setCurrentTheme(savedTheme);
      }
    }
  }, [hasMounted, currentTheme]);

  // Update CSS data-theme attribute when theme changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', currentTheme);
    }
  }, [currentTheme]);

  const setTheme = useCallback(
    (theme: ThemeType) => {
      if (DEBUG) {
        console.log('setTheme called with:', theme);
      }
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
    currentTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={themes[currentTheme]}>
        {hasMounted ? children : <Loading />}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
