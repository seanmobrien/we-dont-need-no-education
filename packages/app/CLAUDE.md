# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development

- `yarn dev` - Start development server on port 3000
- `yarn build` - Build production bundle
- `yarn start` - Start production server
- `yarn lint` - Run ESLint checks
- `yarn test` - Run Jest unit tests
- `yarn test:serial` - Run tests in serial (single-threaded)
- `yarn test:concurrency-stress` - Run tests with high concurrency for stress testing

### Single Test Execution

- `yarn test <test-file-path>` - Run specific test file
- `yarn test --testNamePattern="<pattern>"` - Run tests matching pattern
- `yarn test:serial <test-file-path>` - Run specific test file in serial mode

### Database Operations

- `npx drizzle-kit migrate` - Run database migrations
- `npx drizzle-kit generate:pg` - Generate PostgreSQL schema types
- `npx drizzle-kit studio` - Open Drizzle Studio database viewer

## Project Architecture

### Technology Stack

- **Framework**: Next.js 15 with App Router and TypeScript
- **UI Library**: Material UI 7.x with custom theming system
- **Database**: PostgreSQL with Drizzle ORM for type-safe queries
- **Authentication**: NextAuth.js 5.x with Azure AD and Google providers
- **AI Integration**: Vercel AI SDK with Azure OpenAI and Google Gemini providers
- **State Management**: React Query for server state, React Context for UI state
- **Testing**: Jest with React Testing Library and jsdom environment

### Key Architectural Patterns

#### Multi-Provider AI System

The codebase uses a sophisticated AI model factory (`lib/ai/aiModelFactory.ts`) that supports:

- **Azure OpenAI Models**: `hifi` (GPT-4), `lofi` (GPT-3.5), `completions`, `embedding`
- **Google Gemini Models**: `gemini-pro`, `gemini-flash`, `google-embedding`
- **Model Availability Management**: Programmatic enabling/disabling of models and providers
- **Automatic Failover**: Rate limit handling with provider switching
- **Middleware Integration**: Redis caching and retry mechanisms

Usage: `const model = aiModelFactory('hifi')` - automatically selects best available provider

#### Repository Pattern with Drizzle ORM

Database operations use a consistent repository pattern:

- Base repository class: `lib/api/_baseDrizzleRepository.ts`
- Type-safe queries with Drizzle schema definitions
- Automatic query builders for common operations
- Example: `EmailRepository.findByTitleIXViolations()`

#### Server-Bound Data Grids

Custom Material UI data grid implementation for large datasets:

- Server-side pagination, filtering, and sorting
- Type-safe column definitions and value getters
- Bulk operations support
- Location: `components/mui/data-grid/server-bound-data-grid.tsx`

#### MCP (Model Context Protocol) Integration

Advanced tool system for AI interactions:

- Client-side and server-side tool providers
- Instrumented transport for observability
- Tool factory patterns for extensibility
- Location: `lib/ai/mcp/` directory

### Directory Structure Highlights

#### `/app` - Next.js App Router

- `/api` - API routes with type-safe handlers
- `/auth` - Authentication pages and flows
- `/messages/email` - Evidence management interface

#### `/components` - Reusable UI Components

- `/ai/chat-panel` - AI chat interface with docking/floating modes
- `/email-message` - Evidence viewing and management components
- `/mui` - Material UI customizations and extensions

#### `/lib` - Core Libraries

- `/ai` - AI model management, tools, and middleware
- `/api` - Repository patterns and data access
- `/drizzle-db` - Database schema and connection management
- `/react-util` - React hooks and utilities
- `/site-util` - Environment configuration and site utilities

#### `/data-models` - TypeScript Data Models

- API interfaces and validation schemas
- Shared types across frontend and backend
- Factory patterns for data creation

## Testing Configuration

### Jest Setup

- Environment: jsdom for React component testing
- Setup file: `__tests__/jest.setup.ts`
- Mocking: Instrumentation, metrics, and external services are mocked
- Concurrency: Limited workers (2 in CI, 50% locally) to prevent resource contention
- Timeout: 10 seconds for slower tests

#### Directory Structure Highlights

#### `__tests__` - Jest Unit Tests

- This is where Jest-based unit tests live, and is the project's primary test folder.
- Tests underneath this folder are ran with every build and deploy.

#### `tests` - Playwright UI Automation Tests

- This folder contains UI Automation tests that are not ran with every build
- Ran via the `tests:e2e` labled scripts; eg `yarn run tests:e2e`, `yarn run tests:e2e:safe`, etc.

### Key Testing Patterns

- IMPORTANT: **Always** load `__tests__/jest.config` and `__tests__/jest.setup.ts` and analyze them to gain a comprehensive undestanding of the test environment **before** writing or fixing tests.
- Component testing with React Testing Library
- API route testing with node-mocks-http
- Mock implementations for external services (Google APIs, Azure services)
- Snapshot testing for complex UI components
- Tests are located in the **tests** folder mirroring their site location. eg, `lib/module-1/test-module.tsx` would be tested by `__tests__/lib/module-1/test-module.test.tsx`.

### 🚨 Mandatory Test Environment Analysis (DO THIS FIRST)

You MUST perform the following analysis steps before adding, editing, or debugging any test. Skipping these steps has repeatedly led to duplicated mocks, incorrect import ordering, brittle tests, and wasted effort.

#### 1. Read and Understand the Global Test Harness

Checklist (all required):

