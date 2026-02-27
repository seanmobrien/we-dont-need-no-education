import baseConfig from './__tests__/shared/jest.config-shared.mjs';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  displayName: 'Libraries: feature-flags',
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // React components need jsdom
  rootDir: '.',
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^next-auth/providers/keycloak$': '<rootDir>/__mocks__/shared/keycloak-provider.js',
    '^@/(.*)$': '<rootDir>/../app/$1',
  },
};

export default config;
