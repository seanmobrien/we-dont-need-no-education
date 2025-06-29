# Web UI - Title IX Victim Advocacy Platform

A modern, responsive web application empowering victims, families, and advocates to fight back against educational institutions that mishandle Title IX cases through email processing, evidence analysis, and AI-powered case building. Built with Next.js 15 and Material UI, this frontend provides an intuitive interface for those facing schools that abuse their position of power.

## Overview

The web UI serves as the primary interface for the Title IX Victim Advocacy Platform, offering:
- **Evidence Management**: Import, organize, and analyze email communications and documents
- **Case Building**: Upload and manage evidence to build strong advocacy cases
- **AI-Powered Analysis**: Real-time insights to identify institutional failures and violations
- **Advocacy Dashboard**: Comprehensive overview of case strength and evidence quality
- **Bulk Operations**: Efficient handling of multiple evidence files and communications
- **Secure Access**: Protected access for victims, families, and their advocates

## Key Features

### Evidence Management System
- **Gmail Integration**: Direct import from Gmail accounts using Google APIs to gather institutional communications
- **Email Viewer**: Rich email display with attachment support for comprehensive evidence review
- **Thread Management**: Organized email thread visualization to track institutional response patterns
- **Search and Filter**: Advanced search capabilities across evidence content to find specific violations
- **Bulk Actions**: Mass evidence processing and categorization for large cases

### Evidence Analysis Interface
- **Real-time Processing**: Live updates from AI analysis pipeline to identify institutional failures
- **Multi-Provider AI**: Support for both Azure OpenAI and Google Gemini models for comprehensive analysis
- **Analysis Results**: Structured display of AI-generated insights highlighting policy violations
- **Action Item Tracking**: Monitor institutional failures to respond appropriately to reports
- **Key Evidence Extraction**: Visual presentation of critical evidence elements for case building
- **Violation Assessment**: Title IX compliance failure scoring and advocacy recommendations

### Advanced Data Grid
- **Material UI Pro Grid**: Professional-grade data grid with advanced features for evidence organization
- **Server-Side Operations**: Efficient handling of large evidence datasets
- **Custom Filtering**: Domain-specific filters for advocacy case data
- **Export Capabilities**: Evidence export in multiple formats for legal teams
- **Bulk Editing**: In-line editing for multiple evidence records

## Technology Stack

### Frontend Framework
- **Next.js 15.x**: React framework with App Router and server components
- **TypeScript**: Full type safety throughout the application
- **React 19**: Latest React features and concurrent rendering
- **Material UI 7.x**: Comprehensive component library with theming

### UI Components & Styling
- **Material UI Pro**: Advanced data grid and enterprise components
- **TailwindCSS 4.x**: Utility-first CSS framework with custom design system
- **Custom CSS Types**: Type-safe CSS class generation
- **Responsive Design**: Mobile-first responsive layout system

### State Management & Data
- **Next.js Server Components**: Server-side rendering and data fetching
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **React Query**: Client-side state management and caching
- **Form Validation**: Zod-based form validation and type safety

### Authentication & Security
- **NextAuth.js 5.x**: Authentication with multiple providers
- **Azure AD Integration**: Enterprise authentication support
- **Role-Based Access Control**: Granular permission management
- **Session Management**: Secure session handling and persistence

## Project Structure

```
web-ui/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes and server functions
│   ├── auth/              # Authentication pages
│   ├── evidence/          # Evidence management interface
│   ├── case-building/     # Case building and analysis interface
│   └── advocacy/          # Advocacy tools and bulk operations
├── components/            # Reusable UI components
│   ├── evidence-message/  # Evidence-specific components
│   ├── evidence-import/   # Evidence import functionality
│   ├── ai/                # AI integration components for violation detection
│   ├── mui/               # Material UI customizations
│   └── general/           # Common UI components
├── lib/                   # Utility libraries and configurations
│   ├── api/               # API client and repository patterns
│   ├── neondb/            # Database connection and queries
│   ├── react-util/        # React utilities and hooks
│   └── site-util/         # Site-wide utilities and constants
├── data-models/           # TypeScript data model definitions
├── types/                 # TypeScript type definitions
└── public/                # Static assets
```

## Getting Started

### Prerequisites
- Node.js 22.x or higher
- PostgreSQL 14+ database
- Google Cloud Console project (for Gmail integration)
- Azure AD application (for enterprise auth)

