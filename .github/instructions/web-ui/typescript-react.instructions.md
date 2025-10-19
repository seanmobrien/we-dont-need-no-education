---
applyTo: '**/*.ts,**/*.tsx'
---

# Project coding standards for TypeScript and React

- Always write testable code. Dependencies should be referenced via injection (clasess) or arguments (functions), never global statics.
- When generating documentation, keep it as close to the described item as possible, eg opt for documentation on fields and functions over
  classes

## TypeScript Guidelines

- Use TypeScript for any new code that is not defining an encapsulatd React component
- Follow functional programming principles where possible
- Use type (eg export type MyType = { myField: string; }) for data structures and type definitions
- Prefer immutable data (const, readonly)
- Use optional chaining (?.) and nullish coalescing (??) operators

### Core Technologies

- TypeScript
- React
- Material UI
- Jest + React Testing Library
- React Query for data fetching and caching

## React Guidelines

- Use functional components with hooks
- Follow the React hooks rules (no conditional hooks)
- Avoid using `React.FC` or `React.FunctionComponent` for component type annotations. Instead, prefer `JSX.Element` over `React.ReactNode`.
- Use explicitly defined component properties. Non-functional types should always be defined within an ambient module definition in a `[filename].d.ts` file in the same folder. JSDoc comments should be used to document the .d.ts version, keeping the implementation file easily parseable.
- All exports intended to be globally accessible (eg used outside of the curent folder) should be exported via a barrelled index.ts file. Imports should prefer direct references but use the barrelled index.ts when there is little impact to tree shaking.
- Keep components small and focused
- Use Material UI component library to provide a consistent UX

## Test guidlelines

- All newly created code should have unit test cases written that demonstrate the functionality is behaving as intended.
- Unit test files live underneath the **tests** subfolder and include a .test.js, .test.ts, or .test.tsx suffix. For example, the file containing unit tests for folder1/folder2/some-file.ts would be **tests**/folder1/folder2/some-file.test.ts

#### Component Development

Follow these patterns for React components:

```typescript
// Use proper TypeScript interfaces
interface EvidenceMessageProps {
  evidenceId: string;
  showViolationAnalysis?: boolean;
  onAnalysisComplete?: (result: ViolationAnalysisResult) => void;
}

// Prefer pure / functional components with hooks.
const EvidenceMessage = memo(({ evidenceId, showViolationAnalysis, onAnalysisComplete }: EvidenceMessageProps) => {
  const { data: evidence, isLoading, error } = useEvidence(evidenceId);
  const { mutate: triggerViolationAnalysis } = useViolationAnalysisProcessor();

  // Use early returns for loading states
  if (isLoading) return <EvidenceSkeleton />;
  if (error) return <ErrorBoundary error={error} />;
  if (!evidence) return <NotFoundMessage />;

  return (
    <Card className={classnames(display('flex'), flexDirection('flex-col'))}>
      <EvidenceHeader evidence={evidence} />
      <EvidenceContent content={evidence.content} />
      {showViolationAnalysis && (
        <ViolationAnalysisPanel
          evidenceId={evidenceId}
          onComplete={onAnalysisComplete}
        />
      )}
    </Card>
  );
});
```

#### API Integration

Use React Query for data fetching and mutations - ensure proper caching and error handling:

```typescript
  const {
    data: relatedResponses = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['callToActionResponses', emailId, row.propertyId],
    queryFn: async (): Promise<CallToActionResponseDetails[]> => {
      const result = await getCallToActionResponse({
        emailId: emailId as string,
        page: 1,
        num: 100, // Get all related responses
      });
      return result.data;
    },
  });

...

  const { mutateAsync } = useMutation({
    mutationKey: ['upload-public-key'],
    scope: {
      id: 'upload-public-key',
    },
    mutationFn: async ({ publicKey }: { publicKey: string }) => {
      const res = await fetch('/api/auth/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Key upload failed: ${res.status} ${errorText}`);
      }
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Key upload was not successful');
      }

      return result;
    },
    onSuccess: () => {
      setKeyValidationStatus('synchronized');
      setLastValidated(new Date());
      updateKeyValidationTimestamp();
    },
  });
