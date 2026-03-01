import baseConfig from './__tests__/shared/jest.config-shared.mjs';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  setupFilesAfterEnv: [],
  displayName: "Libraries: types",
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverageFrom: [
    ...(baseConfig.collectCoverageFrom ?? []),
    '!src/ai-sdk.ts',
    '!src/ai-sdk/**',
    '!src/auth-core.ts',
    '!src/auth-core/**',
    '!src/next-auth.ts',
    '!src/next-auth/**',
    '!src/index.ts',
  ],
};

export default config;
