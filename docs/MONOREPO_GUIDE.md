# Monorepo Refactoring Guide

## Overview

This document describes the monorepo refactoring of the Title IX Victim Advocacy Platform from a single `web-ui` application to a traditional monorepo structure with packages under `web-ui/packages/`. This maintains clear separation between the Node.js frontend (web-ui) and Java backend (chat) solutions, with web-ui as a fully self-contained monorepo.

## Completed Work (Phase 1)

### Infrastructure Setup ✅

1. **Workspace Structure**

   - Created root `packages.json` package.
   - Created `web-ui/packages.json` workspace package.
   - Created `web-ui/packages/app` directory for monorepo web app bundle.
   - Added Turborepo (`turbo@^2.3.3`) to `web-ui` for build orchestration.
   - Created base typescript setup
     - `web-ui/tsconfig.base.json` contains baseline setup
     - `web-ui/tsconfig.next.json` extends baseline to support next.js

2. **Build Orchestration**

   - Created `web-ui/turbo.json` with task pipelines for:
     - `build`: Builds packages with dependency order
     - `build:typescript`: Fast typescript-only checking
     - `build:clean`: Cleans project output
     - `build:package`: Builds for release distribution
     - `dev`: Development mode (no caching)
     - `test`: Unit tests with coverage
     - `test:e2e`: End-to-end tests
     - `lint`: Linting across packages

## Repository Structure

```txt
/
├── web-ui/                         # Node.js monorepo (self-contained)
│   ├── packages/
│   │   └── app/                    # Main Next.js application
│   │   └── lib-after/              # Process exit and app startup support
│   │   └── lib-auth/               # All things authentication
│   │   └── lib-database/           # Database connectivity and model objects
│   │   └── lib-env/                # Strongly-typed and validated environment variables
│   │   └── lib-feature-flags/      # Feature flagging via flagsmith
│   │   └── lib-logger/             # Logging support, some shared types
│   │   └── lib-nextjs/             # NextJS utility library
│   │   └── lib-react/              # React utility library
│   │   └── lib-redis/              # Redis caching
│   │   └── lib-send-api-request/   # API request wrappers
│   │   └── lib-themes/             # MUI / emotion themes
│   │   └── lib-types/              # Workspace-wide abstract type definitions+dependency injection
│   │   └── lib-typescript/         # Typescript utility and typedefs
│   ├── submodules/                 # Submodule repositories
│   │   └── json-viewer             # Placeholder folder for non-monorepo "json-viewer" dependency
│   │        └─── packages/         # Submodule root for @seanmobrien/json-viewer - imported into workspace
│   │   └── sce                     # Semantic Communication Engine - LLM prompting for 12 year olds
│   │        └─── packages/         # Packages within SCE - imported into the workspace
│   ├── package.json                # Workspace configuration
│   ├── turbo.json                  # Build orchestration
│   ├── jest.config.mjs             # Test configuration
│   └── yarn.lock                   # Dependency lock file
├── chat/                           # Java backend (separate Maven project)
└── package.json                    # Root (delegates to web-ui)
```

## Remaining Work

See [MONOREPO_STATUS.md] for more details.

Each package extraction follows this pattern:

1. Create `web-ui/web-ui/packages/[name]/` directory
2. Move source files from `web-ui/web-ui/packages/app/lib/[name]`
3. Create package.json with proper exports
4. Create tsconfig.json for TypeScript
5. Set up package-specific jest.config.mjs
6. Setup `__tests__` and `__mocks__` symlinks
7. Update imports in app and other packages
8. Test that package works independently

### Import Path Updates

After extracting each package, update all imports:

- From: `@/lib/logger`
- To: `@compliance-theater/logger`

Use this script pattern:

```bash
find packages/app -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i 's|@/lib/logger|@compliance-theater/logger|g' {} \;
```

### Phase 6: Package.json Templates

Each package needs:

