# NoEducation Web UI

> **Note**: This application is part of the `web-ui` monorepo workspace. For workspace-level commands and information about other packages, see the [workspace README](../../README.md).

A modern, AI-powered evidence management and analysis platform built with Next.js 15, Material UI 7, and multiple AI providers. This application provides intelligent email processing, document analysis, and chat-based evidence exploration with advanced multi-provider AI integration.

## Overview

This web application provides a comprehensive platform for email evidence management and analysis:

- **Email Management**: Import, organize, and analyze email communications with Gmail integration
- **AI-Powered Analysis**: Multi-provider AI system (Azure OpenAI + Google Gemini) for intelligent content processing
- **Chat Interface**: Interactive chat system for evidence exploration and analysis
- **Document Processing**: Advanced document parsing, embeddings, and search capabilities
- **Data Grid System**: Enterprise-grade data grids with server-side operations for large datasets
- **Authentication**: Secure authentication via Keycloak SSO

## Key Features

### Email Management System

- **Gmail Integration**: Direct import from Gmail accounts using Google APIs
- **Email Viewer**: Rich email display with attachment support and thread management
- **Search and Filter**: Advanced search capabilities across email content
- **Bulk Operations**: Mass email processing and management
- **Email Properties**: Structured analysis of email headers, content, and metadata

### AI-Powered Analysis

- **Multi-Provider AI**: Dual provider system with Azure OpenAI and Google Gemini models
- **Model Availability Management**: Automatic failover and rate limit handling between providers
- **Real-time Processing**: Live AI analysis with progress tracking
- **Chat Interface**: Interactive chat system for email exploration and analysis
- **Content Analysis**: Key points extraction, sentiment analysis, and compliance scoring
- **Embeddings & Search**: Vector-based document similarity and hybrid search

### Advanced Data Management

- **Material UI Pro Data Grid**: Enterprise-grade data grids with server-side operations
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **Repository Pattern**: Structured data access with base repository classes
- **Caching**: Redis-based caching for improved performance
- **Real-time Updates**: WebSocket and server-sent events for live data updates

## Technology Stack

### Frontend Framework

- **Next.js 15.x**: React framework with App Router and server components
- **TypeScript 5.x**: Full type safety throughout the application
- **React 19**: Latest React features and concurrent rendering
- **Material UI 7.x**: Comprehensive component library with custom theming

### AI & Model Integration

- **Vercel AI SDK 5.x**: Unified AI model interface with provider registry
- **Azure OpenAI**: GPT-4, GPT-3.5, and embedding models
- **Google Gemini**: Gemini 2.5 Pro, Gemini 2.5 Flash, and text embedding models
- **Model Context Protocol (MCP)**: Advanced tool system for AI interactions
- **Custom Model Factory**: Multi-provider failover and availability management

### Data & Persistence

- **PostgreSQL**: Primary database with advanced queries
- **Drizzle ORM**: Type-safe database operations with schema validation
- **Redis**: Caching layer for AI responses and session data
- **Repository Pattern**: Structured data access with base repository classes

### UI Components & Styling

- **Material UI Pro**: Advanced data grid and enterprise components
- **Emotion**: CSS-in-JS styling system
- **Custom Theming**: Comprehensive theme system with dark/light mode
- **Responsive Design**: Mobile-first responsive layout system

### Authentication & Security

- **NextAuth.js 5.x**: Authentication with Keycloak SSO
- **Keycloak Integration**: Enterprise-grade identity and access management
- **Google API Access**: Gmail and other Google services via Keycloak token exchange
- **Session Management**: Secure session handling and persistence

## Project Structure

