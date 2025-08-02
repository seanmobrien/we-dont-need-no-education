import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest', // Use ts-jest preset for TypeScript support
  testEnvironment: 'jsdom', // Set the test environment to jsdom
  testEnvironmentOptions: {
    // Configure jsdom for React 19 concurrent features
    features: {
      FetchExternalResources: false,
      ProcessExternalResources: false,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/jest.setup.ts'], // Setup file for global imports
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'], // File extensions to be handled
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx)',
    '**/?(*.)+(spec|test).(ts|tsx)',
    '!/.next/**'
  ], // Test file patterns

  // Concurrency configuration to prevent hanging issues
  maxWorkers: process.env.CI ? 2 : '50%', // Limit workers in CI, use 50% of cores locally
  maxConcurrency: 5, // Limit concurrent tests to prevent resource contention

  moduleNameMapper: {
    '^@/instrumentation(.*)$':
      '<rootDir>/__tests__/jest.mock-instrumentation.ts', // Mock instrumentation module
    '^@/lib/site-util/metrics.*$': '<rootDir>/__tests__/jest.mock-metrics.ts', // Alias for lib imports
    /*
      prexit: '<rootDir>/__tests__/jest.mock-prexit.ts',
    */
    '^@/(.*)$': '<rootDir>/$1', // Alias for module imports
    '~@/(.*)$': '<rootDir>/__tests__/$1', // Alias for module imports
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // Mock CSS imports
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx', // Enable JSX transformation for React
        },
      },
    ], // Transform TypeScript files using ts-jest
    // '^.+\\.(js|jsx)$': 'babel-jest', // Transform JavaScript files using babel-jest
  },
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(?!(react-error-boundary)/)',
    '<rootDir>/.next',
  ],
  collectCoverage: true, // Enable coverage collection
  //collectCoverage: false, // Enable coverage collection
  collectCoverageFrom: [
    '**/*.{ts,tsx}', // Collect coverage from TypeScript files in src directory
    '!**/*.d.ts', // Exclude type declaration files
    '!__(tests|mocks)__/**/*.*', // Exclude type declaration files
    //'!**/*.{jsx,tsx}', // Exclude JSX-based
    '!.next/**/*.*', // Exclude next build files
  ],
  coverageDirectory: '<rootDir>/coverage', // Output directory for coverage reports
  coverageReporters: ['json', 'lcov', 'text', 'clover'], // Coverage report formats
  //detectLeaks: true,
  //detectOpenHandles: true,
  // logHeapUsage: true,

  // Additional stability configurations for concurrent testing
  testTimeout: 10000, // Increase timeout to 30 seconds for slower tests
  openHandlesTimeout: 1000, // Allow 1 second for open handles cleanup
  forceExit: true, // Don't force exit to allow proper cleanup

  // Mock configuration
  clearMocks: true, // Clear mock calls between tests
  resetMocks: false, // Don't reset mock implementations between tests (we want our setup to persist)
};

export default config;
