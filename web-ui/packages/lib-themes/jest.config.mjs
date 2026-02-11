import baseConfig from './__tests__/shared/jest.config-shared.mjs';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  displayName: "Libraries: themes",
  preset: "ts-jest",
  testEnvironment: "jsdom",
  rootDir: ".",
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    "^@compliance-theater/logger$": "<rootDir>/../lib-logger/src",
    "^@compliance-theater/themes/themes$": "<rootDir>/src/themes",
    "^@compliance-theater/themes/styles$": "<rootDir>/src/styles",
    "^@compliance-theater/themes(.*)$": "<rootDir>/src$1",
  },
};

export default config;
