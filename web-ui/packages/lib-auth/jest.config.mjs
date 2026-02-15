import baseConfig from './__tests__/shared/jest.config-shared.mjs';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  displayName: "Libraries: auth",
  preset: "ts-jest",
  testEnvironment: "jsdom",
  rootDir: ".",
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    "^jose$": "<rootDir>/../app/__mocks__/jose.ts",
    "^next-auth/providers/keycloak$": "<rootDir>/__mocks__/shared/keycloak-provider.js",
    "^@compliance-theater/auth/lib/utilities$": "<rootDir>/src/lib/utilities/index.ts",
    "^@compliance-theater/auth/(.*)$": "<rootDir>/src/$1",
    "^@compliance-theater/auth$": "<rootDir>/src",
    "^@/__tests__/test-utils$": "<rootDir>/__tests__/test-utils.tsx",
    "^@/__tests__/test-utils-server$": "<rootDir>/__tests__/test-utils-server.ts",
    "^@/__tests__/shared/(.*)$": "<rootDir>/__tests__/shared/$1",
    "^@/__tests__/(.*)$": "<rootDir>/__tests__/$1",
    "^@/app/(.*)$": "<rootDir>/../app/app/$1",
    "^@/auth$": "<rootDir>/src/auth.ts",
    "^@/components/auth/(.*)$": "<rootDir>/src/components/$1",
    "^@/lib/auth/(.*)$": "<rootDir>/src/lib/$1",
    "^@/lib/site-util/auth/(.*)$": "<rootDir>/src/lib/utilities/$1",
    "^@/lib/react-util$": "<rootDir>/../app/lib/react-util/index.ts",
    "^@/lib/react-util/(.*)$": "<rootDir>/../app/lib/react-util/$1",
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
