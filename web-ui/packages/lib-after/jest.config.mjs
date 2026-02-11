import baseConfig from './__tests__/shared/jest.config-shared.mjs';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  displayName: "Libraries: after",
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    "^@compliance-theater/after(.*)$": "<rootDir>/src$1",
  },
};

export default config;
