# Monorepo Refactoring Guide

## Overview

This document describes the monorepo refactoring of the Title IX Victim Advocacy Platform from a single `web-ui` application to a traditional monorepo structure with packages under `web-ui/packages/`. This maintains clear separation between the Node.js frontend (web-ui) and Java backend (chat) solutions, with web-ui as a fully self-contained monorepo.

## Completed Work (Phase 1)

### Infrastructure Setup ✅

1. **Workspace Structure**

   - Created `web-ui/packages/` directory for monorepo packages
   - Moved application code to `web-ui/packages/app/`
   - Added Turborepo (`turbo@^2.3.3`) for build orchestration
   - Set explicit `packageManager` to `yarn@1.22.22`
   - Made web-ui completely self-contained with all config files

2. **Build Orchestration**

   - Created `web-ui/turbo.json` with task pipelines for:
     - `build`: Builds packages with dependency order
     - `dev`: Development mode (no caching)
     - `test`: Unit tests with coverage
     - `test:e2e`: End-to-end tests
     - `lint`: Linting across packages

3. **Testing Infrastructure**

   - Created `web-ui/jest.config.mjs` for coordinating package tests
   - Configured to collect coverage from all packages in `packages/*`
   - Set up project references for multi-package testing

4. **Main Application Move**

   - Moved original `web-ui/` → `web-ui/packages/app/` using `git mv` (preserves history)
   - Updated package name from `compliance-theater` → `@compliance-theater/app`
   - Created `web-ui/package.json` as workspace root

5. **CI/CD Updates**

   - Updated `.github/workflows/web-ui-docker-deploy.yml` to use `web-ui/packages/app` paths
   - Updated `.github/workflows/maven.yml` to reference `web-ui/yarn.lock`
   - All Docker build contexts now point to `./web-ui/packages/app`
   - Environment file generation updated for new structure

6. **Repository Cleanup**
   - Removed redundant root-level files (turbo.json, yarn.lock)
   - All Node.js configuration lives in `web-ui/`
   - Root package.json simplified to delegate to web-ui
   - Preserved all existing `.gitignore` rules for monorepo

## Repository Structure

```txt
/
├── web-ui/                    # Node.js monorepo (self-contained)
│   ├── packages/
│   │   └── app/              # Main Next.js application
│   ├── package.json          # Workspace configuration
│   ├── turbo.json            # Build orchestration
│   ├── jest.config.mjs       # Test configuration
│   └── yarn.lock             # Dependency lock file
├── chat/                     # Java backend (separate Maven project)
└── package.json              # Root (delegates to web-ui)
```

## Remaining Work

### Phase 2: Extract Core Library Packages

Each package extraction follows this pattern:

1. Create `web-ui/web-ui/packages/[name]/` directory
2. Move source files from `web-ui/web-ui/packages/app/lib/[name]`
3. Create package.json with proper exports
4. Create tsconfig.json for TypeScript
5. Set up package-specific jest.config.mjs
6. Update imports in app and other packages
7. Test that package works independently

#### Packages to Extract

**Critical Infrastructure** (extract first, few dependencies):

- `web-ui/packages/lib-logger` ← `web-ui/packages/app/lib/logger`
- `web-ui/packages/lib-env` ← `web-ui/packages/app/lib/site-util/env` NOTE: This functionality will need to be reworked slightly to become more generic
- `web-ui/packages/lib-typescript` ← `web-ui/packages/app/lib/typescript`
- `web-ui/packages/lib-send-api-request` ← `web-ui/packages/app/lib/send-api-request`

**Data Layer** (depends on logger, typescript):

- `web-ui/packages/lib-database` ← merge:
  - `web-ui/packages/app/drizzle/`
  - `web-ui/packages/app/lib/drizzle-db/`
  - `web-ui/packages/app/lib/neondb/`
- `web-ui/packages/lib-redis-client` ← `web-ui/packages/app/lib/redis-client`

**Utilities** (depends on above):

- `web-ui/packages/lib-site-util` ← `web-ui/packages/app/lib/site-util` NOTE: Extend @compliance-theater/env to include all currently exported variables in env object schemas
- `web-ui/packages/lib-react-util` ← `web-ui/packages/app/lib/react-util`
- `web-ui/packages/lib-nextjs-util` ← `web-ui/packages/app/lib/nextjs-util`

**Authentication** (depends on database):

- `web-ui/packages/lib-auth` ← `web-ui/packages/app/lib/auth`

**Error Handling** (depends on logger):

- `web-ui/packages/lib-error-monitoring` ← `web-ui/packages/app/lib/error-monitoring`

### Phase 3: Extract Feature Packages

**Instrumentation** (depends on logger, error-monitoring):

