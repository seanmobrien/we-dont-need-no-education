# CLAUDE.md — App Package

This file provides guidance specific to `web-ui/packages/app`, the main Next.js application. For platform-wide context see `../../CLAUDE.md`.

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

- `yarn drizzle-migrate` - Run database migrations
- `yarn drizzle-generate` - Generate Drizzle artifacts
- `yarn drizzle-studio` - Open Drizzle Studio database viewer

## Testing

### App-Specific Jest Setup

- Primary setup file: `__tests__/jest.setup.ts`
- Concurrency: Limited workers (2 in CI, 50% locally) to prevent resource contention
- Timeout: 10 seconds for slower tests

### Test Folders

- `__tests__/` — Jest unit tests; run on every build and deploy
- `tests/` — Playwright UI automation tests; run via `yarn tests:e2e` scripts

### Fast Sanity Commands

```
yarn test --testNamePattern="ChatDetailPage"   # Run only matching tests
yarn test __tests__/app/chat/chat-id/page.test.tsx  # Single file run
```

### PR Acceptance Gate (All Must Be True)

- [ ] I read `jest.setup.ts` & `jest.config.mjs` THIS SESSION (not relying on memory)
- [ ] I reused (not duplicated) existing global mocks
- [ ] I set mock implementations before importing the SUT when order mattered
- [ ] I avoided multiple executions of server components just to capture props
- [ ] I documented any deliberate divergence from global mocks

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

### Import Aliases

- `@/` — Root of this package (`web-ui/packages/app/`)
- `@/lib` — Library modules
- `@/components` — UI components
- `@/data-models` — Type definitions

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
