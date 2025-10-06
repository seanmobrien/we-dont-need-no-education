# Copilot Instructions for Title IX Victim Advocacy Platform

This document provides comprehensive guidelines for LLM-based development assistance on the Title IX Victim Advocacy Platform. These instructions optimize AI assistance for the specific architecture, patterns, and requirements of this victim empowerment and evidence analysis system.

## Project Overview

The Title IX Victim Advocacy Platform is a sophisticated advocacy technology solution that combines AI-powered evidence analysis with modern web interfaces to help victims, families, and advocates fight back against educational institutions that mishandle Title IX cases.

### Core Technologies

- **Backend**: Java 21, Maven, LangChain4j, Azure OpenAI, PostgreSQL, Redis
- **Frontend**: Next.js 15, TypeScript, Material UI, TailwindCSS, Drizzle ORM
- **AI/ML**: Azure OpenAI GPT-4, vector embeddings, semantic search
- **Infrastructure**: Docker, Azure services, GitHub Actions

## Architecture Patterns

### Frontend (TypeScript/React)

#### Component Development

Follow these patterns for React components:

```typescript
// Use proper TypeScript interfaces for evidence components
interface EvidenceMessageProps {
  evidenceId: string;
  showViolationAnalysis?: boolean;
  onAnalysisComplete?: (result: ViolationAnalysisResult) => void;
}

// Prefer functional components with hooks for advocacy interface
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

```typescript
// Use repository pattern for evidence data access
export class EvidenceRepository extends AbstractObjectRepository<EvidenceMessage> {
  async findWithViolationAnalysis(
    filters: EvidenceFilters,
  ): Promise<PaginatedResultset<EvidenceWithAnalysis>> {
    const query = sql`
      SELECT e.*, a.violation_analysis_result 
      FROM evidence e 
      LEFT JOIN evidence_violation_analysis a ON e.id = a.evidence_id
      WHERE ${this.buildFilterConditions(filters)}
    `;

    return this.executeQuery(query, this.mapToEvidenceWithAnalysis);
  }
}
```

## Development Guidelines

### Code Quality Standards

#### Java Code Style

- **Naming**: Use descriptive names (`DocumentAnalysisProcessor` not `DocProcessor`)
- **Methods**: Keep methods focused and under 50 lines
- **Error Handling**: Always use try-catch with proper logging
- **Documentation**: Add Javadoc for public methods and classes
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

When working with AI prompts:

```java
// Use structured prompts with clear sections for violation detection
public static String buildViolationAnalysisPrompt(EvidenceContext context) {
    return String.format("""
        === CONTEXT ===
        Evidence Type: %s
        Source: %s
        Content Length: %d characters

        === TASK ===
        Analyze this evidence for Title IX violations and institutional failures.

        === INSTRUCTIONS ===
        1. Identify specific policy violations and institutional failures
        2. Assess violation severity on scale 1-10
        3. Extract evidence of institutional misconduct
        4. Provide specific recommendations for victim advocacy

        === OUTPUT FORMAT ===
        Return structured JSON with fields: violation_score, key_violations, institutional_failures, advocacy_recommendations

        === EVIDENCE CONTENT ===
        %s
        """,
        context.getEvidenceType(),
        context.getSource(),
        context.getContent().length(),
        context.getContent()
    );
}
```

#### Tool Development

```java
// Tools should be focused and single-purpose for advocacy
@Tool(name = "analyzeInstitutionalFailure")
public InstitutionalFailureAssessment analyzeInstitutionalFailure(
    @P("Evidence content to analyze for institutional failures") String content,
    @P("Analysis scope: 'basic' or 'detailed'") String scope
) {
    // Validate inputs
    if (content == null || content.trim().isEmpty()) {
        throw new IllegalArgumentException("Evidence content cannot be empty");
    }

    // Process with clear error handling for advocacy cases
    try {
        return failureAnalyzer.assess(content, AnalysisScope.valueOf(scope.toUpperCase()));
    } catch (Exception e) {
        logger.error("Institutional failure analysis failed", e);
        return InstitutionalFailureAssessment.failed("Analysis error: " + e.getMessage());
    }
}
```

### Database Operations

#### Query Patterns

```java
// Use parameterized queries consistently for evidence management
public List<EvidenceUnit> findEvidenceByDateRange(LocalDate start, LocalDate end) {
    String sql = """
        SELECT * FROM evidence_units
        WHERE created_on BETWEEN ? AND ?
        AND status = 'active'
        ORDER BY created_on DESC
    """;

    return db().query(sql, this::mapToEvidenceUnit, start, end);
}