1. Open and read `__tests__/jest.setup.ts`
2. Open and read `jest.config.ts` (or `__tests__/jest.config` if present)
3. Identify:
   - Globally mocked modules (auth, db, navigation, telemetry, etc.)
   - Global test environment (jsdom vs node)
   - Concurrency limits, timeouts, clear/reset behavior (e.g., `clearMocks`, `resetMocks`)
   - Any global side‑effects or polyfills
4. Note existing utilities/helpers you should reuse instead of recreating.

Do NOT write a local `jest.mock(...)` for something already mocked globally unless you have a documented reason and you restore the original afterward.

#### 2. Define the Test Contract Before Importing the SUT

Before the first `import` of the module under test (SUT):

1. List which branches / outcomes you need (e.g., authorized, unauthorized, notFound)
2. Decide which collaborators require mocking vs. real implementation
3. Prepare mocks FIRST, then import the SUT (if dependency order matters)

#### 3. Anti‑Patterns to Avoid

| Anti‑Pattern                                                    | Why It Hurts                                                  | Correct Approach                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Re‑mocking `auth` after SUT import                              | Original call already captured; test can’t influence behavior | Set implementation on existing global mock BEFORE import or via provided helper |
| Copy/paste of complex global mocks                              | Divergence & maintenance overhead                             | Reuse global mocks and override per test case                                   |
| Multiple invocations of async page component to “extract” props | Side effects consumed on first run                            | Capture props via shallow element inspection or exported pure helpers           |
| Using `any` in test helpers                                     | Masks type regressions                                        | Use discriminated unions / explicit interfaces                                  |

#### 4. Minimal Pre-Test Analysis Log (Recommended in PR Description)

Add a short section in your PR describing:

```
Test Env Review:
  Global mocks used: auth, drizzle-db, next/navigation (router hooks)
  Additional local mocks: isUserAuthorized, ChatHistory
  Branches covered: unauthorized, notFound (absent), notFound (unauthorized), success(title), success(undefined title)
  Import ordering enforced: mocks declared before dynamic import of page module
```

#### 5. Fast Sanity Commands

```
yarn test --testNamePattern="ChatDetailPage"  # Run only matching tests
yarn test __tests__/app/chat/chat-id/page.test.tsx  # Single file run
```

#### 6. PR Acceptance Gate (All Must Be True)

Tick these mentally (or list in PR) before requesting review:

- [ ] I read `jest.setup.ts` & `jest.config.ts` THIS SESSION (not relying on memory)
- [ ] I reused (not duplicated) existing global mocks
- [ ] I set mock implementations before importing the SUT when order mattered
- [ ] I avoided multiple executions of server components just to capture props
- [ ] I documented any deliberate divergence from global mocks

If any box is unchecked, pause and fix before continuing.

#### 7. When Unsure

If you are uncertain about a mock’s origin: search for it first (`grep` / workspace search) before redefining. Prefer extending over replacing.

> Summary Rule: “No test shall be authored or modified until the current global test environment (setup + config) has been freshly reviewed.” Treat this as a hard gate, not a suggestion.

## Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."

# Azure AD
AZURE_AD_CLIENT_ID="..."
AZURE_AD_CLIENT_SECRET="..."
AZURE_AD_TENANT_ID="..."

# Azure OpenAI
AZURE_OPENAI_ENDPOINT="https://..."
AZURE_API_KEY="..."
AZURE_OPENAI_DEPLOYMENT_COMPLETIONS="..."
AZURE_OPENAI_DEPLOYMENT_LOFI="..."
AZURE_OPENAI_DEPLOYMENT_HIFI="..."
AZURE_OPENAI_DEPLOYMENT_EMBEDDING="..."

# Google AI
GOOGLE_GENERATIVE_AI_API_KEY="..."

# Google APIs (Gmail integration)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

## Code Conventions

- Prefer arrow syntax over function definition
- Prefer type definition over interfaces

### Import Aliases

- `@/` - Root directory alias
- `@/lib` - Library modules
- `@/components` - UI components
- `@/data-models` - Type definitions

### AI Model Usage

```typescript
// Preferred pattern for AI model selection
const model = aiModelFactory('hifi'); // Auto-selects best available provider
const result = await generateText({ model, messages });

// Model availability checking
if (isModelAvailable('azure:hifi')) {
  // Use Azure hifi model
}

// Rate limit handling
handleAzureRateLimit(300000); // Disable Azure for 5 minutes
```

### Database Queries

```typescript
// Repository pattern usage
const emailRepo = new EmailRepository();
const emails = await emailRepo.findByTitleIXViolations(true);

// Direct Drizzle queries
const result = await db.query.emails.findMany({
  where: eq(emails.hasViolations, true),
  with: { attachments: true },
});
```

### Component Patterns

- Use Material UI components with custom theme
- Implement proper TypeScript interfaces for props
- Follow React 19 patterns with concurrent features
- Use React Query for server state management

## Package Management

- **Package Manager**: Yarn (enforced via preinstall script)
- **Node Version**: 22.x required
- **Key Dependencies**: React 19, Next.js 15, Material UI 7, Drizzle ORM
- **Dev Dependencies**: Jest, TypeScript, ESLint with Next.js config

## Build Configuration

### Next.js Configuration

- Bundle analyzer available with `ANALYZE=true yarn build`
- Server-side external packages configured for OpenTelemetry and database
- Webpack optimizations for package imports
- Vercel deployment support with standalone output option

### Performance Optimizations

- Package import optimization for major libraries
- Lightning CSS enabled for faster builds
- Web Vitals attribution configured for monitoring
- Bundle splitting for vendor and framework code
