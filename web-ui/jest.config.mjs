/** @type {import('jest').Config} */
const config = {
  projects: ['<rootDir>/packages/*/jest.config.mjs'],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'packages/**/src/**/*.{ts,tsx}',
    'packages/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/tests/**',
    '!**/.next/**',
  ],
};

export default config;
