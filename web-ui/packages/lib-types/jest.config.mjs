import baseConfig, { filter } from './__tests__/shared/jest.config-shared.mjs';

const pathIgnorePatterns = [
  '/[^/]+\\.worktrees/',
  '/\\.next/',
  '/\\.turbo/',
  '/dist/',
  '/ai-sdk/',
  '/auth-core/',
  '/next-auth/',
];

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  displayName: 'Core Solution Types and Services',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/__tests__', '<rootDir>/__mocks__'],
  modulePathIgnorePatterns: pathIgnorePatterns,
  watchPathIgnorePatterns: pathIgnorePatterns,
  setupFilesAfterEnv: filter('setupFilesAfterEnv', (file) => !file.includes('dependency-injection')), // Exclude dependency injection setup from this package since it doesn't use it, and it causes issues with the way we mock modules in our tests
};

export default config;
