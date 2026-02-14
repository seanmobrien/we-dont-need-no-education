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
    "^@compliance-theater/database/schema(.*)$": "<rootDir>/src/drizzle/schema$1",
    "^@compliance-theater/database(.*)$": "<rootDir>/src$1",
    "^@compliance-theater/logger/core$": "<rootDir>/../lib-logger/src/core",
    "^@compliance-theater/logger(.*)$": "<rootDir>/../lib-logger/src$1",
    "^@compliance-theater/typescript(.*)$": "<rootDir>/../lib-typescript/src$1",
    "^@compliance-theater/env(.*)$": "<rootDir>/../lib-env/src$1",
    "^@compliance-theater/after(.*)$": "<rootDir>/../lib-after/src$1",
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@compliance-theater)/)',
  ],
  setupFilesAfterEnv: [
    ...(baseConfig.setupFilesAfterEnv ?? []),
    '<rootDir>/__tests__/shared/setup/jest.mock-drizzledb.ts',
    '<rootDir>/__tests__/shared/setup/jest.core-drizzle.ts',
  ],
};

export default config;
