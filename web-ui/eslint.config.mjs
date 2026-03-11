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
        languageOptions: {
            globals: {
                atob: 'readonly',
                btoa: 'readonly',
                Buffer: 'readonly',
                caches: 'readonly',
                clearTimeout: 'readonly',
                clearInterval: 'readonly',
                console: 'readonly',
                globalThis: 'readonly',
                navigator: 'readonly',
                NodeJS: 'readonly',
                process: 'readonly',
                require: 'readonly',
                setTimeout: 'readonly',
                setInterval: 'readonly',
                TextEncoder: 'readonly',
                TextDecoder: 'readonly',
                window: 'readonly',
                ErrorEvent: 'readonly',
                PromiseRejectionEvent: 'readonly',
                localStorage: 'readonly',
                URL: 'readonly',
                Request: 'readonly',
                Response: 'readonly',
                Headers: 'readonly',
                URLSearchParams: 'readonly',
                RequestInfo: 'readonly',
                ResponseInfo: 'readonly',
            },
        },
    },
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
