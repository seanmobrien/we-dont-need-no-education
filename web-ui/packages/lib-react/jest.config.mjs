import baseConfig from './__tests__/shared/jest.config-shared.mjs';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  displayName: "Libraries: react",
  preset: "ts-jest",
  testEnvironment: "jsdom",  // React needs jsdom
  testEnvironmentOptions: {
    // Configure jsdom for React 19 concurrent features
    features: {
      FetchExternalResources: false,
      ProcessExternalResources: false,
    },
  },
  rootDir: ".",
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    // Map published paths to source for testing
    "^@compliance-theater/react/(.*)$": "<rootDir>/src/$1",
    "^@compliance-theater/react$": "<rootDir>/src",
    // CSS modules
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Workspace packages to source
    "^@compliance-theater/logger(.*)$": "<rootDir>/../lib-logger/src$1",
    "^@compliance-theater/env(.*)$": "<rootDir>/../lib-env/src$1",
    "^@compliance-theater/typescript(.*)$": "<rootDir>/../lib-typescript/src$1",
  },
};

export default config;
