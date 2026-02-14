# @compliance-theater/themes

Theme and styling utilities for the Title IX Victim Advocacy Platform.

## Overview

This package provides:
- Material UI theme definitions (dark and light themes)
- Theme provider and hooks for React components
- Utility styling functions

## Usage

### Theme Provider

Wrap your application with the ThemeProvider:

```tsx
import { ThemeProvider } from '@compliance-theater/themes';

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      {/* Your app content */}
    </ThemeProvider>
  );
}
```

### Using Themes

```tsx
import { useTheme } from '@compliance-theater/themes';

function MyComponent() {
  const { currentTheme, theme, setTheme } = useTheme();
  
  return (
    <div>
      <p>Current theme: {currentTheme}</p>
      <button onClick={() => setTheme('light')}>Switch to Light</button>
    </div>
  );
}
```

### Theme Definitions

```tsx
import { darkTheme, colorfulTheme, themes } from '@compliance-theater/themes';

// Access predefined themes
const myTheme = themes.dark;
```

## Exports

- `ThemeProvider` - React component for theme context
- `useTheme` - Hook to access theme context
- `themes` - Object containing all available themes
- `darkTheme` - Dark theme definition
- `colorfulTheme` - Light/colorful theme definition
- `themeDisplayNames` - Display names for themes
- `ThemeType` - TypeScript type for theme names
- `ThemeContextType` - TypeScript type for theme context
- `cn` - Utility for combining class names
- `styles` - Object containing utility style definitions
