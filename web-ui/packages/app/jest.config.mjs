import baseConfig from './__tests__/shared/jest.config-shared.mjs';

const config = {
  ...baseConfig,
  displayName: "Web UI: app",
  setupFilesAfterEnv: [
    ...(baseConfig.setupFilesAfterEnv ?? []),
    '@testing-library/jest-dom',
    '<rootDir>/__tests__/setup/jest.mock-appstartup.ts',
    '<rootDir>/__tests__/shared/jest.test-extensions.ts',
    '<rootDir>/__tests__/setup/jest.mock-health.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-auth.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-feature-flags.ts',
    '<rootDir>/__tests__/setup/jest.mock-ai.ts',
    '<rootDir>/__tests__/shared/setup/jest.error-monitoring.error-reporter.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-drizzledb.ts',
    '<rootDir>/__tests__/shared/setup/jest.core-drizzle.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-layout.ts',
    '<rootDir>/__tests__/setup/jest.setup.ts',
  ], // Setup file for global imports
  moduleNameMapper: {
    ...(baseConfig.moduleNameMapper ?? {}),
    '^react$': '<rootDir>/node_modules/react/index.js',
    '^react-dom$': '<rootDir>/node_modules/react-dom/index.js',
    '^react/jsx-runtime$': '<rootDir>/node_modules/react/jsx-runtime.js',
    '^react/jsx-dev-runtime$': '<rootDir>/node_modules/react/jsx-dev-runtime.js',
    '^@tanstack/react-query$':
      '<rootDir>/node_modules/@tanstack/react-query/build/modern/index.cjs',
    '^@tanstack/query-core$':
      '<rootDir>/node_modules/@tanstack/query-core/build/modern/index.cjs',
    '^got$': '<rootDir>/__mocks__/got.ts',
    '^@/__tests__/test-utils$': '<rootDir>/__tests__/shared/test-utils.tsx',
    '^@/__tests__/test-utils-server$': '<rootDir>/__tests__/shared/test-utils-server.ts',
    '^next-auth/providers/keycloak$': '<rootDir>/__mocks__/shared/keycloak-provider.js',
    '^next/navigation$': '<rootDir>/__mocks__/next-navigation.ts',
    '^@/(.*)$': '<rootDir>/$1', // Alias for module imports    
  },
};

export default config;
