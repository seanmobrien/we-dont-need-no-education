import baseConfig from './__tests__/shared/jest.config-shared.mjs';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  displayName: "Libraries: typescript",
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    "^@/(.*)$": "<rootDir>/../app/$1",
  },
  setupFilesAfterEnv: [
    ...(baseConfig.setupFilesAfterEnv ?? []),
    "<rootDir>/__tests__/shared/setup/jest.mock-log.ts",
    "<rootDir>/__tests__/shared/setup/jest.env-vars.ts",
  ],
};

export default config;