// Use transactions for complex operations in advocacy cases
public void processEvidenceBatch(List<EvidenceUnit> evidence) throws SQLException {
    db().executeInTransaction(connection -> {
        for (EvidenceUnit item : evidence) {
            saveEvidence(connection, item);
            scheduleViolationAnalysis(connection, item.getId());
            updateProcessingQueue(connection, item.getId());
        }
        return null;
    });
}
```

#### TypeScript Database Access

```typescript
// Use Drizzle ORM for type-safe queries in advocacy cases
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

#### Java Testing

```java
// Unit tests with proper mocking
@ExtendWith(MockitoExtension.class)
class DocumentAnalysisServiceTest {

    @Mock private DocumentRepository documentRepository;
    @Mock private AiAnalysisService aiService;
    @InjectMocks private DocumentAnalysisService service;

    @Test
    void shouldAnalyzeDocumentSuccessfully() {
        // Given
        DocumentUnit document = createTestDocument();
        when(documentRepository.findById(1)).thenReturn(Optional.of(document));
        when(aiService.analyze(any())).thenReturn(createAnalysisResult());

        // When
        AnalysisResult result = service.analyzeDocument(1);

        // Then
        assertThat(result.getStatus()).isEqualTo(AnalysisStatus.COMPLETED);
        assertThat(result.getTitleIxRelevance()).isGreaterThan(0);
        verify(documentRepository).save(any(DocumentUnit.class));
    }
}
```

#### Frontend Testing

```typescript
// Component testing with React Testing Library
describe('EmailList', () => {
  it('should filter emails by Title IX relevance', async () => {
    const mockEmails = [
      { id: '1', subject: 'Title IX Complaint', titleIxRelevant: true },
      { id: '2', subject: 'General Email', titleIxRelevant: false },
    ];

    render(<EmailList emails={mockEmails} />);

    const filterCheckbox = screen.getByLabelText(/title ix relevant/i);
    await userEvent.click(filterCheckbox);

    expect(screen.getByText('Title IX Complaint')).toBeInTheDocument();
    expect(screen.queryByText('General Email')).not.toBeInTheDocument();
  });
});
```

### Performance Optimization

#### Backend Performance

```java
// Use connection pooling and batch operations
public void processBatchDocuments(List<DocumentUnit> documents) {
    // Process in chunks to avoid memory issues
    int batchSize = 100;
    for (int i = 0; i < documents.size(); i += batchSize) {
        List<DocumentUnit> batch = documents.subList(i,
            Math.min(i + batchSize, documents.size()));

        // Use batch processing for database operations
        batchInsertDocuments(batch);

        // Queue analysis jobs asynchronously
        queueAnalysisJobs(batch);
    }
}
```

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

```java
// Use constructor injection
public class DocumentProcessor {
    private final DocumentRepository repository;
    private final AiAnalysisService aiService;
    private final NotificationService notificationService;

    public DocumentProcessor(DocumentRepository repository,
                           AiAnalysisService aiService,
                           NotificationService notificationService) {
        this.repository = repository;
        this.aiService = aiService;
        this.notificationService = notificationService;
    }
}
```

#### Error Handling