```Package.json
{
  "name": "@compliance-theater/[package-name]",
  "version": "0.1.0",
  "private": true,
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./*": {
      "types": "./dist/*.d.ts",
      "default": "./dist/*.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "yarn run build:typescript",
    "build:publish": "yarn run build && yarn pack --out ./dist/[full package name].tgz",
    "build:typescript": "echo 'Building lib/[package-name]...' && tsc -b tsconfig.json && printf '\\u001b[1;32mBuild complete: [package-name].\\u001b[0m\\n' || (printf '\\u001b[31mBuild failed: [package-name].\\u001b[0m\\n' >&2; exit 1)",
    "test": "jest",
    "build:clean": "rimraf dist tsconfig.tsbuildinfo"
  },
  "dependencies": {
    // All @compliance-theater packages in the workspace should reference @compliance-theater/types
    "@compliance-theater/types": "workspace:*"
    // Other Package-specific dependencies
  },
  "devDependencies": {
    "@jest/globals": "^30.0.0",
    "@jest/transform": "^30.0.0",
    "@jest/types": "^30.0.0",
    "@types/jest": "^30.0.0",
    "@types/node": "25.2.3",
    "@types/react": "19.2.4",
    "@types/react-dom": "19.2.3",
    "babel-plugin-react-compiler": "^1.0.0",
    "jest": "^30.0.5",
    "jest-util": "^30.0.0",
    "react-native": "^0.84.0",
    "rimraf": "^6.1.2",
    "ts-jest": "^30.0.0",
    "typescript": "^5.9.3"
  }
}
```

### Phase 2: Testing Strategy

**Per-Package Tests**:

- Each package has `__tests__/` or `src/__tests__/`
- Each package has `jest.config.mjs` extending root config
- Tests can be run independently: `yarn test`

**Integration Tests**:

- Stay in `web-ui/packages/app/__tests__/`
- Test interactions between packages
- Use workspace protocol to reference packages

**E2E Tests**:

- Stay in `web-ui/packages/app/tests/e2e/`
- Test full application behavior
- Use Playwright with monorepo paths

**Running Tests**:

```bash
# All tests across all packages
yarn test

# Specific package
yarn test

# All unit tests
yarn test:unit

# E2E tests only
yarn test:e2e
```

### Phase 3: CI/CD Considerations

**Build Process**:

- Turbo caches build outputs
- Builds only changed packages
- Respects dependency order

**Docker Builds**:

- Main Dockerfile stays in `web-ui/packages/app/`
- Uses workspace dependencies via Yarn
- Build context includes root for workspace resolution

**GitHub Actions**:

- Already updated for `web-ui/packages/app` paths
- May need updates when packages are extracted
- Should leverage Turbo's caching in CI

## Development Workflow

### Adding a New Package to the Monorepo

This section documents the complete process for creating a new package in the `web-ui/packages/` monorepo. The patterns described here are based on existing packages (`lib-logger`, `lib-env`, `lib-typescript`, `lib-send-api-request`) and should be followed for consistency.

#### Overview of Package Structure

Each package follows this standardized structure:

```txt
web-ui/packages/[package-name]/
├── src/
│   ├── index.ts              # Main export file
│   └── [implementation files]
├── __tests__/
│   ├── shared -> ../../__tests__  # Symlink to shared test config
│   └── *.test.ts              # Test files
├── __mocks__/
│   └── shared -> ../../__mocks__  # Symlink to shared mocks
├── package.json               # Package metadata and dependencies
├── tsconfig.json              # TypeScript configuration
└── jest.config.mjs            # Jest configuration
```

**Key structure notes:**

- `__tests__/shared` is a **symbolic link** to `packages/__tests__` (the shared test configuration directory)
- `__mocks__/shared` is a **symbolic link** to `packages/__mocks__` (the shared mocks directory)
- These symlinks allow all packages to share common test setup and mocks without duplication

#### Step-by-Step Package Creation Process

##### Step 1: Create Package Directory Structure

```bash
# Create the package directory and source folder
mkdir -p web-ui/packages/[package-name]/src

# Create __tests__ directory and symlink to shared test configuration
mkdir -p web-ui/packages/[package-name]/__tests__
cd web-ui/packages/[package-name]/__tests__
ln -sf ../../__tests__ shared

# Create __mocks__ directory and symlink to shared mocks
cd ..
mkdir -p __mocks__
cd __mocks__
ln -sf ../../__mocks__ shared
cd ../..
```

**Important:** The `shared` directories are symbolic links, not regular directories. This pattern allows all packages to share common test setup files and mocks from `packages/__tests__` and `packages/__mocks__` without duplication.