### Installation
```bash
# Install dependencies
npm install

# Generate TailwindCSS types
npm run generate-css-types

# Set up environment variables
cp .env.example .env.local
```

### Environment Configuration
Create `.env.local` with required configuration:
```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/victim_advocacy_db"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Azure AD
AZURE_AD_CLIENT_ID="your-azure-client-id"
AZURE_AD_CLIENT_SECRET="your-azure-client-secret"
AZURE_AD_TENANT_ID="your-azure-tenant-id"

# Azure OpenAI (for AI analysis)
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
AZURE_API_KEY="your-azure-openai-api-key"
AZURE_OPENAI_DEPLOYMENT_COMPLETIONS="your-completions-deployment"
AZURE_OPENAI_DEPLOYMENT_LOFI="your-lofi-deployment"
AZURE_OPENAI_DEPLOYMENT_HIFI="your-hifi-deployment"
AZURE_OPENAI_DEPLOYMENT_EMBEDDING="your-embedding-deployment"

# Google AI (for alternative AI models)
GOOGLE_GENERATIVE_AI_API_KEY="your-google-ai-api-key"

# Google APIs (for evidence gathering from Gmail)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Backend API
CHAT_API_URL="http://localhost:8080"
```

### Database Setup
```bash
# Run database migrations
npx drizzle-kit migrate

# Generate database types
npx drizzle-kit generate:pg
```

### Development Server
```bash
# Start development server
npm run dev

# Start with custom port
npm run dev -- --port 3001

# Build for production
npm run build
npm start
```

## Key Components

### Evidence Management
```typescript
// Evidence list with advanced filtering for case building
<EvidenceList 
  filters={{
    sender: "compliance@school.edu",
    dateRange: { start: "2024-01-01", end: "2024-12-31" },
    hasAttachments: true,
    titleIXViolations: true
  }}
  onEvidenceSelect={handleEvidenceSelection}
  bulkActions={true}
/>

// Evidence viewer with violation analysis results
<EvidenceViewer 
  evidenceId={selectedEvidenceId}
  showViolationAnalysis={true}
  enableAnnotations={true}
/>
```

### Evidence Processing
```typescript
// Evidence upload with AI processing for violation detection
<EvidenceUpload
  onUpload={handleEvidenceUpload}
  acceptedTypes={['.pdf', '.docx', '.txt']}
  autoProcessForViolations={true}
  showProgress={true}
/>

// Violation analysis results display
<ViolationAnalysisResults
  evidenceId={evidenceId}
  showKeyViolations={true}
  showInstitutionalFailures={true}
  enableExport={true}
/>
```

### Data Grid Integration
```typescript
// Server-bound data grid for large evidence datasets
<ServerBoundDataGrid
  endpoint="/api/evidence"
  columns={evidenceColumns}
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

## API Integration

### Backend Communication
```typescript
// Type-safe API client
const apiClient = new TypedApiClient({
  baseUrl: process.env.CHAT_API_URL,
  timeout: 30000,
  retries: 3
});

// Evidence operations for advocacy case building
const evidence = await apiClient.get('/api/evidence', {
  filters: { titleIXViolations: true },
  pagination: { page: 1, limit: 50 }
});

// Evidence analysis for violation detection
const violationAnalysis = await apiClient.post('/api/evidence/analyze', {
  evidenceId: 123,
  analysisType: 'violation_detection',
  priority: 'high'
});
```

### Real-time Updates
```typescript
// WebSocket integration for live updates on evidence processing
const { data, status } = useRealtimeData('/api/processing-status', {
  evidenceId,
  refreshInterval: 1000
});

// Server-sent events for violation analysis progress tracking
const { progress } = useSSE(`/api/analysis/${evidenceId}/progress`);
```

## AI Model Support

The platform supports multiple AI providers through a unified model factory that simplifies provider management and enhances analysis capabilities.

### Available Models

#### Azure OpenAI Models
- **HiFi (`hifi`)**: High-fidelity analysis for detailed evidence processing
- **LoFi (`lofi`)**: Fast analysis for bulk evidence processing  
- **Completions (`completions`)**: Text completion and generation
- **Embedding (`embedding`)**: Document similarity and search

#### Google Gemini Models  
- **Gemini Pro (`gemini-pro`)**: Advanced reasoning and analysis using Gemini 1.5 Pro
- **Gemini Flash (`gemini-flash`)**: Fast analysis using Gemini 1.5 Flash
- **Google Embedding (`google-embedding`)**: Document embeddings using text-embedding-004

### Usage Examples

```typescript
import { aiModelFactory, createGoogleEmbeddingModel } from '@/lib/ai/aiModelFactory';