- `web-ui/packages/instrument` ← `web-ui/packages/app/instrument/`

**Data Models** (depends on database):

- `web-ui/packages/data-models` ← `web-ui/packages/app/data-models/`

**Components** (depends on react-util, themes):

- `web-ui/packages/components` ← merge:
  - `web-ui/packages/app/components/`
  - `web-ui/packages/app/lib/components/`

**Optional Feature Libraries** (evaluate if worth extracting):

- `web-ui/packages/lib-ai` ← `web-ui/packages/app/lib/ai/`
- `web-ui/packages/lib-api` ← `web-ui/packages/app/lib/api/`
- `web-ui/packages/lib-email` ← `web-ui/packages/app/lib/email/`
- `web-ui/packages/lib-hooks` ← `web-ui/packages/app/lib/hooks/`
- `web-ui/packages/lib-config` ← `web-ui/packages/app/lib/config/`
- `web-ui/packages/lib-styles` ← `web-ui/packages/app/lib/styles/`
- `web-ui/packages/lib-themes` ← `web-ui/packages/app/lib/themes/`

### Phase 4: Test Utilities

**Shared Test Infrastructure**:

- `web-ui/packages/test-utils` ← extract from:
  - `web-ui/packages/app/__tests__/setup/jest.setup.ts`
  - `web-ui/packages/app/__tests__/test-utils.tsx`
  - `web-ui/packages/app/__tests__/mocks/`
  - Common test helpers and fixtures

### Phase 5: Import Path Updates

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

```json
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
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch",
    "test": "jest",
    "lint": "eslint src/"
  },
  "dependencies": {
    // Package-specific dependencies
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5"
  }
}
```

### Phase 7: Testing Strategy

**Per-Package Tests**:

- Each package has `__tests__/` or `src/__tests__/`
- Each package has `jest.config.mjs` extending root config
- Tests can be run independently: `yarn workspace @compliance-theater/logger test`

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
yarn workspace @compliance-theater/logger test

# All unit tests
yarn test:unit

# E2E tests only
yarn test:e2e
```

### Phase 8: CI/CD Considerations

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

```json
{
  "name": "@compliance-theater/[package-name]",
  "version": "0.1.0",
  "private": true,
  "description": "Brief description of what this package does",
  "main": "./dist/index.js",
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
  "engines": {
    "node": ">=22.0.0",
    "yarn": ">=1.22.0"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc -b tsconfig.json",
    "build:typescript": "echo 'Building [package-name] typescript...' && tsc -b tsconfig.json && echo 'TypeScript build complete.' || (echo 'Typescript compile did not succeed' >&2; exit 1)",
    "test": "jest",
    "lint": "echo 'Linting [package-name]...'",
    "clean:build": "rimraf dist tsconfig.tsbuildinfo"
  },
  "dependencies": {
    // Add package-specific dependencies here
    // Use workspace:* protocol for local packages:
    // "@compliance-theater/logger": "workspace:*"
  },
  "peerDependencies": {
    // Add peer dependencies if needed (e.g., Next.js, React)
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "jest": "^30.0.5",
    "rimraf": "^6.1.2",
    "ts-jest": "^29.3.4",
    "typescript": "^5"
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

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "noEmit": false,
    "types": [
      "node",
      "jest"
    ]
  },
  "include": [
    "src/**/*.d.ts",
    "src/**/*.ts",
    "src/**/*.tsx"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ],
  "references": [
    // Add TypeScript project references for packages you depend on
    // Example:
    // { "path": "../lib-logger" }
  ]
}
```

**Key points:**
- **extends**: Always extend `../../tsconfig.base.json` for consistent base configuration
- **composite**: Must be `true` to enable TypeScript project references
- **No local path mappings**: Do not add `compilerOptions.paths` for workspace packages
- **references**: List all workspace packages this package depends on (must also be in `package.json`)

##### Step 4: Access Shared Jest Configuration

The shared Jest configuration is accessed via the symbolic link you created in Step 1. The shared configuration lives in `packages/__tests__/jest.config-shared.mjs` and is accessible to your package via `__tests__/shared/`.

**Note:** You don't need to create the shared config file - it already exists in `packages/__tests__/jest.config-shared.mjs` and is accessible through the symlink you created.

For reference, the shared configuration for packages without React dependencies (pure utilities) looks like this:

```javascript
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testEnvironmentOptions: {},
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/shared/setup/jest.mock-log.ts',
    '<rootDir>/__tests__/shared/setup/jest.env-vars.ts',
    // Add other setup files as needed
  ],
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx)',
    '!/.next/**',
    '!/dist/**',
  ],
  moduleNameMapper: {
    // Add mappings for mocks and workspace packages
    // Point to source files, not dist, during testing:
    // "^@compliance-theater/logger(.*)$": "<rootDir>/../lib-logger/src$1",
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
        },
      },
    ],
  },
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(?!(zodex|zod|got|react-error-boundary|openid-client))',
  ],
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!__(tests|mocks)__/**/*.*',
    '!dist/**/*.*',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  testTimeout: 1000,
  openHandlesTimeout: 1000,
  clearMocks: true,
  resetMocks: false,
};