```typescript
// Comprehensive error handling with user feedback
const useDocumentProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<ProcessingError | null>(null);

  const processDocument = useCallback(async (documentId: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await documentApi.process(documentId);
      return result;
    } catch (err) {
      const processingError =
        err instanceof ProcessingError
          ? err
          : new ProcessingError('Unknown processing error', err);

      setError(processingError);
      logger.error('Document processing failed', { documentId, error: err });
      throw processingError;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { processDocument, isProcessing, error };
};
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
```

#### Avoid Hardcoded AI Prompts

```java
// ❌ Don't hardcode prompts
public String analyzeDocument(String content) {
    String prompt = "Analyze this for Title IX: " + content;
    return aiService.complete(prompt);
}

// ✅ Use structured prompt builders
public String analyzeDocument(String content) {
    String prompt = Prompts.buildDocumentAnalysisPrompt()
        .withContent(content)
        .withAnalysisType(AnalysisType.TITLE_IX)
        .withOutputFormat(OutputFormat.STRUCTURED_JSON)
        .build();

    return aiService.complete(prompt);
}
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

### Common Issues and Solutions

#### AI Assistant Not Responding

```java
// Add timeout and retry logic for evidence analysis
@Retryable(value = {AiServiceException.class}, maxAttempts = 3)
public ViolationAnalysisResult analyzeWithRetry(EvidenceUnit evidence) {
    try {
        return aiAssistant.analyzeViolations(evidence, Duration.ofMinutes(5));
    } catch (TimeoutException e) {
        logger.warn("AI violation analysis timeout for evidence {}, retrying...", evidence.getId());
        throw new AiServiceException("Violation analysis timeout", e);
    }
}
```

#### Frontend Performance Issues

```typescript
// Use React DevTools Profiler to identify bottlenecks in evidence processing
const ProfiledEvidenceList = memo(({ evidence }: EvidenceListProps) => {
  const [visibleEvidence, setVisibleEvidence] = useState<Evidence[]>([]);

  // Implement virtual scrolling for large evidence lists
  const listRef = useRef<FixedSizeList>(null);

  useEffect(() => {
    // Optimize rendering by only showing visible items
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleCount, evidence.length);
    setVisibleEvidence(evidence.slice(startIndex, endIndex));
  }, [evidence, scrollTop]);

  return <VirtualList ref={listRef} items={visibleEvidence} />;
});
```

### Logging Best Practices

```java
// Structured logging with context for advocacy cases
logger.info("Evidence violation analysis started",
    kv("evidenceId", evidence.getId()),
    kv("evidenceType", evidence.getType()),
    kv("analysisStage", currentStage),
    kv("advocateId", getCurrentAdvocate().getId())
);

// Performance logging for evidence processing
try (Timer.Sample sample = Timer.start(meterRegistry)) {
    ViolationAnalysisResult result = performViolationAnalysis(evidence);
    sample.stop(Timer.builder("evidence.violation.analysis.duration")
        .tag("stage", currentStage)
        .tag("success", "true")
        .register(meterRegistry));
    return result;
} catch (Exception e) {
    sample.stop(Timer.builder("evidence.violation.analysis.duration")
        .tag("stage", currentStage)
        .tag("success", "false")
        .register(meterRegistry));
    throw e;
}
```

## Future Considerations

### Scalability Planning

- Design for multi-tenant architecture if needed
- Consider event-driven architecture for better decoupling
- Plan for horizontal scaling of AI processing components
- Implement proper caching strategies for frequently accessed data

### Technology Evolution

- Stay updated with LangChain4j framework updates
- Monitor Azure OpenAI service improvements and new models
- Consider emerging vector database technologies
- Plan for Next.js and React ecosystem updates

### Compliance Evolution

- Design flexible rule engines for changing compliance requirements
- Implement configurable analysis pipelines
- Plan for new document types and sources
- Consider internationalization for multi-jurisdiction compliance

This instruction set provides a comprehensive foundation for AI-assisted development on the Title IX Victim Advocacy Platform. Follow these patterns and guidelines to maintain consistency, quality, and alignment with the project's advocacy-focused architectural principles.
