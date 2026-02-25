import baseConfig, { filter } from './__tests__/shared/jest.config-shared.mjs';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  displayName: "Libraries: logger",
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  setupFilesAfterEnv: filter({
    source: { ...baseConfig },
    field: 'setupFilesAfterEnv',
    match: (entry) =>
      entry.includes('jest.mock-log.ts') ||
      entry.includes('jest.mock-text-encoding.ts') ||
      entry.includes('jest.error-monitoring.error-reporter.ts'),
  }).setupFilesAfterEnv,
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
  },
};

export default config;