```
web-ui/packages/app/
├── app/                           # Next.js App Router pages
│   ├── api/                      # API routes and server functions
│   │   ├── ai/                   # AI model endpoints
│   │   ├── email/                # Email management APIs
│   │   └── auth/                 # Authentication APIs
│   ├── auth/                     # Authentication pages
│   ├── messages/                 # Email message management
│   │   ├── email/[emailId]/     # Email detail pages
│   │   ├── chat/                # Chat interface
│   │   └── import/              # Email import functionality
│   ├── bulk-edit/               # Bulk operations interface
│   └── test-*/                  # Testing pages
├── components/                   # Reusable UI components
│   ├── email-message/           # Email-specific components
│   ├── chat/                    # Chat interface components
│   ├── ai/                      # AI integration components
│   ├── mui/                     # Material UI customizations
│   │   └── data-grid/           # Advanced data grid components
│   └── general/                 # Common UI components
├── lib/                         # Core libraries and utilities
│   ├── ai/                      # AI model factory and middleware
│   │   ├── aiModelFactory.ts    # Multi-provider AI model factory
│   │   ├── middleware/          # AI middleware (caching, retry)
│   │   ├── mcp/                 # Model Context Protocol integration
│   │   └── tools/               # AI tools and capabilities
│   ├── api/                     # Repository pattern implementations
│   │   ├── email/               # Email data repositories
│   │   └── _baseDrizzleRepository.ts # Base repository class
│   ├── drizzle-db/              # Database schema and connections
│   │   ├── schema.ts            # Unified database schema
│   │   └── index.ts             # Database connection
│   ├── components/              # Component utilities
│   │   └── mui/data-grid/       # Data grid query helpers
│   ├── react-util/              # React utilities and hooks
│   └── site-util/               # Site-wide utilities
├── data-models/                 # TypeScript data model definitions
├── __tests__/                   # Test files (Jest + React Testing Library)
├── drizzle/                     # Database schema definitions
│   ├── schema.ts                # Table definitions
│   └── custom-relations.ts      # Database relations
└── public/                      # Static assets
```

## Getting Started

### Prerequisites

- Node.js 22.x (enforced by package.json engines)
- Yarn 1.22+ (enforced by preinstall script)
- PostgreSQL 14+ database
- Google Cloud Console project (for Gmail integration)
- Azure AD application (for enterprise auth)
- Azure OpenAI and/or Google AI API access

### Installation

```bash
# From the workspace root (web-ui/)
cd web-ui
yarn install

# Or run from repository root
cd /path/to/repository
yarn  # Installs all workspaces
```

### Environment Configuration

Create `.env.local` in the `web-ui/packages/app/` directory with required configuration:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Azure AD
AZURE_AD_CLIENT_ID="your-azure-client-id"
AZURE_AD_CLIENT_SECRET="your-azure-client-secret"
AZURE_AD_TENANT_ID="your-azure-tenant-id"

# Azure OpenAI
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
AZURE_API_KEY="your-azure-openai-api-key"
AZURE_OPENAI_DEPLOYMENT_COMPLETIONS="your-completions-deployment"
AZURE_OPENAI_DEPLOYMENT_LOFI="your-lofi-deployment"
AZURE_OPENAI_DEPLOYMENT_HIFI="your-hifi-deployment"
AZURE_OPENAI_DEPLOYMENT_EMBEDDING="your-embedding-deployment"

# Azure OpenAI Embedding (can be separate instance)
AZURE_OPENAI_ENDPOINT_EMBEDDING="https://your-embedding-resource.openai.azure.com/"
AZURE_OPENAI_KEY_EMBEDDING="your-embedding-api-key"

# Google AI
GOOGLE_GENERATIVE_AI_API_KEY="your-google-ai-api-key"

# Google APIs (for Gmail integration)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Database Setup

```bash
# From the app directory
cd web-ui/packages/app

# Generate database schema
yarn drizzle-generate

# Run database migrations
npx drizzle-kit migrate

# Open Drizzle Studio (database viewer)
npx drizzle-kit studio
```

### Development Server

```bash
# From workspace root (recommended)
cd web-ui
yarn dev

# Or from app directory
cd web-ui/packages/app
yarn dev

# Start in debug mode
yarn debug

# Build for production
yarn build

# Start production server
yarn start
```

## Key Components

### Email Management

```typescript
// Email list with advanced filtering
<EmailList
  filters={{
    sender: "sender@domain.com",
    dateRange: { start: "2024-01-01", end: "2024-12-31" },
    hasAttachments: true,
    hasViolations: true
  }}
  onEmailSelect={handleEmailSelection}
  bulkActions={true}
/>

// Email viewer with rich content display
<EmailViewer
  emailId={selectedEmailId}
  showAnalysis={true}
  enableAnnotations={true}
/>
```

### AI Model Integration

