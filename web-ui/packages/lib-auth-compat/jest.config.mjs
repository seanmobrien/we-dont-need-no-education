const swcTransform = ['@swc/jest', {
  jsc: {
    parser: {
      syntax: 'typescript',
      tsx: false,
    },
  },
  module: {
    type: 'commonjs',
  },
}];

/** @type {import('jest').Config} */
const config = {
  displayName: 'Libraries: auth-compat',
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@compliance-theater/auth-compat$': '<rootDir>/src/index.ts',
    '^@compliance-theater/auth-compat/runtime$': '<rootDir>/src/runtime.ts',
  },
  transform: {
    '^.+\\.(ts|tsx)$': swcTransform,
  },
};

export default config;
