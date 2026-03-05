import baseConfig from './__tests__/shared/jest.config-shared.mjs';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  displayName: "Libraries: auth",
  testEnvironment: "jsdom",
  rootDir: ".",
  moduleNameMapper: {
    '^got$': '<rootDir>/__mocks__/got.ts',
    ...baseConfig.moduleNameMapper,
    "^jose$": "<rootDir>/../app/__mocks__/jose.ts",
    "^next-auth/providers/keycloak$": "<rootDir>/__mocks__/shared/keycloak-provider.js"
  },
  transformIgnorePatterns: [
    '<rootDir>/../../node_modules/(?!(zodex|zod|got|react-error-boundary|openid-client|jose|@compliance-theater)/)',
    '<rootDir>/.next',
    '<rootDir>/.upstream',
    '.upstream',
  ],
  setupFilesAfterEnv: [
    ...(baseConfig.setupFilesAfterEnv ?? []),
    '@testing-library/jest-dom',
    '<rootDir>/__tests__/shared/setup/jest.mock-auth.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-drizzledb.ts',
    '<rootDir>/__tests__/shared/setup/jest.core-drizzle.ts',
  ],
};

export default config;