##### Step 2: Create package.json

Create `web-ui/packages/[package-name]/package.json` using this template:

```package.json
{
  "name": "@compliance-theater/[package-name]",
  "version": "0.1.0",
  "private": true,
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./*": {
      "types": "./dist/*.d.ts",
      "default": "./dist/*.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "yarn run build:typescript",
    "build:publish": "yarn run build && yarn pack --out ./dist/[full package name].tgz",
    "build:typescript": "echo 'Building lib/[package-name]...' && tsc -b tsconfig.json && printf '\\u001b[1;32mBuild complete: [package-name].\\u001b[0m\\n' || (printf '\\u001b[31mBuild failed: [package-name].\\u001b[0m\\n' >&2; exit 1)",
    "test": "jest",
    "build:clean": "rimraf dist tsconfig.tsbuildinfo"
  },
  "dependencies": {
    // All @compliance-theater packages in the workspace should reference @compliance-theater/types
    "@compliance-theater/types": "workspace:*"
    // Other Package-specific dependencies
  },
  "devDependencies": {
    "@jest/globals": "^30.0.0",
    "@jest/transform": "^30.0.0",
    "@jest/types": "^30.0.0",
    "@types/jest": "^30.0.0",
    "@types/node": "25.2.3",
    "@types/react": "19.2.4",
    "@types/react-dom": "19.2.3",
    "babel-plugin-react-compiler": "^1.0.0",
    "jest": "^30.0.5",
    "jest-util": "^30.0.0",
    "react-native": "^0.84.0",
    "rimraf": "^6.1.2",
    "ts-jest": "^30.0.0",
    "typescript": "^5.9.3"
  }
}
```

**Key points:**

- **Name**: Always use `@compliance-theater/` scope
- **Exports**: The dual export pattern (`"."` and `"./*"`) allows importing both the main entry and submodules
- **Workspace dependencies**: Use `workspace:*` protocol for referencing other monorepo packages
- **Peer dependencies**: Use for optional external dependencies (e.g., Next.js, React) that may not be needed by all consumers

##### Step 3: Create tsconfig.json

Create `web-ui/packages/[package-name]/tsconfig.json`:

```tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "references": [
    {
    // Add TypeScript project references for workspace packages you depend on
      "path": "../lib-types"
    }
  ]
}
```

**Key points:**

- **extends**: Always extend `../../tsconfig.base.json` for consistent base configuration
- **composite**: Defined in base, this must be `true` to enable TypeScript project references
- **No local path mappings**: Do not add `compilerOptions.paths` for workspace packages
- **references**: List all workspace packages this package depends on (must also be in `package.json`)

##### Step 4: Access Shared Jest Configuration

The shared Jest configuration is accessed via the symbolic link you created in Step 1. The shared configuration lives in `packages/__tests__/jest.config-shared.mjs` and is accessible to your package via `__tests__/shared/`.

**Note:** You don't need to create the shared config file - it already exists in `packages/__tests__/jest.config-shared.mjs` and is accessible through the symlink you created.

```jest.config.mjs
import baseConfig from './__tests__/shared/jest.config-shared.mjs';

const config = {
    ...baseConfig,
  displayName: "Libraries: [Package Name]",
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
  },
  setupFilesAfterEnv: [
    ...baseConfig.setupFilesAfterEnv,
  ],
};

export default config;
```

For reference, the shared configuration for packages without React dependencies (pure utilities) looks like this:

