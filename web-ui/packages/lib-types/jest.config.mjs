const { defaults: tsjPreset } = require("ts-jest/presets");
const baseConfig = require('./__tests__/shared/jest.config-shared.mjs');
/**
 * @typedef {import('jest').Config.InitialOptions} ConfigType
 */
//const tanstackReactQueryPath = '../../node_modules/@tanstack/react-query';



const pathIgnorePatterns = [
  "/[^/]+\\.worktrees/",
  "/\\.next/",
  "/\\.turbo/",
  "/dist/",
];

const baseConfig = {
  ...tsjPreset,
  ...baseConfig,
  preset: 'ts-jest', // Use ts-jest preset for TypeScript support
  rootDir: ".",
  roots: ["<rootDir>/__tests__", "<rootDir>/__mocks__"],
  testEnvironment: 'jsdom', // Set the test environment to jsdom
  testEnvironmentOptions: {
    // Configure jsdom for React 19 concurrent features
    features: {
      FetchExternalResources: false,
      ProcessExternalResources: false,
    },
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'], // File extensions to be handled  
  modulePathIgnorePatterns: pathIgnorePatterns,
  watchPathIgnorePatterns: pathIgnorePatterns,
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/shared/setup/jest.disallow-global-mock-reset.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-text-encoding.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-log.ts',
    '<rootDir>/__tests__/shared/setup/jest.env-vars.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-redis.ts',
    '<rootDir>/__tests__/shared/setup/jest.localStorage.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-opentelemetry.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-got.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-node-modules.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-dependency-injection.ts',
  ],
  testMatch: [
    '/__tests__/.*\\.(ts|tsx)$',
  ],
  moduleNameMapper: {
    '^@compliance-theater/([^/]+)(/.*)?$': '<rootDir>/../lib-$1/src$2',
    /*
    // Keycloak providers mock
    '^@compliance-theater/auth/lib/keycloak-provider$':
      '<rootDir>/__mocks__/shared/keycloak-provider.js', // Mock static file imports,
    '^@compliance-theater/json-viewer$': '<rootDir>/../../submodules/json-viewer/packages/src/index.ts',
    '^@compliance-theater/([^/]+)(/.*)?$': '<rootDir>/../lib-$1/src$2',
    // Metrics module mock - todo migrate off app
    '^@/lib/site-util/metrics.*$':
      '<rootDir>/__mocks__/shared/metrics.ts', // Alias for lib imports
    // Instrumentation library mock
    '@/instrumentation(.*)$':
      '<rootDir>/__mocks__/shared/setup/instrumentation.ts', // Mock instrumentation module        
    // Explicitly map React and ReactDOM to the versions installed at the monorepo root to avoid potential issues with multiple React versions in the context of linked packages and workspaces
    '^react$': '<rootDir>/../../node_modules/react/index.js',
    '^react-dom$': '<rootDir>/../../node_modules/react-dom/index.js',
    // Map tanstack react-query to the resolved path to ensure consistent module resolution across packages and workspaces
    '^@tanstack/react-query$': tanstackReactQueryPath,
    */
    // All material UI icons are served by a single mock
    '^@mui/icons-material/(.*)$': '<rootDir>/__mocks__/shared/mui-icon-mock.tsx', // Mock all MUI icons to a singular mock    
    // Prexit module mock
    '^prexit$': '<rootDir>/__mocks__/shared/prexit.ts', // Mock prexit module
    // Zodex module mock
    '^zodex$': '<rootDir>/__mocks__/shared/zodex.js',
    // Redis module mock
    '^redis$': '<rootDir>/__mocks__/shared/redis.ts',
    // css modules
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // Mock CSS imports    
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx', // Enable JSX transformation for React
          esModuleInterop: true,
          allowSyntheticDefaultImports: true
        },
      },
    ], // Transform TypeScript files using ts-jest    
  },
  transformIgnorePatterns: [
    // Allow transpiling certain ESM packages (zodex, zod) which ship ESM-only
    '/node_modules/(?!(zodex|zod|got|react-error-boundary|openid-client|jose|@compliance-theater))',
    '/.next/',
    '/.upstream/',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  coverageDirectory: '.coverage', // Output directory for coverage reports
  coverageReporters: ['json', 'lcov', 'text-summary', 'text', 'clover'], // Coverage report formats
  // detectLeaks: true,
  // detectOpenHandles: true, // Enable detection of async operations that prevent Jest from exiting
  // logHeapUsage: true,
  // Additional stability configurations for concurrent testing
  testTimeout: 1000, // Increase timeout to 30 seconds for slower tests
  openHandlesTimeout: 1000, // Allow 1 second for open handles cleanup
  // Mock configuration
  clearMocks: true, // Clear mock calls between tests
  resetMocks: false, // Don't reset mock implementations between tests (we want our setup to persist)
};


/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  setupFilesAfterEnv: [],
  displayName: "Libraries: types",
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverageFrom: [
    ...(baseConfig.collectCoverageFrom ?? []),
    '!src/ai-sdk.ts',
    '!src/ai-sdk/**',
    '!src/auth-core.ts',
    '!src/auth-core/**',
    '!src/next-auth.ts',
    '!src/next-auth/**',
    '!src/index.ts',
  ],
};

export default config;
