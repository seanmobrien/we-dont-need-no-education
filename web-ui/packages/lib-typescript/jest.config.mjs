/** @type {import('jest').Config} */
const config = {
  displayName: 'lib-typescript',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  clearMocks: true,
  resetMocks: false,
};

export default config;
