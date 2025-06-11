'use client';
import { createTheme, Theme } from '@mui/material/styles';

// Dark theme (current theme)
export const darkTheme: Theme = createTheme({
  cssVariables: true,
  typography: {
    fontFamily: 'var(--geist-sans) var(--font-geist-mono)',
    fontSize: 14,
  },
  palette: {
    mode: 'dark',
  },
  spacing: 8,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          padding: '16px',
          borderRadius: '8px',
        },
      },
    },
  },
});

// Colorful theme (new theme with specified colors)
export const colorfulTheme: Theme = createTheme({
  cssVariables: true,
  typography: {
    fontFamily: 'var(--geist-sans) var(--font-geist-mono)',
    fontSize: 14,
  },
  palette: {
    mode: 'light',
    primary: {
      main: '#1abbf9', // (26,187,249)
    },
    secondary: {
      main: '#ff79f9', // (255,121,249)
    },
    background: {
      default: '#ffffff', // (255,255,255)
      paper: '#ffffff',
    },
    text: {
      primary: '#000000',
      secondary: '#666666',
    },
  },
  spacing: 8,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
        },
      },
    },
  },
});

export type ThemeType = 'dark' | 'colorful';

export const themes: Record<ThemeType, Theme> = {
  dark: darkTheme,
  colorful: colorfulTheme,
};

export const themeDisplayNames: Record<ThemeType, string> = {
  dark: 'Dark Theme',
  colorful: 'Colorful Theme',
};