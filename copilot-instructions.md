# Copilot Instructions for Title IX Compliance Platform

This document provides comprehensive guidelines for LLM-based development assistance on the Title IX Compliance Platform. These instructions optimize AI assistance for the specific architecture, patterns, and requirements of this educational compliance system.

## Project Overview

The Title IX Compliance Platform is a sophisticated educational technology solution that combines AI-powered document analysis with modern web interfaces to help educational institutions manage compliance requirements efficiently.

### Core Technologies
- **Backend**: Java 21, Maven, LangChain4j, Azure OpenAI, PostgreSQL, Redis
- **Frontend**: Next.js 15, TypeScript, Material UI, TailwindCSS, Drizzle ORM
- **AI/ML**: Azure OpenAI GPT-4, vector embeddings, semantic search
- **Infrastructure**: Docker, Azure services, GitHub Actions

## Architecture Patterns

### Backend (Java)
Follow these established patterns when working with the Java backend:

#### Repository Pattern
```java
// Always extend from base repository classes
public class DocumentAnalysisRepository extends BaseRepository<DocumentAnalysis> {
    
    // Use builder pattern for complex entities
    public DocumentAnalysis createAnalysis(DocumentAnalysisRequest request) {
        return DocumentAnalysis.builder()
            .documentId(request.getDocumentId())
            .analysisType(request.getAnalysisType())
            .createdAt(LocalDateTime.now())
            .build();
    }
    
    // Implement consistent error handling
    public Optional<DocumentAnalysis> findByDocumentId(Integer documentId) {
        try {
            return db().query(
                "SELECT * FROM document_analysis WHERE document_id = ?",
                this::mapToEntity,
                documentId
            ).stream().findFirst();
        } catch (SQLException e) {
            logger.error("Failed to find analysis for document {}", documentId, e);
            return Optional.empty();
        }
    }
}
```

#### AI Assistant Development
When creating new AI assistants:
```java
// Extend ToolAwareAssistant for AI functionality
public class CustomComplianceAssistant extends ToolAwareAssistant {
    
    @Override
    protected String getSystemPrompt() {
        return Prompts.buildSystemPrompt()
            .withContext("compliance analysis")
            .withInstructions("Focus on Title IX relevance")
            .build();
    }
    
    @Override
    protected List<MessageTool<?>> getTools() {
        return List.of(
            new PolicyLookupTool(),
            new DocumentAnalysisTool(),
            new CallToActionTool()
        );
    }
}
```

#### Tool Implementation
```java
// Custom tools should extend MessageTool
public class PolicyLookupTool extends MessageTool<PolicySearchResult> {
    
    @Tool(
        name = "lookupPolicy",
        value = "Searches for relevant policies based on query criteria"
    )
    public String lookupPolicy(
        @P(required = true, value = "The search query for policy lookup") String query,
        @P(required = false, value = "Policy type filter") String policyType
    ) {
        // Implementation with proper error handling
        try {
            return policyService.search(query, policyType);
        } catch (Exception e) {
            logger.error("Policy lookup failed for query: {}", query, e);
            return "ERROR: Policy lookup failed - " + e.getMessage();
        }
    }
}
```

### Frontend (TypeScript/React)

#### Component Development
Follow these patterns for React components:
```typescript
// Use proper TypeScript interfaces
interface EmailMessageProps {
  emailId: string;
  showAnalysis?: boolean;
  onAnalysisComplete?: (result: AnalysisResult) => void;
}

// Prefer functional components with hooks
const EmailMessage = memo(({ emailId, showAnalysis, onAnalysisComplete }: EmailMessageProps) => {
  const { data: email, isLoading, error } = useEmail(emailId);
  const { mutate: triggerAnalysis } = useAnalysisProcessor();
  
  // Use early returns for loading states
  if (isLoading) return <EmailSkeleton />;
  if (error) return <ErrorBoundary error={error} />;
  if (!email) return <NotFoundMessage />;
  
  return (
    <Card className={classnames(display('flex'), flexDirection('flex-col'))}>
      <EmailHeader email={email} />
      <EmailContent content={email.content} />
      {showAnalysis && (
        <AnalysisPanel 
          emailId={emailId} 
          onComplete={onAnalysisComplete}
        />
      )}
    </Card>
  );
});
```

