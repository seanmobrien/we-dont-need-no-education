# Web UI - Title IX Compliance Platform

A modern, responsive web application for managing Title IX compliance through email processing, document analysis, and AI-powered workflow management. Built with Next.js 15 and Material UI, this frontend provides an intuitive interface for educational institutions to handle compliance documentation efficiently.

## Overview

The web UI serves as the primary interface for the Title IX Compliance Platform, offering:
- **Email Management**: Import, view, and analyze email communications
- **Document Processing**: Upload and manage compliance-related documents
- **AI-Powered Analysis**: Real-time insights from document analysis pipeline
- **Dashboard Interface**: Comprehensive overview of compliance status and workflows
- **Bulk Operations**: Efficient handling of multiple documents and emails
- **Role-Based Access**: Secure access controls for different user types

## Key Features

### Email Management System
- **Gmail Integration**: Direct import from Gmail accounts using Google APIs
- **Email Viewer**: Rich email display with attachment support
- **Thread Management**: Organized email thread visualization
- **Search and Filter**: Advanced search capabilities across email content
- **Bulk Actions**: Mass email processing and categorization

### Document Analysis Interface
- **Real-time Processing**: Live updates from AI analysis pipeline
- **Analysis Results**: Structured display of AI-generated insights
- **Call-to-Action Tracking**: Monitor and manage actionable items
- **Key Points Extraction**: Visual presentation of important document elements
- **Compliance Assessment**: Title IX relevance scoring and recommendations

### Advanced Data Grid
- **Material UI Pro Grid**: Professional-grade data grid with advanced features
- **Server-Side Operations**: Efficient handling of large datasets
- **Custom Filtering**: Domain-specific filters for compliance data
- **Export Capabilities**: Data export in multiple formats
- **Bulk Editing**: In-line editing for multiple records

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
│   ├── email/             # Email management interface
│   ├── messages/          # Message processing interface
│   └── bulk-edit/         # Bulk operations interface
├── components/            # Reusable UI components
│   ├── email-message/     # Email-specific components
│   ├── email-import/      # Gmail import functionality
│   ├── ai/                # AI integration components
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
DATABASE_URL="postgresql://username:password@localhost:5432/titleix_db"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Azure AD
AZURE_AD_CLIENT_ID="your-azure-client-id"
AZURE_AD_CLIENT_SECRET="your-azure-client-secret"
AZURE_AD_TENANT_ID="your-azure-tenant-id"

# Google APIs (for Gmail integration)
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

### Email Management
```typescript
// Email list with advanced filtering
<EmailList 
  filters={{
    sender: "compliance@school.edu",
    dateRange: { start: "2024-01-01", end: "2024-12-31" },
    hasAttachments: true,
    titleIXRelevant: true
  }}
  onEmailSelect={handleEmailSelection}
  bulkActions={true}
/>

// Email viewer with analysis results
<EmailViewer 
  emailId={selectedEmailId}
  showAnalysis={true}
  enableAnnotations={true}
/>
```

### Document Processing
```typescript
// Document upload with AI processing
<DocumentUpload
  onUpload={handleDocumentUpload}
  acceptedTypes={['.pdf', '.docx', '.txt']}
  autoProcess={true}
  showProgress={true}
/>

// Analysis results display
<AnalysisResults
  documentId={documentId}
  showKeyPoints={true}
  showCallToActions={true}
  enableExport={true}
/>
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

## API Integration

### Backend Communication
```typescript
// Type-safe API client
const apiClient = new TypedApiClient({
  baseUrl: process.env.CHAT_API_URL,
  timeout: 30000,
  retries: 3
});

// Email operations
const emails = await apiClient.get('/api/emails', {
  filters: { titleIXRelevant: true },
  pagination: { page: 1, limit: 50 }
});

// Document analysis
const analysis = await apiClient.post('/api/documents/analyze', {
  documentId: 123,
  analysisType: 'full',
  priority: 'high'
});
```

### Real-time Updates
```typescript
// WebSocket integration for live updates
const { data, status } = useRealtimeData('/api/processing-status', {
  documentId,
  refreshInterval: 1000
});

// Server-sent events for progress tracking
const { progress } = useSSE(`/api/analysis/${documentId}/progress`);
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
// Protected route component
<ProtectedRoute requiredRole="compliance_officer">
  <BulkDocumentProcessor />
</ProtectedRoute>

// Permission-based UI elements
<ConditionalRender 
  condition={hasPermission('edit_documents')}
  fallback={<ReadOnlyView />}
>
  <DocumentEditor />
</ConditionalRender>
```

## Data Management

### Database Operations
```typescript
// Repository pattern implementation
class EmailRepository extends BaseObjectRepository<EmailMessage, 'id'> {
  async findByTitleIXRelevance(relevant: boolean): Promise<EmailMessage[]> {
    return this.query(
      sql`SELECT * FROM emails WHERE title_ix_relevant = ${relevant}`
    );
  }

  async getBulkAnalysisStatus(emailIds: number[]): Promise<AnalysisStatus[]> {
    return this.query(
      sql`SELECT email_id, status FROM analysis_status 
          WHERE email_id = ANY(${emailIds})`
    );
  }
}
```

### State Management
```typescript
// React Query for server state
const { data: emails, isLoading, error } = useQuery({
  queryKey: ['emails', filters],
  queryFn: () => fetchEmails(filters),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Optimistic updates for better UX
const updateEmailMutation = useMutation({
  mutationFn: updateEmail,
  onMutate: async (newEmail) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['emails']);
    
    // Snapshot previous value
    const previousEmails = queryClient.getQueryData(['emails']);
    
    // Optimistically update
    queryClient.setQueryData(['emails'], (old) => 
      old?.map(email => email.id === newEmail.id ? newEmail : email)
    );
    
    return { previousEmails };
  },
});
```

## Performance Optimization

### Server-Side Rendering
```typescript
// Server component for initial data loading
async function EmailDashboard() {
  const initialEmails = await fetchEmails({ limit: 20 });
  const stats = await fetchEmailStats();
  
  return (
    <div>
      <DashboardStats stats={stats} />
      <EmailGrid initialData={initialEmails} />
    </div>
  );
}
```

### Client-Side Optimization
```typescript
// Virtual scrolling for large lists
<VirtualizedList
  items={emails}
  itemHeight={80}
  renderItem={({ item, index }) => (
    <EmailListItem email={item} index={index} />
  )}
  windowSize={20}
/>

// Lazy loading with Suspense
<Suspense fallback={<EmailSkeleton />}>
  <EmailDetails emailId={emailId} />
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