export default config;
```

For packages with React dependencies:

```javascript
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',  // Changed from 'node'
  testEnvironmentOptions: {
    // Configure jsdom for React 19 concurrent features
    features: {
      FetchExternalResources: false,
      ProcessExternalResources: false,
    },
  },
  // ... rest same as above, but add React-specific mocks
  moduleNameMapper: {
    // CSS modules
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // MUI icons mock
    '^@mui/icons-material/(.*)$': '<rootDir>/__mocks__/shared/mui-icon-mock.tsx',
    // ... other mappings
  },
  // ... rest of config
};

export default config;
```

**Key points:**
- **Shared via symlink**: The shared configuration is accessed through the `__tests__/shared` symlink
- **testEnvironment**: Use `'node'` for pure utilities, `'jsdom'` for React components
- **setupFilesAfterEnv**: List setup files that run before each test (accessed via shared symlink)
- **moduleNameMapper**: Map workspace packages to their `src` folders (not `dist`) for testing
- **transformIgnorePatterns**: Allow transpilation of ESM-only packages

##### Step 5: Create Package Jest Configuration

Create `web-ui/packages/[package-name]/jest.config.mjs`:

```javascript
import baseConfig from './__tests__/shared/jest.config-shared.mjs';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  displayName: "Libraries: [package-name]",
  preset: "ts-jest",
  testEnvironment: "node",  // or "jsdom" for React
  rootDir: ".",
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    // Add package-specific mappings to map published paths to source:
    "^@compliance-theater/[package-name]/(.*)$": "<rootDir>/src/$1",
    "^@compliance-theater/[package-name]$": "<rootDir>/src",
  },
};

export default config;
```

**Key points:**
- **Import shared config**: Always import from `./__tests__/shared/jest.config-shared.mjs`
- **Spread baseConfig**: Use `...baseConfig` to inherit shared configuration
- **moduleNameMapper**: Override/extend to map your package's published imports back to source files during tests

##### Step 6: Create Source Entry Point

Create `web-ui/packages/[package-name]/src/index.ts`:

```typescript
// Export types first (using type-only exports where possible)
export type { YourType, AnotherType } from './types';

// Then export implementations
export { yourFunction, YourClass } from './implementation';
export { helperFunction } from './helpers';

// Error types and utilities
export { YourError } from './errors';
export type { YourErrorOptions } from './errors';
```

**Key points:**
- **Type exports first**: Group type exports at the top using `export type` syntax
- **Clear organization**: Export related functionality together
- **Explicit exports**: List each export individually for clarity
- **Follow conventions**: Match the pattern used in existing packages (see `lib-logger/src/index.ts`)

##### Step 7: Implement Package Source Code

Create your implementation files in `web-ui/packages/[package-name]/src/`:

- Use clear, descriptive filenames
- Keep files focused on a single responsibility
- Follow existing code conventions from similar packages
- Use TypeScript for all implementation files
- Create separate `.d.ts` files for complex type definitions if needed

##### Step 8: Add Tests

Create test files in `web-ui/packages/[package-name]/__tests__/`:

```typescript
// Example: __tests__/my-feature.test.ts
import { myFunction } from '../src/my-feature';

describe('myFunction', () => {
  it('should do what it is supposed to do', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });

  it('should handle edge cases', () => {
    expect(() => myFunction(null)).toThrow();
  });
});
```

**Key points:**
- **Test files**: Use `*.test.ts` or `*.test.tsx` naming convention
- **Import from source**: Import directly from `../src/` during development
- **Comprehensive tests**: Cover happy paths, edge cases, and error conditions
- **Run tests**: Use `yarn workspace @compliance-theater/[package-name] test`

##### Step 9: Add Package to App Dependencies

If the app package needs to use your new package, add it to `web-ui/packages/app/package.json`:

```json
{
  "dependencies": {
    "@compliance-theater/[package-name]": "workspace:*"
  }
}
```

Then run:

```bash
cd web-ui
yarn install
```

**Key points:**
- **workspace:* protocol**: Always use this for local package references
- **Run yarn install**: This creates symlinks in node_modules pointing to your package

##### Step 10: Update App Package Configuration (if needed)

If the app needs to import your package, add it as a workspace dependency in `web-ui/packages/app/package.json`:

```json
{
  "dependencies": {
    "@compliance-theater/[package-name]": "workspace:*"
  }
}
```

Then ensure the package exposes both `default` and `workspace-source` conditions in its `exports` map so app builds can resolve the right target by environment.

##### Step 11: Build and Test Your Package

```bash
# Build the package
cd web-ui/packages/[package-name]
yarn build