#### API Integration
```typescript
// Use repository pattern for data access
export class EmailRepository extends AbstractObjectRepository<EmailMessage> {
  
  async findWithAnalysis(filters: EmailFilters): Promise<PaginatedResultset<EmailWithAnalysis>> {
    const query = sql`
      SELECT e.*, a.analysis_result 
      FROM emails e 
      LEFT JOIN email_analysis a ON e.id = a.email_id
      WHERE ${this.buildFilterConditions(filters)}
    `;
    
    return this.executeQuery(query, this.mapToEmailWithAnalysis);
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

### AI Integration Best Practices

#### Prompt Engineering
When working with AI prompts:
```java
// Use structured prompts with clear sections
public static String buildAnalysisPrompt(DocumentContext context) {
    return String.format("""
        === CONTEXT ===
        Document Type: %s
        Source: %s
        Content Length: %d characters
        
        === TASK ===
        Analyze this document for Title IX compliance relevance.
        
        === INSTRUCTIONS ===
        1. Identify key compliance indicators
        2. Assess relevance on scale 1-10
        3. Extract actionable items
        4. Provide specific recommendations
        
        === OUTPUT FORMAT ===
        Return structured JSON with fields: relevance_score, key_points, actions, recommendations
        
        === DOCUMENT CONTENT ===
        %s
        """, 
        context.getDocumentType(),
        context.getSource(),
        context.getContent().length(),
        context.getContent()
    );
}
```

#### Tool Development
```java
// Tools should be focused and single-purpose
@Tool(name = "analyzeComplianceRisk")
public ComplianceRiskAssessment analyzeComplianceRisk(
    @P("Document content to analyze") String content,
    @P("Analysis scope: 'basic' or 'detailed'") String scope
) {
    // Validate inputs
    if (content == null || content.trim().isEmpty()) {
        throw new IllegalArgumentException("Document content cannot be empty");
    }
    
    // Process with clear error handling
    try {
        return riskAnalyzer.assess(content, AnalysisScope.valueOf(scope.toUpperCase()));
    } catch (Exception e) {
        logger.error("Risk analysis failed", e);
        return ComplianceRiskAssessment.failed("Analysis error: " + e.getMessage());
    }
}
```

### Database Operations

#### Query Patterns
```java
// Use parameterized queries consistently
public List<DocumentUnit> findDocumentsByDateRange(LocalDate start, LocalDate end) {
    String sql = """
        SELECT * FROM document_units 
        WHERE created_on BETWEEN ? AND ?
        AND status = 'active'
        ORDER BY created_on DESC
    """;
    
    return db().query(sql, this::mapToDocumentUnit, start, end);
}

// Use transactions for complex operations
public void processDocumentBatch(List<DocumentUnit> documents) throws SQLException {
    db().executeInTransaction(connection -> {
        for (DocumentUnit doc : documents) {
            saveDocument(connection, doc);
            scheduleAnalysis(connection, doc.getId());
            updateProcessingQueue(connection, doc.getId());
        }
        return null;
    });
}
```

#### TypeScript Database Access
```typescript
// Use Drizzle ORM for type-safe queries
const emailsWithAnalysis = await db
  .select({
    id: emails.id,
    subject: emails.subject,
    sender: emails.sender,
    analysisScore: emailAnalysis.titleIxRelevance,
    keyPoints: emailAnalysis.keyPoints,
  })
  .from(emails)
  .leftJoin(emailAnalysis, eq(emails.id, emailAnalysis.emailId))
  .where(
    and(
      gte(emails.sentDate, startDate),
      lte(emails.sentDate, endDate),
      eq(emails.processed, true)
    )
  )
  .orderBy(desc(emails.sentDate));
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
      const processingError = err instanceof ProcessingError 
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
    db.query('SELECT * FROM emails WHERE id = ?', [emailId])
      .then(setEmail);
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

### Title IX Compliance Context
When working on compliance-related features:
- **Sensitivity**: Handle all data with appropriate privacy considerations
- **Audit Trail**: Ensure all processing activities are logged and traceable
- **Accuracy**: Prioritize precision in AI analysis to avoid false positives/negatives
- **Timeliness**: Implement appropriate urgency levels for different compliance scenarios

### Educational Institution Requirements
- **Privacy**: FERPA compliance for student data handling
- **Accessibility**: WCAG 2.1 AA compliance for web interfaces
- **Integration**: Consider existing campus systems and workflows
- **Scalability**: Design for institutional scale (thousands of emails/documents)

### AI Model Considerations
- **Cost Management**: Monitor token usage and implement efficient caching
- **Quality Control**: Implement validation layers for AI-generated content
- **Bias Detection**: Include checks for bias in analysis results
- **Model Updates**: Design for easy model switching and A/B testing

## Debugging and Troubleshooting

### Common Issues and Solutions

#### AI Assistant Not Responding
```java
// Add timeout and retry logic
@Retryable(value = {AiServiceException.class}, maxAttempts = 3)
public AnalysisResult analyzeWithRetry(DocumentUnit document) {
    try {
        return aiAssistant.analyze(document, Duration.ofMinutes(5));
    } catch (TimeoutException e) {
        logger.warn("AI analysis timeout for document {}, retrying...", document.getId());
        throw new AiServiceException("Analysis timeout", e);
    }
}
```

#### Frontend Performance Issues
```typescript
// Use React DevTools Profiler to identify bottlenecks
const ProfiledEmailList = memo(({ emails }: EmailListProps) => {
  const [visibleEmails, setVisibleEmails] = useState<Email[]>([]);
  
  // Implement virtual scrolling for large lists
  const listRef = useRef<FixedSizeList>(null);
  
  useEffect(() => {
    // Optimize rendering by only showing visible items
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleCount, emails.length);
    setVisibleEmails(emails.slice(startIndex, endIndex));
  }, [emails, scrollTop]);
  
  return <VirtualList ref={listRef} items={visibleEmails} />;
});
```

### Logging Best Practices
```java
// Structured logging with context
logger.info("Document analysis started", 
    kv("documentId", document.getId()),
    kv("documentType", document.getType()),
    kv("analysisStage", currentStage),
    kv("userId", getCurrentUser().getId())
);

// Performance logging
try (Timer.Sample sample = Timer.start(meterRegistry)) {
    AnalysisResult result = performAnalysis(document);
    sample.stop(Timer.builder("document.analysis.duration")
        .tag("stage", currentStage)
        .tag("success", "true")
        .register(meterRegistry));
    return result;
} catch (Exception e) {
    sample.stop(Timer.builder("document.analysis.duration")
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

This instruction set provides a comprehensive foundation for AI-assisted development on the Title IX Compliance Platform. Follow these patterns and guidelines to maintain consistency, quality, and alignment with the project's architectural principles.