import baseConfig, { filter } from './__tests__/shared/jest.config-shared.mjs';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  displayName: "Libraries: logger",
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  setupFilesAfterEnv: filter(baseConfig, 'setupFilesAfterEnv', (entry) => entry.includes('jest.mock-log.ts')),
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
  },
};

export default config;
