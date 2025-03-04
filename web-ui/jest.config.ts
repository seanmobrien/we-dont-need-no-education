import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest', // Use ts-jest preset for TypeScript support
  testEnvironment: 'jsdom', // Set the test environment to jsdom
  setupFilesAfterEnv: ['<rootDir>/__tests__/jest.setup.ts'], // Setup file for global imports
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'], // File extensions to be handled
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx)',
    '**/?(*.)+(spec|test).(ts|tsx)',
  ], // Test file patterns
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1', // Alias for module imports
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest', // Transform TypeScript files using ts-jest
    '^.+\\.(js|jsx)$': 'babel-jest', // Transform JavaScript files using babel-jest
  },
  transformIgnorePatterns: ['<rootDir>/node_modules/'], // Ignore node_modules
  collectCoverage: true, // Enable coverage collection
  collectCoverageFrom: [
    '**/*.{ts,tsx}', // Collect coverage from TypeScript files in src directory
    '!**/*.d.ts', // Exclude type declaration files
    '!__(tests|mocks)__/**/*.*', // Exclude type declaration files
  ],
  coverageDirectory: '<rootDir>/coverage', // Output directory for coverage reports
  coverageReporters: ['json', 'lcov', 'text', 'clover'], // Coverage report formats
};

export default config;
