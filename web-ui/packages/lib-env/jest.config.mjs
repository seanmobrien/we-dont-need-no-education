export default {
  displayName: '@compliance-theater/env',
  preset: 'ts-jest',
  testEnvironment: 'node',
  testEnvironmentOptions: {
  },
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@compliance-theater/([^/]+)(/.*)?$': '<rootDir>/../lib-$1/src$2',
    /*
    '^@compliance-theater/types$': '<rootDir>/../lib-types/src/index.ts',
    '^@compliance-theater/types/(.*)$': '<rootDir>/../lib-types/src/$1',
    '^@compliance-theater/logger$': '<rootDir>/../lib-logger/src/index.ts',
    '^@compliance-theater/logger/(.*)$': '<rootDir>/../lib-logger/src/$1',
    */
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@compliance-theater)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  coverageDirectory: './coverage',
  // coverageReporters: ['text', 'lcov', 'html'],
  coverageReporters: ['json', 'lcov', 'text-summary', 'text', 'clover'], // Coverage report formats
  testTimeout: 1000, // Increase timeout to 30 seconds for slower tests
  openHandlesTimeout: 1000, // Allow 1 second for open handles cleanup
  // Mock configuration
  clearMocks: true, // Clear mock calls between tests
  resetMocks: false, // Don't reset mock implementations between tests (we want our setup to persist)
};
