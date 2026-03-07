import { describe, it, expect } from '@jest/globals';
import * as rootExports from '../../src';
import * as themeProviderExports from '../../src/themes/provider';
import * as providerBarrelExports from '../../src/provider';
import * as themeSelectorExports from '../../src/themes/theme-selector';
import * as themeSelectorBarrelExports from '../../src/components/theme-selector';
import { themes, themeDisplayNames } from '../../src/themes/definitions';

describe('theme exports', () => {
    it('re-exports provider from provider.ts', () => {
        expect(providerBarrelExports.ThemeProvider).toBe(themeProviderExports.ThemeProvider);
        expect(providerBarrelExports.useTheme).toBe(themeProviderExports.useTheme);
    });

    it('re-exports theme selector from components/theme-selector.ts', () => {
        expect(themeSelectorBarrelExports.ThemeSelector).toBe(themeSelectorExports.ThemeSelector);
    });

    it('re-exports key root symbols from src/index.ts', () => {
        expect(rootExports.ThemeProvider).toBe(themeProviderExports.ThemeProvider);
        expect(rootExports.ThemeSelector).toBe(themeSelectorExports.ThemeSelector);
        expect(rootExports.themes).toBe(themes);
        expect(rootExports.themeDisplayNames).toBe(themeDisplayNames);
    });
});
