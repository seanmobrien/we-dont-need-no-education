import baseConfig from './__tests__/shared/jest.config-shared.mjs';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  displayName: "Libraries: redis",
  testEnvironment: "node",
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
  },
};

export default config;
