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
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'], // File extensions to be handled
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx)',
    '!/.next/**',
    '!/dist/**',
    '!/.upstream/**',
    '!/(rsc)/**',
  ],
  moduleNameMapper: {
    '^@mui/icons-material/(.*)$': '<rootDir>/__mocks__/shared/mui-icon-mock.tsx', // Mock all MUI icons to a singular mock
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
  },
  transformIgnorePatterns: [
    // Allow transpiling certain ESM packages (zodex, zod) which ship ESM-only
    '<rootDir>/node_modules/(?!(zodex|zod|got|react-error-boundary|openid-client))',
    '<rootDir>/.next',
    '<rootDir>/.upstream',
    '.upstream',
  ],
  collectCoverageFrom: [
    '**/*.{ts,tsx}', // Collect coverage from TypeScript files in src directory
    '!**/*.d.ts', // Exclude type declaration files
    '!__(tests|mocks)__/**/*.*', // Exclude test and mock files
    '!tests/**/*.*', // Exclude playwright test files    
    '!.next/**/*.*', // Exclude next build files
    '!.upstream/**/*.*', // Exclude upstream build files
    '!(rsc)/**/*.*', // Exclude upstream build files
    '!dist/**/*.*', // Exclude dist build files
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