// Use Azure models (existing functionality)
const hifiModel = aiModelFactory('hifi');
const azureEmbedding = aiModelFactory('embedding');

// Use new Google models
const geminiPro = aiModelFactory('gemini-pro');
const geminiFlash = aiModelFactory('gemini-flash'); 
const googleEmbedding = createGoogleEmbeddingModel();

// Provider registry automatically handles initialization
const result = await generateText({
  model: geminiPro,
  messages: [{ role: 'user', content: 'Analyze this Title IX case...' }]
});
```

### Provider Registry

The implementation uses Vercel AI SDK's built-in provider registry pattern that:
- **Custom Providers**: Uses `customProvider` to create Azure and Google providers with model aliases
- **Fallback Strategy**: Azure as primary provider with Google as fallback for high availability
- **Model Aliases**: Consistent model naming (`hifi`, `lofi`, `embedding`) across providers
- **Middleware Support**: All models work with existing caching and retry middleware

```typescript
// Custom providers with model aliases
const azureProvider = customProvider({
  languageModels: {
    hifi: azureModel('gpt-4'),      // High-quality model
    lofi: azureModel('gpt-3.5'),    // Fast model
    completions: azureModel('text-davinci-003')
  },
  embeddingModels: {
    embedding: azureEmbedding('text-embedding-ada-002')
  }
});

// Provider registry with Azure primary and Google fallback
const providerRegistry = createProviderRegistry({
  azure: azureProvider,
  google: googleProvider
});
```

### Programmatic Model Control

The platform includes advanced model availability management for handling rate limits, provider outages, and strategic model selection:

#### Core Features
- **Per-Model Control**: Enable/disable specific models (e.g., `azure:hifi`, `google:embedding`)
- **Provider-Level Control**: Enable/disable entire providers (Azure or Google)
- **Temporary Disabling**: Auto-recovery after specified time periods
- **Rate Limit Handling**: Automatic failover when providers hit rate limits
- **Real-time Availability**: Check model availability before use

#### Usage Examples

```typescript
import { 
  disableModel, 
  enableModel, 
  disableProvider,
  temporarilyDisableModel,
  isModelAvailable,
  handleAzureRateLimit,
  handleGoogleRateLimit,
  resetModelAvailability
} from '@/lib/ai/aiModelFactory';

// Disable specific models
disableModel('azure:hifi');                    // Disable Azure hifi model
enableModel('azure:hifi');                     // Re-enable Azure hifi model

// Provider-level control
disableProvider('azure');                      // Disable all Azure models
enableProvider('azure');                       // Re-enable all Azure models

// Temporary disabling (auto-recovery)
temporarilyDisableModel('azure:hifi', 300000); // Disable for 5 minutes

// Check availability before use
if (isModelAvailable('azure:hifi')) {
  const result = await aiModelFactory('hifi');
}

// Handle rate limits automatically
handleAzureRateLimit(300000);                  // Disable Azure for 5 min
handleGoogleRateLimit(180000);                 // Disable Google for 3 min

