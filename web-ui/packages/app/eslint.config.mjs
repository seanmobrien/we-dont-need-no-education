import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import enforceYarnVersion from '../../eslint-rules/enforce-yarn-version.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'prettier'),
  {
    plugins: {
      'enforce-yarn': { rules: { version: enforceYarnVersion } },
    },
    rules: {
      'enforce-yarn/version': 'error',
    },
  },
  {
    ignores: [
      'node_modules',
      'dist',
      'build',
      'coverage',
      'public',
      'out',
      'next.config.js',
      'next-env.d.ts',
      '.next',
      'lib/ai/mem0/lib',
      '.github',
    ],
  },
  // Disable certain TypeScript rules for test folders
  {
    files: ['**/tests/**', '**/__tests__/**'],
    languageOptions: {
      parserOptions: { ecmaVersion: 'latest' },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-restricted-properties': [
        'error',
        {
          object: 'jest',
          property: 'clearAllMocks',
          message:
            'Do not use jest.clearAllMocks(); use targeted mockFn.mockClear() for suite-owned mocks.',
        },
        {
          object: 'jest',
          property: 'resetAllMocks',
          message:
            'Do not use jest.resetAllMocks(); use targeted mockFn.mockReset() for suite-owned mocks.',
        },
      ],
    },
  },
];

export default eslintConfig;
