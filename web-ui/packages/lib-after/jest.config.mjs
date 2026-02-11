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
    "^@compliance-theater/logger/core$": "<rootDir>/../lib-logger/src/core",
    "^@compliance-theater/logger(.*)$": "<rootDir>/../lib-logger/src$1",
    "^@compliance-theater/typescript(.*)$": "<rootDir>/../lib-typescript/src$1",
    "^prexit$": "<rootDir>/../__mocks__/prexit.ts",
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@compliance-theater)/)',
  ],
};

export default config;
