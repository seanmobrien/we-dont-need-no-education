import baseConfig from './__tests__/shared/jest.config-shared.mjs';

const config = {
  ...baseConfig,
  displayName: "Web UI: app",
  setupFilesAfterEnv: [
    ...(baseConfig.setupFilesAfterEnv ?? []),
    '<rootDir>/__tests__/setup/jest.mock-appstartup.ts',
    '<rootDir>/__tests__/shared/jest.test-extensions.ts',
    '<rootDir>/__tests__/setup/jest.mock-health.ts',
    '<rootDir>/__tests__/setup/jest.mock-auth.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-feature-flags.ts',
    '<rootDir>/__tests__/setup/jest.mock-ai.ts',
    '<rootDir>/__tests__/shared/setup/jest.error-monitoring.error-reporter.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-drizzledb.ts',
    '<rootDir>/__tests__/shared/setup/jest.core-drizzle.ts',
    '<rootDir>/__tests__/setup/jest.setup.ts',
  ], // Setup file for global imports
  moduleNameMapper: {
    ...(baseConfig.moduleNameMapper ?? {}),
    '^@/(.*)$': '<rootDir>/$1', // Alias for module imports    
  },
};

export default config;
