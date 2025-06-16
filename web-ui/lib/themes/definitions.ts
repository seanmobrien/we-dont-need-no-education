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
    // Add AppBar theming for dark mode
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(18, 18, 18, 0.9)',
          backdropFilter: 'blur(8px)',
        },
      },
    },
    // Add navigation theming for @toolpad components
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(18, 18, 18, 0.95)',
          borderRight: '1px solid rgba(81, 81, 81, 1)',
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
      light: '#5ecdfb',
      dark: '#118bd6',
    },
    secondary: {
      main: '#ff79f9', // (255,121,249)
      light: '#ffaafb',
      dark: '#d647d6',
    },
    background: {
      default: '#ffffff', // (255,255,255)
      paper: '#ffffff',
    },
    text: {
      primary: '#000000',
      secondary: '#666666',
    },
    info: {
      main: '#1abbf9', // Use primary color for info
    },
    warning: {
      main: '#f5a9b8', // (245,169,184) - Use accent color for warnings
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
          border: '1px solid #f5a9b8', // Subtle accent border
        },
      },
    },
    // Add some custom styling for the colorful theme
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1abbf9',
        },
      },
    },
    // Add navigation theming for @toolpad components
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          borderRight: '2px solid #f5a9b8',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
        },
        colorSecondary: {
          backgroundColor: '#f5a9b8',
          color: '#000000',
        },
      },
    },
  },
});

export type ThemeType = 'dark' | 'colorful';

export const themes: Record<ThemeType, Theme> = {
  dark: darkTheme,
  colorful: colorfulTheme,
} as const;

export const themeDisplayNames: Record<ThemeType, string> = {
  dark: 'Dark Theme',
  colorful: 'Colorful Theme',
};