# Run tests
yarn test

# Or from workspace root:
cd web-ui
yarn workspace @compliance-theater/[package-name] build
yarn workspace @compliance-theater/[package-name] test
```

##### Step 12: Import and Use in Application Code

In your application code (or other packages), import your new package:

```typescript
// Named imports
import { myFunction, MyType } from '@compliance-theater/[package-name]';

// Submodule imports (if you have multiple entry points)
import { specificFunction } from '@compliance-theater/[package-name]/submodule';
```

##### Step 13: Verify End-to-End

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

##### Exports-Based Workspace Resolution

Do not use per-package `tsconfig.json` path mapping for local workspace packages. Resolution is controlled by package `exports` conditions:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "workspace-source": "./src/index.ts",
      "default": "./dist/index.js"
    },
    "./*": {
      "types": "./dist/*.d.ts",
      "workspace-source": "./src/*.ts",
      "default": "./dist/*.js"
    }
  }
}
```

`WORKSPACE_SOURCE_IMPORTS=1` enables source-first resolution for local development/debug builds (via the `workspace-source` condition).  
`WORKSPACE_SOURCE_IMPORTS=0` uses published-style `default` exports (dist) for publish builds.

##### Jest Module Mapping

In Jest config, map workspace packages to their `src` directories:

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
  "references": [
    { "path": "../lib-logger" },
    { "path": "../lib-typescript" }
  ]
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
  '<rootDir>/__tests__/shared/setup/jest.mock-log.ts',
  '<rootDir>/__tests__/shared/setup/jest.env-vars.ts',
]
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
export type { ILogger, EventSeverity } from './types';

// 2. Constants and enums
export { KnownSeverityLevel } from './constants';

// 3. Main functionality
export { logger, log, logEvent } from './core';

// 4. Utilities
export { errorLogFactory, getStackTrace } from './utilities';

// 5. Error handling
export { LoggedError, dumpError } from './errors';
export type { LoggedErrorOptions } from './errors';
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
5. Rebuild the package: `yarn workspace @compliance-theater/[package-name] build`

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
- [ ] `jest.config.mjs` and shared config created
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

- Use `yarn workspace @compliance-theater/package-name <script>` to run package scripts
- Use `turbo run build --filter=@compliance-theater/package-name` to build specific package
- Check `node_modules/@compliance-theater/` for symlinked packages
- Use `yarn workspaces info` to see dependency graph

## Migration Checklist

- [x] Phase 1: Infrastructure Setup
- [ ] Phase 2: Extract Core Libraries
  - [ ] lib-logger
  - [ ] lib-env
  - [ ] lib-typescript
  - [ ] lib-send-api-request
  - [ ] lib-database (merge drizzle + drizzle-db + neondb)
  - [ ] lib-redis-client
  - [ ] lib-site-util
  - [ ] lib-react-util
  - [ ] lib-nextjs-util
  - [ ] lib-auth
  - [ ] lib-error-monitoring
- [ ] Phase 3: Extract Features
  - [ ] instrument
  - [ ] data-models
  - [ ] components (merge components + lib/components)
  - [ ] Evaluate: lib-ai, lib-api, lib-email, etc.
- [ ] Phase 4: Test Utilities
  - [ ] Extract test-utils package
  - [ ] Update test imports
- [ ] Phase 5: Import Path Updates
  - [ ] Update all `@/lib/*` imports
  - [ ] Update all `@/components/*` imports
  - [ ] Update all `@/data-models/*` imports
- [ ] Phase 6: Testing
  - [ ] All unit tests pass
  - [ ] All integration tests pass
  - [ ] All E2E tests pass
- [ ] Phase 7: Documentation
  - [ ] Update README.md
  - [ ] Update copilot-instructions.md
  - [ ] Add package-specific READMEs
- [ ] Phase 8: CI/CD
  - [ ] Verify Docker builds work
  - [ ] Verify GitHub Actions work
  - [ ] Add Turbo remote caching (optional)

## Benefits

1. **Modularity**: Clear boundaries between concerns
2. **Reusability**: Packages can be shared across apps
3. **Testing**: Independent package testing
4. **Performance**: Turbo's intelligent caching
5. **Developer Experience**: Better code organization and IDE support
6. **Scalability**: Easy to add new apps/packages

## References

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Yarn Workspaces](https://classic.yarnpkg.com/en/docs/workspaces/)
- [Monorepo Best Practices](https://monorepo.tools/)
