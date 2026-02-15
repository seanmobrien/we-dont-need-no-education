/**
 * @typedef {import('jest').Config.InitialOptions} ConfigType
 */


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

const config = {
  preset: 'ts-jest', // Use ts-jest preset for TypeScript support
  testEnvironment: 'jsdom', // Set the test environment to jsdom
  testEnvironmentOptions: {
    // Configure jsdom for React 19 concurrent features
    features: {
      FetchExternalResources: false,
      ProcessExternalResources: false,
    },
    customExportConditions: ['workspace-source'],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'], // File extensions to be handled  
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/shared/setup/jest.mock-text-encoding.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-log.ts',
    '<rootDir>/__tests__/shared/setup/jest.env-vars.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-redis.ts',
    '<rootDir>/__tests__/shared/setup/jest.localStorage.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-opentelemetry.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-got.ts',
    '<rootDir>/__tests__/shared/setup/jest.mock-node-modules.ts',
  ],
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx)',
    '!/.next/**',
    '!/dist/**',
    '!/.upstream/**',
    '!/(rsc)/**',
  ],
  moduleNameMapper: {
    // All material UI icons are served by a single mock
    '^@mui/icons-material/(.*)$': '<rootDir>/__mocks__/shared/mui-icon-mock.tsx', // Mock all MUI icons to a singular mock
    // Instrumentation library mock
    '@/instrumentation(.*)$':
      '<rootDir>/__mocks__/shared/setup/instrumentation.ts', // Mock instrumentation module
    // Keycloak providers mock
    '^(@|\\.)/lib/auth/keycloak-provider$':
      '<rootDir>/__mocks__/shared/keycloak-provider.js', // Mock static file imports,
    // Metrics module mock
    '^@/lib/site-util/metrics.*$':
      '<rootDir>/__mocks__/shared/metrics.ts', // Alias for lib imports
    // Prexit module mock
    '^prexit$': '<rootDir>/__mocks__/shared/prexit.ts', // Mock prexit module
    // Zodex module mock
    '^zodex$': '<rootDir>/__mocks__/shared/zodex.js',
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
