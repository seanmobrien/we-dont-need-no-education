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
    // CSS modules
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
};

export default config;