// Reset all models to available state
resetModelAvailability();
```

#### Rate Limit Management

```typescript
// Automatic rate limit detection and failover
export const aiModelFactory = (modelType) => {
  switch (modelType) {
    case 'hifi':
      // Try Azure first if available
      if (isModelAvailable('azure:hifi')) {
        try {
          return providerRegistry.languageModel('azure:hifi');
        } catch (error) {
          // Auto-disable Azure on rate limit, try Google
          temporarilyDisableModel('azure:hifi', 60000);
          console.warn('Azure hifi rate limited, switching to Google');
        }
      }
      
      // Fallback to Google if available
      if (isModelAvailable('google:hifi')) {
        return providerRegistry.languageModel('google:hifi');
      }
      
      throw new Error('No available providers for hifi model');
  }
};
```

#### Integration with Error Handling

```typescript
// Application-level rate limit handling
export const handleProviderError = (error: any, modelKey: string) => {
  if (error.status === 429) { // Rate limit error
    const [provider] = modelKey.split(':');
    
    if (provider === 'azure') {
      handleAzureRateLimit(300000); // 5 minutes
    } else if (provider === 'google') {
      handleGoogleRateLimit(180000); // 3 minutes
    }
    
    // Retry with different provider
    return aiModelFactory(modelKey.split(':')[1]);
  }
  
  throw error;
};
```

#### Available Control Functions

| Function | Description | Example |
|----------|-------------|---------|
| `disableModel(key)` | Disable specific model | `disableModel('azure:hifi')` |
| `enableModel(key)` | Enable specific model | `enableModel('azure:hifi')` |
| `disableProvider(name)` | Disable all provider models | `disableProvider('azure')` |
| `enableProvider(name)` | Enable all provider models | `enableProvider('azure')` |
| `temporarilyDisableModel(key, ms)` | Auto-recovery disabling | `temporarilyDisableModel('azure:hifi', 300000)` |
| `isModelAvailable(key)` | Check model availability | `isModelAvailable('azure:hifi')` |
| `isProviderAvailable(name)` | Check provider availability | `isProviderAvailable('azure')` |
| `handleAzureRateLimit(ms)` | Azure rate limit response | `handleAzureRateLimit(300000)` |
| `handleGoogleRateLimit(ms)` | Google rate limit response | `handleGoogleRateLimit(300000)` |
| `resetModelAvailability()` | Reset to defaults | `resetModelAvailability()` |
| `getModelAvailabilityStatus()` | Debug availability state | `getModelAvailabilityStatus()` |

This system ensures high availability and optimal resource usage across multiple AI providers while providing fine-grained control over model selection and failover behavior.
    lofi: azureModel('gpt-3.5'),    // Fast, cost-effective model
  },
  embeddingModels: {
    embedding: azureEmbeddingModel('text-embedding-ada-002'),
  },
  fallbackProvider: azureRawProvider,
});

const googleProvider = customProvider({
  languageModels: {
    hifi: googleModel('gemini-1.5-pro'),    // Equivalent to Azure hifi
    lofi: googleModel('gemini-1.5-flash'),  // Equivalent to Azure lofi
  },
  embeddingModels: {
    embedding: googleEmbeddingModel('text-embedding-004'),
  },
  fallbackProvider: googleRawProvider,
});

// Provider registry with fallback strategy
export const providerRegistry = createProviderRegistry({
  azure: azureProvider,  // Primary provider
  google: googleProvider, // Fallback provider
});
```

## Authentication & Authorization

### User Authentication
```typescript
// NextAuth configuration
export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      // Add user roles and permissions
      session.user.role = token.role;
      session.user.permissions = token.permissions;
      return session;
    },
  },
};
```

### Role-Based Access
```typescript
// Protected route component for victim advocates
<ProtectedRoute requiredRole="victim_advocate">
  <BulkEvidenceProcessor />
</ProtectedRoute>

// Permission-based UI elements for case building
<ConditionalRender 
  condition={hasPermission('edit_evidence')}
  fallback={<ReadOnlyView />}
>
  <EvidenceEditor />
</ConditionalRender>
```

## Data Management

### Database Operations
```typescript
// Repository pattern implementation for evidence management
class EvidenceRepository extends BaseObjectRepository<EvidenceMessage, 'id'> {
  async findByTitleIXViolations(hasViolations: boolean): Promise<EvidenceMessage[]> {
    return this.query(
      sql`SELECT * FROM evidence WHERE title_ix_violations = ${hasViolations}`
    );
  }

  async getBulkViolationAnalysisStatus(evidenceIds: number[]): Promise<AnalysisStatus[]> {
    return this.query(
      sql`SELECT evidence_id, status FROM violation_analysis_status 
          WHERE evidence_id = ANY(${evidenceIds})`
    );
  }
}
```

### State Management
```typescript
// React Query for server state management in advocacy cases
const { data: evidence, isLoading, error } = useQuery({
  queryKey: ['evidence', filters],
  queryFn: () => fetchEvidence(filters),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Optimistic updates for better UX in case building
const updateEvidenceMutation = useMutation({
  mutationFn: updateEvidence,
  onMutate: async (newEvidence) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['evidence']);
    
    // Snapshot previous value
    const previousEvidence = queryClient.getQueryData(['evidence']);
    
    // Optimistically update
    queryClient.setQueryData(['evidence'], (old) => 
      old?.map(evidence => evidence.id === newEvidence.id ? newEvidence : evidence)
    );
    
    return { previousEvidence };
  },
});
```

## Performance Optimization

### Server-Side Rendering
```typescript
// Server component for initial evidence data loading
async function AdvocacyDashboard() {
  const initialEvidence = await fetchEvidence({ limit: 20 });
  const caseStats = await fetchCaseStats();
  
  return (
    <div>
      <CaseStats stats={caseStats} />
      <EvidenceGrid initialData={initialEvidence} />
    </div>
  );
}
```

