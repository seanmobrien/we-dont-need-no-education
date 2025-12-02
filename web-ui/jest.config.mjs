const config = {
  preset: 'ts-jest', // Use ts-jest preset for TypeScript support
  testEnvironment: 'jsdom', // Set the test environment to jsdom
  testEnvironmentOptions: {
    // Configure jsdom for React 19 concurrent features
    features: {
      FetchExternalResources: false,
      ProcessExternalResources: false,
    },
  },
  // Ensure environment globals (Response/Request/Headers) are available before modules load
  setupFiles: ['<rootDir>/__tests__/setup/jest.mock-log.ts'],
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup/jest.env-vars.ts',
    '<rootDir>/__tests__/setup/jest.mock-appstartup.ts',
    '<rootDir>/__tests__/jest.test-extensions.ts',
    '<rootDir>/__tests__/setup/jest.mock-node-modules.ts',
    '<rootDir>/__tests__/setup/jest.mock-redis.ts',
    '<rootDir>/__tests__/setup/jest.mock-health.ts',
    '<rootDir>/__tests__/setup/jest.mock-auth.ts',
    '<rootDir>/__tests__/setup/jest.mock-feature-flags.ts',
    '<rootDir>/__tests__/setup/jest.mock-ai.ts',
    '<rootDir>/__tests__/setup/jest.setup.env.ts',
    '<rootDir>/__tests__/setup/jest.setup.ts',
  ], // Setup file for global imports
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'], // File extensions to be handled
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx)',
    // '**/?(*.)+(spec|test).(ts|tsx)',
    '!/.next/**',
    '!/.upstream/**',
    '!/(rsc)/**',
  ], // Test file patterns

  // Concurrency configuration to prevent hanging issues
  // maxWorkers: process.env.CI ? 2 : '50%', // Limit workers in CI, use 50% of cores locally
  maxConcurrency: 5, // Limit concurrent tests to prevent resource contention

  moduleNameMapper: {
    '@/instrumentation(.*)$':
      '<rootDir>/__tests__/setup/jest.mock-instrumentation.ts', // Mock instrumentation module
    '^@/lib/site-util/metrics.*$':
      '<rootDir>/__tests__/setup/jest.mock-metrics.ts', // Alias for lib imports
    '^@/(.*)$': '<rootDir>/$1', // Alias for module imports
    //'^~@/(.*)$': '<rootDir>/__tests__/$1', // Alias for module imports
    '^zodex$': '<rootDir>/__tests__/mocks/zodex.js',
    '^prexit$': '<rootDir>/__tests__/setup/jest.mock-prexit.ts', // Mock prexit module
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // Mock CSS imports
    '^(@|\\.)/lib/auth/keycloak-provider$':
      '<rootDir>/__tests__/mocks/keycloak-provider.js', // Mock static file imports
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
  forceExit: false, // Don't force exit to allow proper cleanup

  // Mock configuration
  clearMocks: true, // Clear mock calls between tests
  resetMocks: false, // Don't reset mock implementations between tests (we want our setup to persist)
};

export default config;