```

## Development Guidelines

### Code Quality Standards

#### Typescript Code Style

- **Naming**: Use descriptive names (`DocumentAnalysisProcessor` not `DocProcessor`)
- **Methods**: Keep methods focused and under 50 lines
- **Error Handling**: Always use try-catch with proper logging
- **Documentation**: Add JSDoc in ambient module .d.ts for public methods and classes
- **Testing**: Maintain 80%+ test coverage with meaningful tests

#### TypeScript Code Style

- **Types**: Define explicit interfaces for all props and data structures
- **Components**: Use functional components with proper memo optimization
- **Hooks**: Create custom hooks for reusable logic
- **Error Boundaries**: Implement proper error handling at component boundaries
- **Performance**: Use React.memo, useMemo, and useCallback appropriately
- **Documentation**: Use JSDoc for exported functions, components, and types
- **Functions**: Keep functions pure and side-effect free where possible. Prefer arrow functions over traditional function expressions.

### AI Integration Best Practices

#### Prompt Engineering

When working with AI prompts, use structured prompts with

- Clear sections
- Explicit tasks and output formats.
- Encourage tool use where applicable.

```typescript
//
public const buildViolationAnalysisPrompt = (context: EvidenceContext) => {
    return `
        === CONTEXT ===
        Evidence Type: ${context.getEvidenceType()}
        Source: ${context.getSource()}
        Content Length: ${context.getContent().length()} characters

        === TASK ===
        Analyze this evidence for Title IX violations and institutional failures.

        === INSTRUCTIONS ===
        1. Search memory for related cases and context
        2. Using sequential thinking and your to-do list, identify specific policy violations and institutional failures
        3. Assess violation severity on scale 1-10
        4. Extract evidence of institutional misconduct
        5. Provide specific recommendations for victim advocacy

        === OUTPUT FORMAT ===
        Return structured JSON with fields: violation_score, key_violations, institutional_failures, advocacy_recommendations

        === EVIDENCE CONTENT ===
        ${context.getContent()}
        `;
};
```

### Database Operations

#### Query Patterns / Database Access

Use Drizzle ORM for all database queries to ensure type safety and consistency.

```typescript
const evidenceWithViolationAnalysis = await db
  .select({
    id: evidence.id,
    subject: evidence.subject,
    sender: evidence.sender,
    violationScore: evidenceViolationAnalysis.titleIxViolationLevel,
    keyViolations: evidenceViolationAnalysis.keyViolations,
  })
  .from(evidence)
  .leftJoin(
    evidenceViolationAnalysis,
    eq(evidence.id, evidenceViolationAnalysis.evidenceId),
  )
  .where(
    and(
      gte(evidence.receivedDate, startDate),
      lte(evidence.receivedDate, endDate),
      eq(evidence.processed, true),
    ),
  )
  .orderBy(desc(evidence.receivedDate));
```

### Testing Strategies

All newly created code should have unit test cases written that demonstrate the functionality is behaving as intended. Tests should be located in a **tests** subfolder mirroring the source folder structure, leverage jest and React Testing Library, and cover both success and failure scenarios. Never call jest.clearAllMocks() or jest.resetAllMocks() globally -only within specific test suites where needed. Whenever possible, use one of the pre-defined mocks from `__tests__/jest.setup.ts` and related setup files, which are ran before every test.

#### Back-end unit testing

```typescript
describe('LanguageModelQueue', () => {
  let mockModel: LanguageModelV2;
  let queue: LanguageModelQueue;

  beforeEach(() => {
    setupMaps();
    // Create a mock LanguageModel
    mockModel = {
      provider: 'azure',
      modelId: 'gpt-4.1',
    } as LanguageModelV2;

    queue = new LanguageModelQueue({
      model: mockModel,
      maxConcurrentRequests: 2,
    });
  });

  afterEach(() => {
    queue.dispose();
  });

  describe('Constructor', () => {
    it('should initialize with provided options', () => {
      expect(queue.queueInstanceId).toBeDefined();
      expect(typeof queue.queueInstanceId).toBe('string');
      expect(queue.queueInstanceId.length).toBeGreaterThan(0);
    });

    it('should generate unique instance IDs', () => {
      const queue2 = new LanguageModelQueue({
        model: mockModel,
        maxConcurrentRequests: 1,
      });

      expect(queue.queueInstanceId).not.toBe(queue2.queueInstanceId);
      queue2.dispose();
    });
  });
});
```

#### Frontend Testing

```typescript

import { screen, waitFor, render } from '@/__tests__/test-utils';

consoleErrorSpy = hideConsoleOutput();

describe('EmailList', () => {

  beforeEach(() => {
    consoleErrorSpy.setup();
  });
  afterEach(() => {
    consoleErrorSpy.dispose();
  });
  it(
    'should display error message when fetching emails fails',
    async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Error fetching emails.'),
      );

      render(<EmailList />);

      await act(() => waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument();
      }));
    },
    TIMEOUT,
  );
});