```./__tests__/shared/jest.config-shared.mjs
const config = {
    preset: 'ts-jest', // Use ts-jest preset for TypeScript support
  testEnvironment: 'jsdom', // Set the test environment to jsdom
  testEnvironmentOptions: {
    // Configure jsdom for React 19 concurrent features
    features: {
      FetchExternalResources: false,
      ProcessExternalResources: false,
    },
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'], // File extensions to be handled
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
  ],
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx)',
    '!/.next/**',
    '!/dist/**',
    '!/.upstream/**',
    '!/(rsc)/**',
  ],
  moduleNameMapper: {
    '^react$': '<rootDir>/../../node_modules/react/index.js',
    '^react-dom$': '<rootDir>/../../node_modules/react-dom/index.js',
    '^@tanstack/react-query$': tanstackReactQueryPath,
    // All material UI icons are served by a single mock
    '^@mui/icons-material/(.*)$': '<rootDir>/__mocks__/shared/mui-icon-mock.tsx', // Mock all MUI icons to a singular mock
    // Instrumentation library mock
    '@/instrumentation(.*)$':
      '<rootDir>/__mocks__/shared/setup/instrumentation.ts', // Mock instrumentation module
    // Keycloak providers mock
    '^@compliance-theater/auth/lib/keycloak-provider$':
      '<rootDir>/__mocks__/shared/keycloak-provider.js', // Mock static file imports,
    // Metrics module mock
    '^@/lib/site-util/metrics.*$':
      '<rootDir>/__mocks__/shared/metrics.ts', // Alias for lib imports
    // Prexit module mock
    '^prexit$': '<rootDir>/__mocks__/shared/prexit.ts', // Mock prexit module
    // Zodex module mock
    '^zodex$': '<rootDir>/__mocks__/shared/zodex.js',
    // Redis module mock
    '^redis$': '<rootDir>/__mocks__/shared/redis.ts',
    // css modules
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // Mock CSS imports

    // Aliases to support internal imports with jest resolver
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
    '<rootDir>/node_modules/(?!(zodex|zod|got|react-error-boundary|openid-client|jose))',
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
  coverageReporters: ['json', 'lcov', 'text-summary', 'text', 'clover'], // Coverage report formats
  // detectLeaks: true,
  // detectOpenHandles: true, // Enable detection of async operations that prevent Jest from exiting
  // logHeapUsage: true,
  // Additional stability configurations for concurrent testing
  testTimeout: 1000, // Increase timeout to 30 seconds for slower tests
  openHandlesTimeout: 1000, // Allow 1 second for open handles cleanup
  passWithNoTests: true, // Don't fail if no tests are found (useful when running with testPathPattern)
  // Mock configuration
  clearMocks: true, // Clear mock calls between tests
  resetMocks: false, // Don't reset mock implementations between tests (we want our setup to persist)
};
export config;
```

**Key points:**

- **Shared via symlink**: The shared configuration is accessed through the `__tests__/shared` symlink
- **testEnvironment**: Use `'node'` for pure utilities, `'jsdom'` for React components
- **setupFilesAfterEnv**: The shared configuration will load a number of stock mocks, defined here
- **moduleNameMapper**: Map workspace packages to their `src` folders (not `dist`) for testing
- **transformIgnorePatterns**: Allow transpilation of ESM-only packages

##### Step 5: Create Source Entry Point

Create `web-ui/packages/[package-name]/src/index.ts`:

```typescript
// Export types first (using type-only exports where possible)
export type { YourType, AnotherType } from "./types";

// Then export implementations
export { yourFunction, YourClass } from "./implementation";
export { helperFunction } from "./helpers";

// Error types and utilities
export { YourError } from "./errors";
export type { YourErrorOptions } from "./errors";
```

**Key points:**

- **Type exports first**: Group type exports at the top using `export type` syntax
- **Clear organization**: Export related functionality together
- **Explicit exports**: List each export individually for clarity
- **Follow conventions**: Match the pattern used in existing packages (see `lib-logger/src/index.ts`)

##### Step 6: Implement Package Source Code

Create your implementation files in `web-ui/packages/[package-name]/src/`:

- Use clear, descriptive filenames
- Keep files focused on a single responsibility
- Follow existing code conventions from similar packages
- Use TypeScript for all implementation files
- Create separate `.d.ts` files for complex type definitions if needed

##### Step 7: Add Tests

Create test files in `web-ui/packages/[package-name]/__tests__/`:

```typescript
// Example: __tests__/my-feature.test.ts
import { myFunction } from "../src/my-feature";

describe("myFunction", () => {
  it("should do what it is supposed to do", () => {
    const result = myFunction("input");
    expect(result).toBe("expected output");
  });

  it("should handle edge cases", () => {
    expect(() => myFunction(null)).toThrow();
  });
});
```

**Key points:**

- **Test files**: Use `*.test.ts` or `*.test.tsx` naming convention
- **Import from source**: Import directly from `../src/` during development
- **Comprehensive tests**: Cover happy paths, edge cases, and error conditions
- **Run tests**: Use `yarn test`

