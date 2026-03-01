import baseConfig from './packages/__tests__/jest.config-shared.mjs';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  //roots: ['<rootDir>'],
  testPathIgnorePatterns: ['<rootDir>/packages/*/__mocks__'],
  transformIgnorePatterns: [
    ...baseConfig.transformIgnorePatterns,
  ],
  coverageDirectory: '<rootDir>/coverage',
  setupFilesAfterEnv: baseConfig.setupFilesAfterEnv.map(
    x => x.replace('__tests__/shared', 'packages/__tests__')
      .replace('__mocks__/shared', 'packages/__mocks__')
  ),
  collectCoverageFrom: [
    'packages/**/*.{ts,tsx,mjs}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/tests/**',
    '!**/.next/**',
    '!**/__mocks__/**',
    '!**/dist/**',
    '!**/.upstream/**',
    '!**/(rsc)/**',
  ],
};

export default config;
