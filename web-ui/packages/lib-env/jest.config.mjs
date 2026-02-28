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
    '^@compliance-theater/types$': '<rootDir>/../lib-types/src/index.ts',
    '^@compliance-theater/types/(.*)$': '<rootDir>/../lib-types/src/$1',
    '^@compliance-theater/logger$': '<rootDir>/../lib-logger/src/index.ts',
    '^@compliance-theater/logger/(.*)$': '<rootDir>/../lib-logger/src/$1',
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
  coverageReporters: ['text', 'lcov', 'html'],
};
