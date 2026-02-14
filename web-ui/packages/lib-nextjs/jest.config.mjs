import baseConfig from './__tests__/shared/jest.config-shared.mjs';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  displayName: "Libraries: nextjs",
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    "^@compliance-theater/nextjs/(.*)$": "<rootDir>/src/$1",
    "^@compliance-theater/nextjs$": "<rootDir>/src",
  },
};

export default config;
