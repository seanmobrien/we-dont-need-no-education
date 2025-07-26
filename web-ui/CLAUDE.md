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

### Key Testing Patterns
- IMPORTANT: **Always** load ```__tests__/jest.config``` and ```__tests__/jest.setup.ts``` and analyze them to gain a comprehensive undestanding of the test environment **before** writing or fixing tests. 
- Component testing with React Testing Library
- API route testing with node-mocks-http
- Mock implementations for external services (Google APIs, Azure services)
- Snapshot testing for complex UI components
- Tests are located in the __tests__ folder mirroring their site location.  eg, ```lib/module-1/test-module.tsx``` would be tested by  ```__tests__/lib/module-1/test-module.test.tsx```. 

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
  with: { attachments: true }
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