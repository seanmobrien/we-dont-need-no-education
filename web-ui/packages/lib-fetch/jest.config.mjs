import baseConfig from './__tests__/shared/jest.config-shared.mjs';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  displayName: "Libraries: fetch",
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    "^@compliance-theater/fetch/(.*)$": "<rootDir>/src/$1",
    "^@compliance-theater/fetch$": "<rootDir>/src",
    "^@compliance-theater/logger(.*)$": "<rootDir>/../lib-logger/src$1",
    "^@compliance-theater/typescript(.*)$": "<rootDir>/../lib-typescript/src$1",
  },
};

export default config;
