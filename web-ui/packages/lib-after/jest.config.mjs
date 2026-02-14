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
    "^prexit$": "<rootDir>/../__mocks__/prexit.ts",
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@compliance-theater)/)',
  ],
};

export default config;
