const { defaults: tsjPreset } = require("ts-jest/presets");
const tanstackReactQueryPath = '../../node_modules/@tanstack/react-query'


/**
 * @template { ConfigType } TConfig
 * @typedef { keyof ConfigType } ConfigTypeKey
 */

/**
 * @template { ConfigType } TConfig
 * @template { ConfigTypeKey<TConfig> } TKey
 * @typedef { TConfig[TKey] } ConfigTypeField
 */

/**
 * @template { ConfigType } TConfig
 * @template { ConfigTypeKey<TConfig> } TKey
 * @typedef { {
 *  source: TConfig;
 *  field: TKey;
 *  match: RegExp | ((input: ConfigTypeField<TConfig, TKey>[keyof ConfigTypeField<TConfig, TKey>]) => boolean);
 * } } FilterProps
 */

/**
 * @template {ConfigType} TConfig
 * @template { ConfigTypeKey<TConfig> } TKey
 * @param {FilterProps<TConfig, TKey>} props
 * @returns {TConfig}
 */
export const filter = (props) => {
  // Destructure args
  const { source, field, match } = props;
  // Extract initial collection value from source
  const initialCollection = source?.[field];
  if (!initialCollection) {
    return source;
  }
  // if match is a regex then wrap it with a simple predicate
  const predicate = typeof match === 'function'
    ? match
    : (input) => match.test(input);
  let filteredCollection;
  // If initialCollection is an array
  if (Array.isArray(initialCollection)) {
    // Then use Array.filter to build filteredCollection
    filteredCollection = initialCollection.filter(predicate);
  } else if (typeof initialCollection === 'object') {
    // Else extract keys from initialCollection object and 
    // reduce them int filteredCollection
    filteredCollection = Object.keys(initialCollection).reduce(
      (prev, current) => {
        const fieldValue = initialCollection[current];
        if (predicate(fieldValue)) {
          prev[current] = fieldValue;
        }
        return prev;
      }, {});
  } else {
    // Otherwise we have an unsupported value type - throw
    throw new Error('Unsupported collection type', { cause: initialCollection });
  }
  source[field] = filteredCollection;
  return source;
};

const pathIgnorePatterns = [
  "/[^/]+\\.worktrees/",
  "/\\.next/",
  "/\\.turbo/",
  "/dist/",
];

const config = {
  ...defaults,
  preset: 'ts-jest', // Use ts-jest preset for TypeScript support
  roots: ["<rootDir>/__tests__", "<rootDir>/__mocks__"],
  testMatch: ["/__tests__/.*\\.tsx?$"],
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
  moduleNameMapper: {
    // Keycloak providers mock
    '^@compliance-theater/auth/lib/keycloak-provider$':
      '<rootDir>/__mocks__/shared/keycloak-provider.js', // Mock static file imports,
    // Metrics module mock - todo migrate off app
    '^@/lib/site-util/metrics.*$':
      '<rootDir>/__mocks__/shared/metrics.ts', // Alias for lib imports
    // Generic workspace mapping
    '^@compliance-theater/json-viewer$': '<rootDir>/../../submodules/json-viewer/packages/src/index.ts',
    '^@compliance-theater/([^/]+)(/.*)?$': '<rootDir>/../lib-$1/src$2',
    // Instrumentation library mock
    '@/instrumentation(.*)$':
      '<rootDir>/__mocks__/shared/setup/instrumentation.ts', // Mock instrumentation module        
    // Explicitly map React and ReactDOM to the versions installed at the monorepo root to avoid potential issues with multiple React versions in the context of linked packages and workspaces
    /*
    '^react$': '<rootDir>/../../node_modules/react/index.js',
    '^react-dom$': '<rootDir>/../../node_modules/react-dom/index.js',
    */
    // Map tanstack react-query to the resolved path to ensure consistent module resolution across packages and workspaces
    '^@tanstack/react-query$': tanstackReactQueryPath,
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
          //useESM: true, // Use ESM modules
        },
      },
    ], // Transform TypeScript files using ts-jest    
  },
  transformIgnorePatterns: [
    // Allow transpiling certain ESM packages (zodex, zod) which ship ESM-only
    '/node_modules/(?!(zodex|zod|got|react-error-boundary|openid-client|jose))',
    '/.next/',
    '/.upstream/',
  ],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{ts,tsx}',

    // Exclusions
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    '!**/tests/**',
    '!**/.next/**',
    '!**/.upstream/**',
    '!**/dist/**',
    '!**/(rsc)/**'
  ],
  coverageDirectory: '<rootDir>/coverage', // Output directory for coverage reports
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

export default config;