```typescript
import { aiModelFactory } from '@/lib/ai/aiModelFactory';

// Use Azure models (with automatic failover to Google)
const hifiModel = aiModelFactory('hifi');
const lofiModel = aiModelFactory('lofi');
const embedding = aiModelFactory('embedding');

// Use Google models directly
const geminiPro = aiModelFactory('gemini-pro');
const geminiFlash = aiModelFactory('gemini-flash');
const googleEmbedding = aiModelFactory('google-embedding');

// Generate text with automatic provider selection
const result = await generateText({
  model: hifiModel,
  messages: [{ role: 'user', content: 'Analyze this email...' }],
});
```

### Data Grid Integration

```typescript
// Server-bound data grid for large datasets
<ServerBoundDataGrid
  endpoint="/api/emails"
  columns={emailColumns}
  filters={currentFilters}
  sorting={currentSort}
  pagination={true}
  bulkSelection={true}
  onRowSelect={handleRowSelect}
  exportOptions={{
    csv: true,
    excel: true,
    pdf: true
  }}
/>
```

## Database Operations

### Repository Pattern

```typescript
// Email repository with Drizzle ORM
class EmailRepository extends BaseDrizzleRepository<EmailMessage, 'id'> {
  async findByTitleIXViolations(
    hasViolations: boolean,
  ): Promise<EmailMessage[]> {
    return this.db
      .select()
      .from(emails)
      .where(eq(emails.hasViolations, hasViolations));
  }

  async getEmailsWithAttachments(): Promise<EmailWithAttachments[]> {
    return this.db.query.emails.findMany({
      with: { attachments: true },
    });
  }
}
```

### Real-time Data

```typescript
// React Query for server state management
const {
  data: emails,
  isLoading,
  error,
} = useQuery({
  queryKey: ['emails', filters],
  queryFn: () => fetchEmails(filters),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Real-time chat updates
const { messages, sendMessage } = useChat({
  api: '/api/ai/chat',
  id: chatId,
  initialMessages,
});
```

## AI Model Support

The platform features a sophisticated multi-provider AI system with automatic failover, rate limit handling, and unified model access through the `aiModelFactory`.

### Available Models

#### Azure OpenAI Models

- **HiFi (`hifi`)**: High-quality analysis using GPT-4 (Azure deployment)
- **LoFi (`lofi`)**: Fast analysis using GPT-3.5 (Azure deployment)
- **Completions (`completions`)**: Text completion and generation
- **Embedding (`embedding`)**: Document similarity and search using text-embedding-ada-002

#### Google Gemini Models

- **Gemini Pro (`gemini-pro`)**: Advanced reasoning using Gemini 2.5 Pro
- **Gemini Flash (`gemini-flash`)**: Fast analysis using Gemini 2.5 Flash
- **Gemini 2.0 Flash (`gemini-2.0-flash`)**: Latest fast model variant
- **Google Embedding (`google-embedding`)**: Document embeddings using text-embedding-004

### Model Factory Usage

```typescript
import { aiModelFactory, isModelAvailable } from '@/lib/ai/aiModelFactory';

// Basic model access (Azure primary, Google fallback)
const hifiModel = aiModelFactory('hifi');
const lofiModel = aiModelFactory('lofi');
const embedding = aiModelFactory('embedding');

// Google-specific models
const geminiPro = aiModelFactory('gemini-pro');
const geminiFlash = aiModelFactory('gemini-flash');
const googleEmbedding = aiModelFactory('google-embedding');

// Provider-specific model access
const azureHifi = aiModelFactory('azure:hifi');
const googleHifi = aiModelFactory('google:hifi');

// Generate text with automatic provider selection
const result = await generateText({
  model: hifiModel,
  messages: [{ role: 'user', content: 'Analyze this email...' }],
});
```

### Advanced Features

#### Automatic Failover & Rate Limit Handling

```typescript
import {
  handleAzureRateLimit,
  handleGoogleRateLimit,
  temporarilyDisableModel,
} from '@/lib/ai/aiModelFactory';

// The factory automatically handles rate limits
try {
  const result = await aiModelFactory('hifi');
  // Uses Azure first, automatically falls back to Google on rate limit
} catch (error) {
  if (error.status === 429) {
    // Rate limit automatically handled internally
    handleAzureRateLimit(300000); // Disable Azure for 5 minutes
  }
}

// Manual model control
temporarilyDisableModel('azure:hifi', 300000); // Disable for 5 minutes
```

