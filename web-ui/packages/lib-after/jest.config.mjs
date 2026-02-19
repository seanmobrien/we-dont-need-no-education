import baseConfig, { filter } from './__tests__/shared/jest.config-shared.mjs';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  displayName: "Libraries: after",
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  transformIgnorePatterns: [
    'node_modules/(?!(@compliance-theater)/)',
  ],
  // We only want logger and text-encoding mocks...I swear the global mock setup is more helpful later
  // setupFilesAfterEnv: filter(baseConfig, 'setupFilesAfterEnv', (entry) => !entry.includes('jest.mock-log.ts') && !entry.includes('mock-text-encoding.ts')),
};

export default config;
