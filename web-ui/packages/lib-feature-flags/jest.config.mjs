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
    '^@compliance-theater/feature-flags/(.*)$': '<rootDir>/src/$1',
    '^@compliance-theater/feature-flags$': '<rootDir>/src',
    '^@compliance-theater/logger(.*)$': '<rootDir>/../lib-logger/src$1',
    '^@compliance-theater/env(.*)$': '<rootDir>/../lib-env/src$1',
    '^@compliance-theater/typescript(.*)$': '<rootDir>/../lib-typescript/src$1',
    '^@compliance-theater/redis(.*)$': '<rootDir>/../lib-redis/src$1',
    '^@/(.*)$': '<rootDir>/../app/$1',
  },
};

export default config;