#### Model Availability Management

```typescript
import {
  disableModel,
  enableModel,
  disableProvider,
  isProviderAvailable,
} from '@/lib/ai/aiModelFactory';

// Check availability before use
if (isModelAvailable('azure:hifi')) {
  const model = aiModelFactory('hifi');
}

// Provider-level control
disableProvider('azure'); // Disable all Azure models
enableProvider('google'); // Enable all Google models

// Specific model control
disableModel('azure:hifi');
enableModel('google:gemini-pro');
```

## Testing

The project uses Jest with React Testing Library for comprehensive testing coverage.

### Testing Configuration

- **Environment**: jsdom for React component testing
- **Framework**: Jest 30.x with React Testing Library 16.x
- **Concurrency**: Limited workers (2 in CI, 50% locally) to prevent resource contention
- **Timeout**: 10 seconds for slower tests
- **Mocking**: Global mocks for auth, database, navigation, and external services

### Available Test Commands

```bash
# Run all tests
yarn test

# Run tests in serial mode (single-threaded)
yarn test:serial

# Run specific test file
yarn test path/to/test.test.ts

# Run tests matching pattern
yarn test --testNamePattern="ChatDetailPage"

# Run tests with high concurrency (stress testing)
yarn test:concurrency-stress
```

### Testing Guidelines

Before writing or fixing tests, always:

1. **Read test environment setup**: Review `__tests__/jest.setup.ts` and `jest.config.ts`
2. **Understand global mocks**: Reuse existing mocks instead of creating duplicates
3. **Set mock implementations**: Configure mocks before importing the system under test
4. **Avoid anti-patterns**: Don't re-mock globally mocked modules

### Example Test Structure

```typescript
// __tests__/components/email-message/email-list.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailList } from '@/components/email-message/email-list';

describe('EmailList', () => {
  test('filters emails by compliance violations', async () => {
    const user = userEvent.setup();
    render(<EmailList />);

    const filterToggle = screen.getByRole('checkbox', {
      name: /compliance violations/i
    });

    await user.click(filterToggle);

    await waitFor(() => {
      expect(screen.queryByText('Non-compliant email')).not.toBeInTheDocument();
    });
  });
});
```

## Development Scripts

### Available Commands

```bash
# Development
yarn dev                    # Start development server on port 3000
yarn debug                  # Start with Node.js debugging enabled
yarn build                  # Build production bundle
yarn start                  # Start production server

# Testing
yarn test                   # Run Jest tests
yarn test:serial           # Run tests in single-threaded mode
yarn test:concurrency-stress # Run tests with high concurrency

# Code Quality
yarn lint                   # Run ESLint checks

# Database
yarn drizzle-generate       # Generate Drizzle schema
npx drizzle-kit migrate     # Run database migrations
npx drizzle-kit studio      # Open Drizzle Studio

# Build Analysis
ANALYZE=true yarn build     # Build with bundle analyzer
```

## Performance Features

### Next.js Optimizations

- **Lightning CSS**: Faster CSS processing with `useLightningcss: true`
- **Package Import Optimization**: Optimized imports for major libraries (MUI, OpenTelemetry, AI SDK)
- **Server External Packages**: External packages for server-side operations
- **Web Vitals Attribution**: Performance monitoring for Core Web Vitals

### Caching Strategy

- **Redis Caching**: AI responses cached with TTL
- **React Query**: Client-side state caching with stale-while-revalidate
- **Database Query Optimization**: Drizzle ORM with efficient query patterns

### Bundle Optimization

```typescript
// next.config.ts optimizations
experimental: {
  optimizePackageImports: [
    '@ai-sdk', '@mui/material', '@mui/icons-material',
    '@toolpad/core', '@opentelemetry/api', 'ai'
  ],
  useLightningcss: true,
  webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'INP', 'TTFB', 'FID']
}
```

## Deployment

### Production Build

```bash
# Build optimized production bundle
npm run build

# Analyze bundle size
npm run analyze

# Test production build locally
npm start
```

### Vercel Deployment

```bash
# Deploy to Vercel
npm install -g vercel
vercel

# Configure environment variables in Vercel dashboard
# Set up custom domain and SSL
```

