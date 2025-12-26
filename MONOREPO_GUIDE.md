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
   - Updated package name from `compliance-theater` → `@repo/app`
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
- `web-ui/packages/lib-typescript` ← `web-ui/packages/app/lib/typescript`
- `web-ui/packages/lib-send-api-request` ← `web-ui/packages/app/lib/send-api-request`

**Data Layer** (depends on logger, typescript):

- `web-ui/packages/lib-database` ← merge:
  - `web-ui/packages/app/drizzle/`
  - `web-ui/packages/app/lib/drizzle-db/`
  - `web-ui/packages/app/lib/neondb/`
- `web-ui/packages/lib-redis-client` ← `web-ui/packages/app/lib/redis-client`

**Utilities** (depends on above):

- `web-ui/packages/lib-site-util` ← `web-ui/packages/app/lib/site-util`
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
- To: `@repo/lib-logger`

Use this script pattern:

```bash
find packages/app -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i 's|@/lib/logger|@repo/lib-logger|g' {} \;
```

### Phase 6: Package.json Templates

Each package needs:

```json
{
  "name": "@repo/[package-name]",
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
- Tests can be run independently: `yarn workspace @repo/lib-logger test`

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
yarn workspace @repo/lib-logger test

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

### Adding a New Package

1. Create directory: `web-ui/packages/new-package/`
2. Create package.json with `@repo/new-package` name
3. Create `src/index.ts` as main entry point
4. Create `tsconfig.json` extending root
5. Add to `web-ui/packages/app/package.json` dependencies:

   ```json
   "@repo/new-package": "workspace:*"
   ```

6. Import in code: `import { something } from '@repo/new-package'`
7. Run `yarn install` to link workspace

### Making Changes

1. Edit code in any package
2. Run `yarn dev` to watch all packages
3. Changes hot-reload in dependent packages
4. Run `yarn test` to verify
5. Run `yarn build` before committing

### Debugging

- Use `yarn workspace @repo/package-name <script>` to run package scripts
- Use `turbo run build --filter=@repo/package-name` to build specific package
- Check `node_modules/@repo/` for symlinked packages
- Use `yarn workspaces info` to see dependency graph

## Migration Checklist

- [x] Phase 1: Infrastructure Setup
- [ ] Phase 2: Extract Core Libraries
  - [ ] lib-logger
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