```

### Performance Optimization

#### Backend Performance

#### Frontend Performance

```typescript
// Use React Query for efficient data management
const useEmailsWithAnalysis = (filters: EmailFilters) => {
  return useQuery({
    queryKey: ['emails', 'analysis', filters],
    queryFn: () => emailRepository.findWithAnalysis(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

// Implement virtual scrolling for large lists
const VirtualizedEmailList = memo(({ emails }: { emails: Email[] }) => {
  return (
    <FixedSizeList
      height={600}
      itemCount={emails.length}
      itemSize={80}
      itemData={emails}
    >
      {EmailListItem}
    </FixedSizeList>
  );
});
```

## Common Patterns and Anti-Patterns

### ✅ Preferred Patterns

#### Dependency Injection

```typescript
export class MCPToolCache {
  private memoryCache: MemoryToolCache;
  private config: ToolCacheConfig;
  private redisSubscriber?: Awaited<ReturnType<typeof getRedisClient>>;

  constructor(config: Partial<ToolCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.memoryCache =
      this.config.memoryCache ??
      new MemoryToolCache(this.config.maxMemoryEntries, this.config.defaultTtl);
  }
}
```

### Logging Best Practices / Error Handling

Use structured logging and performance metrics to take advantage of open telemetry and monitoring systems. Open Telemetry tracing is defined in instrument/[endpoint].js; eg instrument/node for node, instrument/browser for ui, etc. Always use the LoggedError.isTurtlesAllTheWayDown pattern for error logging. Implement robust error handling with logging and user feedback. Always use the LoggedError.isTurtlesAllTheWayDown pattern for consistent error logging:

```typescript
const useDocumentProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<ProcessingError | null>(null);

  const processDocument = useCallback(async (documentId: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const tracer = trace.getTracer(tracerName);
      const parentContext = otelContext.active();
      span = tracer.startSpan(spanName, undefined, parentContext);

      // Set attributes if provided
      if (attributes) {
        span.setAttributes(attributes);
      }
      const contextWithSpan = trace.setSpan(parentContext, span);

      const result = await documentApi.process(documentId);
      return result;
    } catch (err) {
      const processingError = LoggedError.isTurtlesAllTheWayDown(err, {
        log: true,
        source: 'DocumentProcessor',
      });
      span!.recordException(processingError);
      span!.setStatus({
        code: SpanStatusCode.ERROR,
        message: processingError.message || 'Unknown error',
      });
      span!.setAttributes({
        'error.message': processingError.message || 'Unknown error',
        'error.name': processingError.name || 'Error',
        'error.stack': processingError.stack || '',
      });
      throw processingError;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { processDocument, isProcessing, error };
};
```

Consider using nextjs-util [/lib/nextjs-util/server/utils.ts] `createInstrumentedSpan` utility where applicable for simplified span creation and automatic error handling:

```typescript
const instrumented = await createInstrumentedSpan({
  spanName: 'system-token-store.form-login',
  attributes: {
    'auth.realm': this.config.realm,
  },
});

return await instrumented.executeWithContext(async (span) => {
  const cookieJar = new CookieJar();

  const authResult = await handleAuthorizationRequest(client, state, nonce);
  span.setAttribute('auth.authorization_url_generated', true);
});
```

### ❌ Anti-Patterns to Avoid

#### Avoid Direct Database Access in Components

```typescript
// ❌ Don't do this
const EmailComponent = ({ emailId }: { emailId: string }) => {
  const [email, setEmail] = useState<Email | null>(null);

  useEffect(() => {
    // Direct database query in component - BAD
    db.query('SELECT * FROM emails WHERE id = ?', [emailId]).then(setEmail);
  }, [emailId]);
};

// ✅ Use repository pattern instead
const EmailComponent = ({ emailId }: { emailId: string }) => {
  const { data: email, isLoading } = useEmail(emailId);
  // Clean separation of concerns
};

// Or access through Drizzle ORM
const GET = (request: Request, { params }: { params: { emailId: string } }) => {
  const email = await drizDbWithPromise((db) =>
    db.query.emails
      .findMany({
        where: eq(db.query.emails.id, params.emailId),
      })
      .then((results) => results[0]),
  );
  return NextResponse.json(email);
};
```

## Domain-Specific Guidance

### Title IX Victim Advocacy Context

When working on advocacy-related features:

- **Sensitivity**: Handle all victim data with utmost privacy and security considerations
- **Audit Trail**: Ensure all evidence processing activities are logged and traceable for legal purposes
- **Accuracy**: Prioritize precision in AI analysis to avoid missing violations or false assessments
- **Timeliness**: Implement appropriate urgency levels for different types of institutional failures

### Victim Support Requirements

- **Privacy**: Enhanced privacy protections for victim data beyond standard FERPA compliance
- **Accessibility**: WCAG 2.1 AA compliance for web interfaces to ensure accessibility for all victims
- **Evidence Integrity**: Maintain chain of custody for digital evidence and documentation
- **Scalability**: Design for handling large volumes of evidence in complex advocacy cases

### AI Model Considerations for Advocacy

- **Cost Management**: Monitor token usage and implement efficient caching for evidence analysis
- **Quality Control**: Implement validation layers for AI-generated violation assessments
- **Bias Detection**: Include checks for bias in analysis results that could disadvantage victims
- **Model Updates**: Design for easy model switching and A/B testing for advocacy effectiveness

## Debugging and Troubleshooting

- **Log in**: To log into the application use the credentials stored in environment variables
  - Username: `${COPILOT_LOGIN_USER}`
  - Password: `${COPILOT_LOGIN_PASSWORD}`

### Common Issues and Solutions

## Future Considerations

### Scalability Planning

- Design for multi-tenant architecture if needed
- Consider event-driven architecture for better decoupling
- Plan for horizontal scaling of AI processing components
- Implement proper caching strategies for frequently accessed data