##### Step 8: Add Package to App Dependencies

If the app package needs to use your new package, add it to `web-ui/packages/app/package.json`:

```package.json
{
  "dependencies": {
    "@compliance-theater/[package-name]": "workspace:*"
  }
}
```

and `web-ui/packages/app/tsconfig.json`:

```tsconfig.json
{
  "references": [
    -- Pre-existing entries --
    {
      "path": "../lib-[package-name]"
    }
  ]
}
```

Then run:

```bash
cd web-ui
yarn install
```

**Key points:**

- **workspace:\* protocol**: Always use this for local package references
- **Run yarn install**: This creates symlinks in node_modules pointing to your package

##### Step 9: Build and Test Your Package

```bash
# Build the package
cd web-ui/packages/[package-name]
yarn build

# Run tests
yarn test

# Or from workspace root:
cd web-ui
yarn build
yarn test
```

##### Step 10: Import and Use in Application Code

In your application code (or other packages), import your new package:

```typescript
// Named imports
import { myFunction, MyType } from "@compliance-theater/[package-name]";

// Submodule imports (if you have multiple entry points)
import { specificFunction } from "@compliance-theater/[package-name]/submodule";
```

##### Step 11: Verify End-to-End

1. **Build all packages**: `cd web-ui && yarn build`
2. **Run all tests**: `cd web-ui && yarn test`
3. **Start development server**: `cd web-ui && yarn dev`
4. **Verify in browser/runtime**: Ensure your package works correctly when used

#### Common Patterns and Best Practices

##### Workspace Dependencies with `workspace:*`

Always reference local packages using the workspace protocol:

```json
{
  "dependencies": {
    "@compliance-theater/logger": "workspace:*",
    "@compliance-theater/typescript": "workspace:*"
  }
}
```

This ensures Yarn creates symlinks to local packages rather than trying to fetch them from a registry.

##### Jest Module Mapping

In shared Jest config, map workspace packages to their `src` directories:

```javascript
moduleNameMapper: {
  "^@compliance-theater/logger(.*)$": "<rootDir>/../lib-logger/src$1",
}
```

This allows Jest to test against source files directly, enabling better debugging and coverage.

##### Project References

For packages with dependencies on other workspace packages, add TypeScript project references:

```json
{
  "references": [{ "path": "../lib-logger" }, { "path": "../lib-typescript" }]
}
```

This enables TypeScript to build packages in the correct order and provides better IDE support.

##### Shared Test Setup Files

All packages share common test setup files and mocks via symbolic links:

```bash
# Structure
packages/
├── __tests__/              # Shared test configuration (one copy)
│   ├── jest.config-shared.mjs
│   └── setup/
│       ├── jest.mock-log.ts
│       ├── jest.env-vars.ts
│       └── ...
├── __mocks__/              # Shared mocks (one copy)
│   ├── instrumentation.ts
│   ├── keycloak-provider.js
│   └── ...
└── [package-name]/
    ├── __tests__/
    │   └── shared -> ../../__tests__  # Symlink to packages/__tests__
    └── __mocks__/
        └── shared -> ../../__mocks__  # Symlink to packages/__mocks__
```

**How it works:**

- All shared test setup and mock files live in `packages/__tests__/` and `packages/__mocks__/`
- Each package creates symbolic links: `__tests__/shared` and `__mocks__/shared`
- In Jest config, reference setup files via the symlink:

```javascript
setupFilesAfterEnv: [
  "<rootDir>/__tests__/shared/setup/jest.mock-log.ts",
  "<rootDir>/__tests__/shared/setup/jest.env-vars.ts",
];
```

**Benefits:**

- Single source of truth for test configuration
- No duplication of mock files
- Easy to update shared setup across all packages
- Follows the pattern used by the app package

**Creating the symlinks:**

```bash
# In your package directory
cd web-ui/packages/[package-name]
mkdir -p __tests__ && cd __tests__ && ln -sf ../../__tests__ shared && cd ..
mkdir -p __mocks__ && cd __mocks__ && ln -sf ../../__mocks__ shared && cd ..
```

##### Package Naming Conventions

- **Libraries**: `lib-[name]` (e.g., `lib-logger`, `lib-database`)
- **Features**: `[feature-name]` (e.g., `instrument`, `data-models`)
- **Components**: `components` or `ui-components`
- **Test Utilities**: `test-utils`

