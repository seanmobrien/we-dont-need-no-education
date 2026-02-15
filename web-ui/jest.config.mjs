/** @type {import('jest').Config} */
const config = {
  projects: ['<rootDir>/packages/*/jest.config.mjs'],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'packages/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/tests/**',
    '!**/.next/**',
    '!**/__mocks__/**',
    '!**/dist/**',
    '!**/.upstream/**',
    '!**/(rsc)/**',
  ],
};

export default config;
