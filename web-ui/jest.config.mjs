/** @type {import('jest').Config} */
const config = {
 roots: ['<rootDir>'],
  testPathIgnorePatterns: ['<rootDir>/packages/', '<rootDir>/submodules/'],
  modulePathIgnorePatterns: ['<rootDir>/packages/', '<rootDir>/submodules/'],
  watchPathIgnorePatterns: ['<rootDir>/packages/', '<rootDir>/submodules/'],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'packages/**/*.{ts,tsx,mjs}',
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
