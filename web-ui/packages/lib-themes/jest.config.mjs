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
  },
};

export default config;
