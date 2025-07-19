import { Theme } from '@mui/material/styles';


/**
 * ThemeType represents the type of theme used in the application.
 * It can be either 'dark' or 'light'.
 * This type is used to manage the current theme state and apply the appropriate styles.
 * @example
 * ```typescript
 * const currentTheme: ThemeType = 'dark';
 * // Apply dark theme styles
 * ```
 * @see {@link Theme} for the MUI theme object.
 */
export type ThemeType = 'dark' | 'light';
  
/**
 * Represents the context for theme management within the application.
 *
 * @property currentTheme - The currently {@link ThemeType} theme type ('dark' or 'light').
 * @property theme - The {@link Theme} object that defines the active theme.
 * @property setTheme - Function to update the current theme by specifying a new theme type.
 * @example
 * ```typescript
 * const { currentTheme, theme, setTheme } = useTheme();
 * setTheme('light'); // Switch to light theme
 * ```
 * @see {@link ThemeType} for the type of themes available.
 * @see {@link Theme} for the MUI theme object.
 */
export type ThemeContextType = {
  currentTheme: ThemeType;
  theme: Theme;
  setTheme: (theme: ThemeType) => void;
};
