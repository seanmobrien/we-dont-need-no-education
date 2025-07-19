'use client';
import { createTheme, Theme } from '@mui/material/styles';
import { ThemeType } from './types';

const defaults = {
  cssVariables: {
    colorSchemeSelector: 'data',
  },
  typography: {
    fontFamily: 'var(--geist-sans) var(--font-geist-mono)',
    fontSize: 14,
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
          backdropFilter: 'blur(8px)',
          backgroundColor: 'var(--color-surface-primary)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
        },    
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: 'var(--color-surface-secondary)',
          borderRight: '1px solid var(--color-border-main)',
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: 'var(--color-primary-main)',
        },
      },
    },
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          color: 'var(--color-primary-main) !important',
        },
      },
    },
  },
};

// Dark theme (current theme)
export const darkTheme: Theme = createTheme({
  ...defaults,
  palette: {
    mode: 'dark',
    primary: {
      main: '#19bfcf', // color-primary-main
      light: '#19c4ce', // color-primary-light
      dark: '#1898a8', // color-primary-dark
    },
    secondary: {
      main: '#d05697', // color-secondary-main
      light: '#d05799', // color-secondary-light
      dark: '#a8456f', // color-secondary-dark
    },
    warning: {
      main: '#ffda3e', // color-highlight-main
      light: '#ffd73f', // color-highlight-light
      dark: '#e4ca43', // color-highlight-dark
    },
    info: {
      main: '#18b9b6', // color-primary-accent
    },
    background: {
      default: '#0a0a0a',
      paper: '#23393d', // color-surface-primary
    },
    action: {
      active: '#1898a8',
      /*
      hover: string;
      hoverOpacity: number;
      selected: string;
      selectedOpacity: number;
      disabled: string;
      disabledOpacity: number;
      disabledBackground: string;
      focus: string;
      focusOpacity: number;
      activatedOpacity: number;
      */
    },
  },
  components: {
    ...defaults.components,
    MuiButton: {
      styleOverrides: {
        root: {
          ...defaults.components.MuiButton.styleOverrides.root,
          textTransform: 'none',
        },
      },
    },
    MuiPaper: {
      ...defaults.components.MuiPaper,
      styleOverrides: {
        ...defaults.components.MuiPaper.styleOverrides,
        root: {
          ...defaults.components.MuiPaper.styleOverrides.root,
        },
      },
    },
    // Add AppBar theming for dark mode
    MuiAppBar: {
      ...defaults.components.MuiAppBar,
      styleOverrides: {
        ...defaults.components.MuiAppBar.styleOverrides,
        root: {
          ...defaults.components.MuiAppBar.styleOverrides.root,
          // backgroundColor: '#23393d', // color-surface-primary
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          ...defaults.components.MuiChip.styleOverrides.root,
        },        
      },
    },
    // Add navigation theming for @toolpad components
    MuiDrawer: {
      ...defaults.components.MuiDrawer,
      styleOverrides: {
        ...defaults.components.MuiDrawer.styleOverrides,
        paper: {
          ...defaults.components.MuiDrawer.styleOverrides.paper,
          // backgroundColor: 'var(--color-surface-secondary)',
          // borderRight: '1px solid var(--color-border-main)',
        },
      },
    },
    MuiListItemIcon: {
      ...defaults.components.MuiListItemIcon,
      styleOverrides: {
        ...defaults.components.MuiListItemIcon.styleOverrides,
        root: {
          ...defaults.components.MuiListItemIcon.styleOverrides.root,
          // color: '#19bfcf', // color-primary-main
        },
      },
    },
    MuiSvgIcon: {
      ...defaults.components.MuiSvgIcon,
      styleOverrides: {
        ...defaults.components.MuiSvgIcon.styleOverrides,
        root: {
          ...defaults.components.MuiSvgIcon.styleOverrides.root,
          // color: '#19bfcf !important', // color-primary-main
        },
      },
    },
  },
});

// light theme (new theme with specified colors)
export const colorfulTheme: Theme = createTheme({
  ...defaults,
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
  components: {
    ...defaults.components,
    MuiButton: {
      styleOverrides: {
        root: {
          ...defaults.components.MuiButton.styleOverrides.root,        
          textTransform: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          ...defaults.components.MuiPaper.styleOverrides.root,          
          backgroundColor: '#ffffff',
          border: '1px solid #f5a9b8', // Subtle accent border
        },
      },
    },
    // Add some custom styling for the light theme
    MuiAppBar: {
      styleOverrides: {
        root: {
          ...defaults.components.MuiAppBar.styleOverrides.root,
          // backgroundColor: '#1abbf9',
        },
      },
    },
    // Add navigation theming for @toolpad components
    MuiDrawer: {
      styleOverrides: {
        paper: {
          ...defaults.components.MuiDrawer.styleOverrides.paper,
          // backgroundColor: '#ffffff',
          // borderRight: '2px solid #f5a9b8',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          ...defaults.components.MuiChip.styleOverrides.root,
        },
        colorSecondary: {
          backgroundColor: '#f5a9b8',
          color: '#000000',
        },
      },
    },
  },
});

export const themes: Record<ThemeType, Theme> = {
  dark: darkTheme,
  light: colorfulTheme,
} as const;

export const themeDisplayNames: Record<ThemeType, string> = {
  dark: 'Dark Theme',
  light: 'Colourful Theme',
};
