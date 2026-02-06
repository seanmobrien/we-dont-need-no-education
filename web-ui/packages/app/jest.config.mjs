import { config as baseConfig } from '__tests__/shared/jest.config-shared.mjs';

const config = {
  ...baseConfig,
  // Curretnly no pre-setup files, but this is where they would go  
  setupFiles: [
  ],
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/shared/setup/jest.mock-log.ts',
    '<rootDir>/__tests__/shared/setup/jest.env-vars.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-redis.ts',
    '<rootDir>/__tests__/shared/setup/jest.localStorage.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-got.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-opentelemetry.ts',
    '<rootDir>/__tests__/setup/jest.mock-appstartup.ts',
    '<rootDir>/__tests__/jest.test-extensions.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-node-modules.ts',
    '<rootDir>/__tests__/setup/jest.mock-health.ts',
    '<rootDir>/__tests__/setup/jest.mock-auth.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-feature-flags.ts',
    '<rootDir>/__tests__/setup/jest.mock-ai.ts',
    '<rootDir>/__tests__/shared/setup/jest.setup.env.ts',
    '<rootDir>/__tests__/setup/jest.mock-drizzledb.ts',
    '<rootDir>/__tests__/setup/jest.setup.ts',
  ], // Setup file for global imports

  // Concurrency configuration to prevent hanging issues
  // maxWorkers: process.env.CI ? 2 : '50%', // Limit workers in CI, use 50% of cores locally
  // maxConcurrency: 5, // Limit concurrent tests to prevent resource contention

  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '@/instrumentation(.*)$':
      '<rootDir>/__tests__/setup/jest.mock-instrumentation.ts', // Mock instrumentation module
    '^@/lib/site-util/metrics.*$':
      '<rootDir>/__tests__/setup/jest.mock-metrics.ts', // Alias for lib imports
    '^@compliance-theater/logger(.*)$': '<rootDir>/../lib-logger/src$1',
    '^@/lib/typescript(.*)$': '<rootDir>/../lib-typescript/src$1',
    '^@/(.*)$': '<rootDir>/$1', // Alias for module imports
    '^@compliance-theater/logger(.*)$': '<rootDir>/../lib-logger/src$1', // Resolve workspace logger package for tests
    '^@compliance-theater/typescript(.*)$': '<rootDir>/../lib-typescript/src$1', // Resolve workspace TS utils package for tests
    '^/lib/logger(.*)$': '<rootDir>/../lib-logger/src$1',
    '^/lib/typescript(.*)$': '<rootDir>/../lib-typescript/src$1',
    //'^~@/(.*)$': '<rootDir>/__tests__/$1', // Alias for module imports
    '^zodex$': '<rootDir>/__tests__/mocks/zodex.js',
    '^prexit$': '<rootDir>/__tests__/setup/jest.mock-prexit.ts', // Mock prexit module
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // Mock CSS imports
    '^(@|\\.)/lib/auth/keycloak-provider$':
      '<rootDir>/__tests__/mocks/keycloak-provider.js', // Mock static file imports,
    '^@mui/icons-material/(.*)$': '<rootDir>/../__mocks__/mui-icon-mock.tsx', // Mock all MUI icons to a singular mock
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx', // Enable JSX transformation for React
          //useESM: true, // Use ESM modules
        },
      },
    ], // Transform TypeScript files using ts-jest
    // '^.+\\.(js|jsx)$': 'babel-jest', // Transform JavaScript files using babel-jest
  },
  transformIgnorePatterns: [
    // Allow transpiling certain ESM packages (zodex, zod) which ship ESM-only
    '<rootDir>/node_modules/(?!(zodex|zod|got|react-error-boundary|openid-client))',
    '<rootDir>/.next',
    '<rootDir>/.upstream',
    //'<rootDir>/(rsc)',
    '.upstream',
  ],
  collectCoverageFrom: [
    '**/*.{ts,tsx}', // Collect coverage from TypeScript files in src directory
    '!**/*.d.ts', // Exclude type declaration files
    '!__(tests|mocks)__/**/*.*', // Exclude test and mock files
    '!tests/**/*.*', // Exclude playwright test files
    //'!**/*.{jsx,tsx}', // Exclude JSX-based
    '!.next/**/*.*', // Exclude next build files
    '!.upstream/**/*.*', // Exclude upstream build files
    '!(rsc)/**/*.*', // Exclude upstream build files
  ],
  coverageDirectory: '<rootDir>/coverage', // Output directory for coverage reports
  coverageReporters: ['json', 'lcov', 'text', 'clover'], // Coverage report formats
  // detectLeaks: true,
  // detectOpenHandles: true, // Enable detection of async operations that prevent Jest from exiting
  // logHeapUsage: true,

  // Additional stability configurations for concurrent testing
  testTimeout: 1000, // Increase timeout to 30 seconds for slower tests
  openHandlesTimeout: 1000, // Allow 1 second for open handles cleanup
  // forceExit: false, // Don't force exit to allow proper cleanup

  // Mock configuration
  clearMocks: true, // Clear mock calls between tests
  resetMocks: false, // Don't reset mock implementations between tests (we want our setup to persist)
};

export default config;
