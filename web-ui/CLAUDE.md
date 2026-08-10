# CLAUDE.md — Web UI Workspace

This file provides guidance to Claude Code when working with code in the `web-ui` workspace. For app-specific guidance see `packages/app/CLAUDE.md`.

## Platform Overview

### Technology Stack

- **Framework**: Next.js 15 with App Router and TypeScript
- **UI Library**: Material UI 9.x with custom theming system
- **Database**: PostgreSQL with Drizzle ORM for type-safe queries
- **Authentication**: NextAuth.js 5.x with Azure AD and Google providers
- **AI Integration**: Vercel AI SDK with Azure OpenAI and Google Gemini providers
- **State Management**: React Query for server state, React Context for UI state
- **Testing**: Jest with React Testing Library and jsdom environment

### Key Architectural Patterns

#### Multi-Provider AI System

The codebase uses a sophisticated AI model factory (`packages/app/lib/ai/aiModelFactory.ts`) that supports:

- **Azure OpenAI Models**: `hifi` (GPT-4), `lofi` (GPT-3.5), `completions`, `embedding`
- **Google Gemini Models**: `gemini-pro`, `gemini-flash`, `google-embedding`
- **Model Availability Management**: Programmatic enabling/disabling of models and providers
- **Automatic Failover**: Rate limit handling with provider switching
- **Middleware Integration**: Redis caching and retry mechanisms

Usage: `const model = aiModelFactory('hifi')` — automatically selects best available provider

#### Repository Pattern with Drizzle ORM

Database operations use a consistent repository pattern:

- Base repository class: `packages/app/lib/api/_baseDrizzleRepository.ts`
- Type-safe queries with Drizzle schema definitions
- Automatic query builders for common operations
- Example: `EmailRepository.findByTitleIXViolations()`

#### Server-Bound Data Grids

Custom Material UI data grid implementation for large datasets:

- Server-side pagination, filtering, and sorting
- Type-safe column definitions and value getters
- Bulk operations support
- Location: `packages/app/components/mui/data-grid/server-bound-data-grid.tsx`

#### MCP (Model Context Protocol) Integration

Advanced tool system for AI interactions:

- Client-side and server-side tool providers
- Instrumented transport for observability
- Tool factory patterns for extensibility
- Location: `packages/app/lib/ai/mcp/`

### App Directory Structure

The main application lives at `packages/app/`:

- `/app` — Next.js App Router (API routes, auth pages, evidence management UI)
- `/components` — Reusable UI components (chat panel, email viewers, MUI extensions)
- `/lib` — Core libraries (AI model management, repository pattern, site utilities)
- `/data-models` — API interfaces, validation schemas, shared types

### Lib Packages

The `packages/lib-*` packages provide shared functionality consumed by the app:

- `lib-auth` — Authentication utilities and providers
- `lib-database` — Drizzle ORM schema and database connection management
- `lib-env` — Environment variable management
- `lib-feature-flags` — Feature flag integration
- `lib-fetch` — HTTP fetch utilities
- `lib-logger` — Structured logging
- `lib-nextjs` — Next.js server utilities
- `lib-react` — Shared React components and hooks
- `lib-redis` — Redis client and caching utilities
- `lib-themes` — Material UI theme definitions
- `lib-types` — Shared TypeScript type definitions
- `lib-typescript` — TypeScript utility types and helpers

## Testing

### Shared Jest Architecture

All packages share the same jest architecture:

- Tests live in `__tests__/` at the package root, mirroring source structure (e.g. `src/foo/bar.ts` → `__tests__/foo/bar.test.ts`)
- Each package has a shared base config at `__tests__/shared/jest.config-shared.mjs` extended by the package's `jest.config.mjs`
- `clearMocks: true` is set globally — **never** call `jest.clearAllMocks()` or `jest.resetAllMocks()` in test files; use targeted `mockFn.mockClear()` / `mockFn.mockReset()` only for mocks owned by that suite
- `resetMocks: false` — mock implementations set in setup files persist across tests within a file

### 🚨 Mandatory Test Environment Analysis (DO THIS FIRST)

You MUST perform the following analysis steps before adding, editing, or debugging any test. Skipping these steps has repeatedly led to duplicated mocks, incorrect import ordering, brittle tests, and wasted effort.

#### 1. Read and Understand the Global Test Harness

Checklist (all required):

1. Open and read the package's `jest.config.mjs`
2. Open and read the `setupFilesAfterEnv` entries it references
3. Identify:
   - Globally mocked modules (auth, db, navigation, telemetry, etc.)
   - Global test environment (jsdom vs node)
   - Concurrency limits, timeouts, clear/reset behavior (`clearMocks`, `resetMocks`)
   - Any global side-effects or polyfills
4. Note existing utilities/helpers you should reuse instead of recreating.

Hard rule for mock resets:
- Do not use `jest.clearAllMocks()` or `jest.resetAllMocks()` as a broad reset strategy in suites.
- Use targeted resets only (`mockFn.mockClear()` / `mockFn.mockReset()`) for mocks owned by the suite.

Do NOT write a local `jest.mock(...)` for something already mocked globally unless you have a documented reason and you restore the original afterward.

#### 2. Define the Test Contract Before Importing the SUT

Before the first `import` of the module under test (SUT):

1. List which branches / outcomes you need (e.g., authorized, unauthorized, notFound)
2. Decide which collaborators require mocking vs. real implementation
3. Prepare mocks FIRST, then import the SUT (if dependency order matters)

#### 3. Anti-Patterns to Avoid

| Anti-Pattern                                                    | Why It Hurts                                                  | Correct Approach                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Re-mocking `auth` after SUT import                              | Original call already captured; test can't influence behavior | Set implementation on existing global mock BEFORE import or via provided helper |
| Copy/paste of complex global mocks                              | Divergence & maintenance overhead                             | Reuse global mocks and override per test case                                   |
| Multiple invocations of async page component to "extract" props | Side effects consumed on first run                            | Capture props via shallow element inspection or exported pure helpers           |
| Using `any` in test helpers                                     | Masks type regressions                                        | Use discriminated unions / explicit interfaces                                  |

#### 4. When Unsure

If you are uncertain about a mock's origin: search for it first before redefining. Prefer extending over replacing.

> Summary Rule: "No test shall be authored or modified until the current global test environment (setup + config) has been freshly reviewed." Treat this as a hard gate, not a suggestion.

## Code Conventions

- Prefer arrow syntax over function definitions
- Prefer `type` over `interface` for data structures
- Use Material UI components with the custom theme
- Use React Query for server state management
- Follow React 19 patterns with concurrent features

## Package Management

- **Package Manager**: Yarn (enforced via preinstall script)
- **Node Version**: 22.x required
- **Key Dependencies**: React 19, Next.js 15, Material UI 7, Drizzle ORM