### Client-Side Optimization
```typescript
// Virtual scrolling for large evidence lists
<VirtualizedList
  items={evidence}
  itemHeight={80}
  renderItem={({ item, index }) => (
    <EvidenceListItem evidence={item} index={index} />
  )}
  windowSize={20}
/>

// Lazy loading with Suspense for evidence details
<Suspense fallback={<EvidenceSkeleton />}>
  <EvidenceDetails evidenceId={evidenceId} />
</Suspense>
```

### Bundle Optimization
```javascript
// Next.js configuration
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pg', 'drizzle-orm'],
  },
  webpack: (config) => {
    // Optimize bundle size
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          chunks: 'all',
        },
        mui: {
          test: /[\\/]node_modules[\\/]@mui[\\/]/,
          chunks: 'all',
        },
      },
    };
    return config;
  },
};
```

## Testing

### Unit Testing
```typescript
// Component testing with React Testing Library
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailList } from '../components/email-message/list';

describe('EmailList', () => {
  test('filters emails by Title IX relevance', async () => {
    const user = userEvent.setup();
    render(<EmailList />);
    
    const filterToggle = screen.getByRole('checkbox', { 
      name: /title ix relevant/i 
    });
    
    await user.click(filterToggle);
    
    await waitFor(() => {
      expect(screen.queryByText('Non-relevant email')).not.toBeInTheDocument();
    });
  });
});
```

### Integration Testing
```typescript
// API route testing
import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/emails/[id]';

describe('/api/emails/[id]', () => {
  test('returns email data for valid ID', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { id: '123' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.email.id).toBe('123');
  });
});
```

### E2E Testing
```typescript
// Playwright end-to-end tests
import { test, expect } from '@playwright/test';

test('complete email analysis workflow', async ({ page }) => {
  await page.goto('/');
  
  // Import emails
  await page.click('[data-testid="import-emails"]');
  await page.fill('#gmail-query', 'subject:compliance');
  await page.click('[data-testid="start-import"]');
  
  // Wait for analysis completion
  await expect(page.locator('[data-testid="analysis-complete"]'))
    .toBeVisible({ timeout: 30000 });
  
  // Verify results
  await expect(page.locator('[data-testid="key-points"]'))
    .toContainText('Title IX');
});
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

## Monitoring & Analytics

### Performance Monitoring
```typescript
// Web Vitals tracking
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function reportWebVitals(metric: any) {
  // Send to analytics service
  analytics.track('Web Vitals', {
    name: metric.name,
    value: metric.value,
    id: metric.id,
  });
}
```

### Error Tracking
```typescript
// Error boundary with reporting
class ErrorBoundary extends Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to error tracking service
    errorReporting.captureException(error, {
      context: errorInfo,
      user: getCurrentUser(),
      tags: { component: 'email-processor' },
    });
  }
}
```

## Contributing

### Development Guidelines
1. **TypeScript First**: All new code must be written in TypeScript
2. **Component Standards**: Follow Material UI design system principles
3. **Performance**: Optimize for Core Web Vitals and accessibility
4. **Testing**: Maintain test coverage above 80%
5. **Documentation**: Update component documentation and storybook

### Code Style
```typescript
// Use consistent naming conventions
interface EmailMessageProps {
  emailId: string;
  showAnalysis?: boolean;
  onAnalysisComplete?: (result: AnalysisResult) => void;
}

// Prefer composition over inheritance
const EmailViewer = memo(({ emailId, showAnalysis }: EmailMessageProps) => {
  const { data: email, isLoading } = useEmail(emailId);
  
  if (isLoading) return <EmailSkeleton />;
  if (!email) return <EmailNotFound />;
  
  return (
    <Card>
      <EmailHeader email={email} />
      <EmailContent email={email} />
      {showAnalysis && <AnalysisPanel emailId={emailId} />}
    </Card>
  );
});
```

## Troubleshooting

### Common Issues
- **Build Failures**: Check Node.js version and clear npm cache
- **Authentication Issues**: Verify environment variables and provider settings
- **Database Connections**: Ensure PostgreSQL is running and accessible
- **Performance Issues**: Use React DevTools Profiler to identify bottlenecks

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev

# Database query logging
DATABASE_LOGGING=true npm run dev

# Webpack bundle analyzer
ANALYZE=true npm run build
```
