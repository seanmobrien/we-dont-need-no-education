import baseConfig from './__tests__/shared/jest.config-shared.mjs';

const config = {
  ...baseConfig,
  displayName: "Web UI: app",
  setupFilesAfterEnv: [
    ...(baseConfig.setupFilesAfterEnv ?? []),
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
    '^next-auth/providers/keycloak$': '<rootDir>/__mocks__/shared/keycloak-provider.js',
    '^@/auth$': '<rootDir>/../lib-auth/src/auth.ts',
    '^@/components/auth/session-provider$': '<rootDir>/../lib-auth/src/components/session-provider/index.ts',
    '^@/lib/auth/impersonation/impersonation-factory$': '<rootDir>/../lib-auth/src/lib/impersonation/impersonation-factory.ts',
    '^@/lib/auth/impersonation$': '<rootDir>/../lib-auth/src/lib/impersonation/index.ts',
    '^@/lib/auth/resources/case-file/case-file-middleware$': '<rootDir>/../lib-auth/src/lib/resources/case-file/case-file-middleware.ts',
    '^@/lib/auth/resources/case-file$': '<rootDir>/../lib-auth/src/lib/resources/case-file/index.ts',
    '^@/lib/site-util/auth$': '<rootDir>/../lib-auth/src/lib/utilities/index.ts',
    '^@compliance-theater/auth/components/session-provider/(.*)$': '<rootDir>/../lib-auth/src/components/session-provider/$1',
    '^@compliance-theater/auth/components/key-refresh-notify/(.*)$': '<rootDir>/../lib-auth/src/components/key-refresh-notify/$1',
    '^@/(.*)$': '<rootDir>/$1', // Alias for module imports    
  },
};

export default config;
