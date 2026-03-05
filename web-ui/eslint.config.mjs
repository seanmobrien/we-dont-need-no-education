import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import enforceYarnVersion from './eslint-rules/enforce-yarn-version.mjs';

export default [
    {
        ignores: [
            '**/node_modules/**',
            '**/dist/**',
            '**/coverage/**',
            '**/.next/**',
            '**/*.d.ts',
            '**/*.tsbuildinfo',
            '**/__tests__/**',
            '**/__mocks__/**'
        ],
    },
    js.configs.recommended,
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
        },
        rules: {
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
        },
    },
    {
        plugins: {
            'enforce-yarn': { rules: { version: enforceYarnVersion } },
        },
        rules: {
            'enforce-yarn/version': 0,
        },
    },
];