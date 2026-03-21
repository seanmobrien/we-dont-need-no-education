const swcTransform = ['@swc/jest', {
  jsc: {
    parser: {
      syntax: 'typescript',
      tsx: true,
    },
    transform: {
      react: {
        runtime: 'automatic',
      },
    },
  },
  module: {
    type: 'commonjs',
  },
}];

/** @type {import('jest').Config} */
const config = {
  displayName: 'Libraries: react-query-compat',
  rootDir: '.',
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@compliance-theater/react-query-compat$': '<rootDir>/src/index.ts',
    '^@compliance-theater/react-query-compat/devtools$': '<rootDir>/src/devtools.tsx',
    '^@compliance-theater/react-query-compat/devtools/production$': '<rootDir>/src/devtools.production.tsx',
    '^@compliance-theater/react-query-compat/runtime$': '<rootDir>/src/runtime.tsx',
    '^react$': '<rootDir>/../../../node_modules/react/index.js',
    '^react-dom$': '<rootDir>/../../../node_modules/react-dom/index.js',
    '^react/jsx-runtime$': '<rootDir>/../../../node_modules/react/jsx-runtime.js',
    '^react/jsx-dev-runtime$': '<rootDir>/../../../node_modules/react/jsx-dev-runtime.js'
  },
  transform: {
    '^.+\\.(ts|tsx)$': swcTransform,
  },
};

export default config;
