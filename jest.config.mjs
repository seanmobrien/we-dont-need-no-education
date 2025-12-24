/** @type {import('jest').Config} */
const config = {
  projects: ['<rootDir>/web-ui/packages/*/jest.config.mjs'],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'web-ui/packages/**/src/**/*.{ts,tsx}',
    'web-ui/packages/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/tests/**',
    '!**/.next/**',
  ],
};

export default config;
