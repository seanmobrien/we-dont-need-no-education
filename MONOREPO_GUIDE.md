# Monorepo Refactoring Guide

## Overview

This document describes the monorepo refactoring of the Title IX Victim Advocacy Platform from a single `web-ui` application to a traditional monorepo structure with packages under `packages/`.

## Completed Work (Phase 1)

### Infrastructure Setup ✅
1. **Root Package Configuration**
   - Updated `package.json` to use `packages/*` workspace
   - Added Turborepo (`turbo@^2.3.3`) for build orchestration
   - Added monorepo-level scripts (dev, build, test, lint)
   - Set explicit `packageManager` to `yarn@1.22.22`

2. **Build Orchestration**
   - Created `turbo.json` with task pipelines for:
     - `build`: Builds packages with dependency order
     - `dev`: Development mode (no caching)
     - `test`: Unit tests with coverage
     - `test:e2e`: End-to-end tests
     - `lint`: Linting across packages

3. **Testing Infrastructure**
   - Created root `jest.config.mjs` for coordinating package tests
   - Configured to collect coverage from all packages
   - Set up project references for multi-package testing

4. **Main Application Move**
   - Moved `web-ui/` → `packages/app/` using `git mv` (preserves history)
   - Updated package name from `compliance-theater` → `@repo/app`
   - Removed nested workspace configuration from app package.json

5. **CI/CD Updates**
   - Updated `.github/workflows/web-ui-docker-deploy.yml` to use `packages/app` paths
   - All Docker build contexts now point to `./packages/app`
   - Environment file generation updated for new structure

6. **Repository Cleanup**
   - Removed obsolete `web-ui/Dockerfile` ignore rule from `.gitignore`
   - Preserved all existing `.gitignore` rules for monorepo

## Remaining Work

### Phase 2: Extract Core Library Packages

Each package extraction follows this pattern:
1. Create `packages/[name]/` directory
2. Move source files from `packages/app/lib/[name]`
3. Create package.json with proper exports
4. Create tsconfig.json for TypeScript
5. Set up package-specific jest.config.mjs
6. Update imports in app and other packages
7. Test that package works independently

#### Packages to Extract

**Critical Infrastructure** (extract first, few dependencies):
- `packages/lib-logger` ← `packages/app/lib/logger`
- `packages/lib-typescript` ← `packages/app/lib/typescript`
- `packages/lib-send-api-request` ← `packages/app/lib/send-api-request`

**Data Layer** (depends on logger, typescript):
- `packages/lib-database` ← merge:
  - `packages/app/drizzle/`
  - `packages/app/lib/drizzle-db/`
  - `packages/app/lib/neondb/`
- `packages/lib-redis-client` ← `packages/app/lib/redis-client`

**Utilities** (depends on above):
- `packages/lib-site-util` ← `packages/app/lib/site-util`
- `packages/lib-react-util` ← `packages/app/lib/react-util`
- `packages/lib-nextjs-util` ← `packages/app/lib/nextjs-util`

**Authentication** (depends on database):
- `packages/lib-auth` ← `packages/app/lib/auth`

**Error Handling** (depends on logger):
- `packages/lib-error-monitoring` ← `packages/app/lib/error-monitoring`

### Phase 3: Extract Feature Packages

**Instrumentation** (depends on logger, error-monitoring):
- `packages/instrument` ← `packages/app/instrument/`

**Data Models** (depends on database):
- `packages/data-models` ← `packages/app/data-models/`

**Components** (depends on react-util, themes):
- `packages/components` ← merge:
  - `packages/app/components/`
  - `packages/app/lib/components/`

**Optional Feature Libraries** (evaluate if worth extracting):
- `packages/lib-ai` ← `packages/app/lib/ai/`
- `packages/lib-api` ← `packages/app/lib/api/`
- `packages/lib-email` ← `packages/app/lib/email/`
- `packages/lib-hooks` ← `packages/app/lib/hooks/`
- `packages/lib-config` ← `packages/app/lib/config/`
- `packages/lib-styles` ← `packages/app/lib/styles/`
- `packages/lib-themes` ← `packages/app/lib/themes/`

### Phase 4: Test Utilities

**Shared Test Infrastructure**:
- `packages/test-utils` ← extract from:
  - `packages/app/__tests__/setup/jest.setup.ts`
  - `packages/app/__tests__/test-utils.tsx`
  - `packages/app/__tests__/mocks/`
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
  "files": [
    "dist"
  ],
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
- Stay in `packages/app/__tests__/`
- Test interactions between packages
- Use workspace protocol to reference packages

**E2E Tests**:
- Stay in `packages/app/tests/e2e/`
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
- Main Dockerfile stays in `packages/app/`
- Uses workspace dependencies via Yarn
- Build context includes root for workspace resolution

**GitHub Actions**:
- Already updated for `packages/app` paths
- May need updates when packages are extracted
- Should leverage Turbo's caching in CI

## Development Workflow

### Adding a New Package

1. Create directory: `packages/new-package/`
2. Create package.json with `@repo/new-package` name
3. Create `src/index.ts` as main entry point
4. Create `tsconfig.json` extending root
5. Add to `packages/app/package.json` dependencies:
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
