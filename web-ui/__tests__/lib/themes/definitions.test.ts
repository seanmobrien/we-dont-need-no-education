import { describe, it, expect } from '@jest/globals';
import { themes, darkTheme, colorfulTheme, ThemeType } from '@/lib/themes/definitions';

describe('Theme Definitions', () => {
  it('should have dark and colorful themes available', () => {
    expect(themes).toBeDefined();
    expect(themes.dark).toBeDefined();
    expect(themes.colorful).toBeDefined();
  });

  it('should have dark theme with dark mode', () => {
    expect(darkTheme.palette.mode).toBe('dark');
  });

  it('should have colorful theme with light mode', () => {
    expect(colorfulTheme.palette.mode).toBe('light');
  });

  it('should have colorful theme with specified colors', () => {
    expect(colorfulTheme.palette.primary.main).toBe('#1abbf9');
    expect(colorfulTheme.palette.secondary.main).toBe('#ff79f9');
    expect(colorfulTheme.palette.background?.default).toBe('#ffffff');
    expect(colorfulTheme.palette.warning?.main).toBe('#f5a9b8');
  });

  it('should have consistent theme structure', () => {
    expect(darkTheme.typography.fontFamily).toBe(colorfulTheme.typography.fontFamily);
    expect(darkTheme.spacing(1)).toBe(colorfulTheme.spacing(1));
  });
});