### Docker Deployment

```dockerfile
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS builder
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=base /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 3000
CMD ["npm", "start"]
```

## Security Considerations

### Data Protection

- **CSRF Protection**: Built-in CSRF protection with NextAuth.js
- **XSS Prevention**: Automatic escaping and Content Security Policy
- **SQL Injection**: Parameterized queries with Drizzle ORM
- **Secure Headers**: Security headers configuration

### Access Control

```typescript
// Middleware for route protection
export function middleware(request: NextRequest) {
  const token = request.nextauth.token;

  if (!token) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  // Role-based route access
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!hasRole(token, 'admin')) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }
}
```

## Deployment

### Production Build

```bash
# Build optimized production bundle
yarn build

# Analyze bundle size
ANALYZE=true yarn build

# Test production build locally
yarn start
```

### Vercel Deployment

```bash
# Deploy to Vercel
npm install -g vercel
vercel

# Configure environment variables in Vercel dashboard
# Supports standalone output with FOR_STANDALONE=1
```

### Docker Deployment

```dockerfile
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

FROM base AS builder
COPY . .
RUN yarn build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./

EXPOSE 3000
CMD ["yarn", "start"]
```

## Architecture Highlights

### Multi-Provider AI System

- **Unified Interface**: Single `aiModelFactory` for all AI models
- **Automatic Failover**: Azure primary with Google fallback
- **Rate Limit Handling**: Temporary model disabling with auto-recovery
- **Model Availability Management**: Programmatic control over model access

### Enterprise Data Grid System

- **Material UI Pro**: Advanced data grid with enterprise features
- **Server-Side Operations**: Pagination, filtering, sorting on the server
- **Drizzle Query Helpers**: Type-safe query building for data grids
- **Bulk Operations**: Mass data operations with optimistic updates

### Database Architecture

- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **Repository Pattern**: Structured data access with base repository classes
- **Schema Management**: Unified schema with custom relations
- **Migration System**: Version-controlled database schema changes

## Troubleshooting

### Common Issues

- **Build Failures**: Ensure Node.js 22.x and clear yarn cache
- **Yarn Required**: Project enforces Yarn usage via preinstall script
- **Authentication Issues**: Verify Keycloak configuration and Google API access via Keycloak
- **Database Connections**: Ensure PostgreSQL is accessible and migrations run
- **AI Model Issues**: Check Azure OpenAI and Google AI API access

### Debug Commands

```bash
# Debug mode with inspection
yarn debug

# Analyze bundle composition
ANALYZE=true yarn build

# Database debugging
npx drizzle-kit studio

# Test environment debugging
yarn test --verbose
```

## Contributing

### Development Workflow

1. **TypeScript**: All code must be TypeScript with strict type checking
2. **Testing**: Write tests for new features using Jest + React Testing Library
3. **Code Style**: Follow ESLint configuration with Prettier formatting
4. **Performance**: Optimize for Core Web Vitals and accessibility
5. **AI Integration**: Use the unified `aiModelFactory` for all AI operations

### Code Standards

```typescript
// Repository pattern example
class EmailRepository extends BaseDrizzleRepository<EmailMessage, 'id'> {
  async findByViolations(hasViolations: boolean): Promise<EmailMessage[]> {
    return this.db
      .select()
      .from(this.table)
      .where(eq(this.table.hasViolations, hasViolations));
  }
}

// AI model usage example
const model = aiModelFactory('hifi'); // Auto-selects best provider
const result = await generateText({
  model,
  messages: [{ role: 'user', content: 'Analyze this content...' }],
});
```

## Related Documentation

- **Workspace README**: [../../README.md](../../README.md) - Monorepo workspace information and commands
- **Root README**: [../../../README.md](../../../README.md) - Repository overview and architecture
- **Monorepo Guide**: [../../../MONOREPO_GUIDE.md](../../../MONOREPO_GUIDE.md) - Detailed monorepo migration guide
- **Java Backend**: [../../../chat/README.md](../../../chat/README.md) - Evidence analysis and AI processing backend

## License

See [LICENSE.md](../../../LICENSE.md) for licensing information.

---

**Part of the Title IX Victim Advocacy Platform** - Empowering victims through technology
