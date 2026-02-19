import baseConfig from './__tests__/shared/jest.config-shared.mjs';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  setupFilesAfterEnv: [],
  displayName: "Libraries: types",
  preset: "ts-jest",
  testEnvironment: "node"
};

export default config;