##### Export Patterns

Follow consistent export patterns in `src/index.ts`:

```typescript
// 1. Type exports (with 'export type' syntax)
export type { ILogger, EventSeverity } from "./types";

// 2. Constants and enums
export { KnownSeverityLevel } from "./constants";

// 3. Main functionality
export { logger, log, logEvent } from "./core";

// 4. Utilities
export { errorLogFactory } from "./utilities";

// 5. Error handling
export { LoggedError, dumpError } from "./errors";
export type { LoggedErrorOptions } from "./errors";
```

This organization makes it easy for consumers to find what they need.

##### Dependency Management

Follow this dependency order to avoid circular dependencies:

1. **No dependencies**: `lib-logger`, `lib-env`, `lib-typescript`
2. **Depends on (1)**: `lib-send-api-request`, `lib-redis-client`, `lib-database`
3. **Depends on (2)**: `lib-site-util`, `lib-react-util`
4. **Depends on (3)**: `lib-nextjs-util`, `lib-auth`
5. **Feature packages**: `instrument`, `data-models`, `components`

Always extract packages in this order during refactoring.

#### Troubleshooting

##### "Cannot find module '@compliance-theater/[package-name]'"

1. Verify package is listed in `package.json` dependencies with `workspace:*`
2. Run `yarn install` from workspace root
3. Check that `node_modules/@compliance-theater/[package-name]` exists as a symlink
4. Verify the package `exports` map includes `default` and `workspace-source` entries
5. Rebuild the package: `yarn build`

##### "Module not found" in tests

1. Check Jest `moduleNameMapper` points to `src` not `dist`
2. Verify test imports use published package name, not relative paths
3. Check `transformIgnorePatterns` allows transpilation of your package
4. Run `yarn test` with `--no-cache` to clear Jest cache

##### TypeScript cannot find types

1. Verify `tsconfig.json` has `composite: true`
2. Check `declaration: true` and `declarationMap: true` are set
3. Build the package to generate `.d.ts` files
4. Verify `package.json` `types` and `exports` declarations point to generated declaration files
5. Check consuming package has project reference to your package

##### Circular dependency errors

1. Review the dependency order (see Dependency Management section)
2. Check for imports that create cycles
3. Consider extracting shared types to a separate package
4. Use dependency injection or interfaces to break cycles

#### Summary Checklist

When creating a new package, verify:

- [ ] Package directory created under `web-ui/packages/[package-name]/`
- [ ] `package.json` with proper name, version, exports, and workspace dependencies
- [ ] `tsconfig.json` extending base config with proper references
- [ ] `__tests__/shared` and `__mocks__/shared` symlinks created
- [ ] `jest.config.mjs` created and inheriting from shared symlinked base.
- [ ] `src/index.ts` with organized exports
- [ ] Implementation files in `src/`
- [ ] Tests in `__tests__/`
- [ ] Package added to app dependencies (if needed)
- [ ] App dependency added and exports conditions verified (if needed)
- [ ] Package builds successfully: `yarn build`
- [ ] Tests pass: `yarn test`
- [ ] Can be imported in application code
- [ ] Documentation added to package README (optional but recommended)

#### Additional Resources

- **Existing Examples**: Review `lib-logger`, `lib-env`, `lib-typescript`, `lib-send-api-request` for reference implementations
- **Turborepo**: https://turbo.build/repo/docs
- **Yarn Workspaces**: https://classic.yarnpkg.com/en/docs/workspaces/
- **TypeScript Project References**: https://www.typescriptlang.org/docs/handbook/project-references.html

### Making Changes

1. Edit code in any package
2. Run `yarn dev` to watch all packages
3. Changes hot-reload in dependent packages
4. Run `yarn test` to verify
5. Run `yarn build` before committing

### Debugging

- Use `yarn <script>` to run package scripts
- Use `turbo run build --filter=@compliance-theater/package-name` to build specific package
- Check `node_modules/@compliance-theater/` for symlinked packages
- Use `yarn workspaces info` to see dependency graph

## References

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Yarn Workspaces](https://classic.yarnpkg.com/en/docs/workspaces/)
- [Monorepo Best Practices](https://monorepo.tools/)
