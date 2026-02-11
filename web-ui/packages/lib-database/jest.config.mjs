import baseConfig from './__tests__/shared/jest.config-shared.mjs';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  displayName: "Libraries: database",
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    "^@compliance-theater/database/driver(.*)$": "<rootDir>/src/driver$1",
    "^@compliance-theater/database/orm(.*)$": "<rootDir>/src/orm$1",
    "^@compliance-theater/database/schema(.*)$": "<rootDir>/src/schema$1",
    "^@compliance-theater/database(.*)$": "<rootDir>/src$1",
  },
};

export default config;
