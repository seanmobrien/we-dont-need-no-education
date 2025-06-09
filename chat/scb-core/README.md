# SCB Core Module

The SCB (School Chatbot) Core module contains the fundamental data models, repositories, and business logic for the Title IX Compliance Platform. It serves as the central data access layer and domain model for all document analysis, compliance tracking, and audit trail functionality.

## Purpose

This module provides the core business logic and data management capabilities:
- **Domain Models**: Comprehensive data models for documents, analysis results, and compliance tracking
- **Repository Layer**: Data access objects implementing the repository pattern
- **Business Services**: Core business logic for document processing and analysis
- **Audit Trail**: Complete tracking of all document analysis stages and changes
- **Data Validation**: Input validation and data integrity enforcement

## Package Structure

```
com.obapps.schoolchatbot.core/
├── models/              # Domain models and data entities
│   ├── ai/             # AI-specific models and responses
│   ├── analysis/       # Document analysis result models
│   └── embed/          # Embedding and vector search models
├── repositories/       # Data access layer implementations
├── services/           # Business logic and service layer
├── assistants/         # AI assistant configuration and prompts
├── embed/              # Document embedding utilities
└── util/               # Core-specific utility classes
```

## Key Domain Models

### Document Management
- **`DocumentUnit`**: Core document entity with metadata and content
- **`DocumentProperty`**: Document properties and attributes
- **`DocumentType`**: Document categorization and type definitions
- **`DocumentRelationship`**: Relationships between related documents
- **`DocumentWithMetadata`**: Enhanced document with analysis metadata

### Analysis and Processing
- **`DocumentUnitAnalysisStageAudit`**: Audit trail for document analysis stages
- **`AnalystDocumentResult`**: Results from AI-powered document analysis
- **`PendingStageAnalyst`**: Queue management for pending analysis tasks
- **`DocumentUnitAnalysisFunctionAudit`**: Function-level audit trail

### Title IX Compliance
- **`CallToAction`**: Actionable items identified in documents
- **`CallToActionCategory`**: Categorization of call-to-action types
- **`CallToActionResponse`**: Responses to identified actions
- **`AssociatedCallToAction`**: Associations between documents and actions

### Key Points and Insights
- **`KeyPoint`**: Important points extracted from documents
- **`HistoricKeyPoint`**: Historical tracking of key points
- **`HistoricCallToAction`**: Historical call-to-action tracking
- **`HistoricCommunicationRecord`**: Communication history and patterns

### Email and Attachments
- **`EmailAttachment`**: Email attachment metadata and processing
- **`SchoolDocument`**: School-specific document types and handling

## Repository Layer

### Core Repositories
- **`DocumentUnitAnalysisStageAuditRepository`**: Manages document analysis audit trails
- **`HistoricCallToActionRepository`**: Handles historical call-to-action data
- **`HistoricKeyPointRepository`**: Manages historical key point tracking

### Repository Features
```java
// Example repository usage
DocumentUnitAnalysisStageAuditRepository auditRepo = 
    new DocumentUnitAnalysisStageAuditRepository();

// Save audit record
DocumentUnitAnalysisStageAudit audit = DocumentUnitAnalysisStageAudit.builder()
    .documentId(documentId)
    .stage("title-ix-assessment")
    .status("completed")
    .analysisResult(result)
    .build();
auditRepo.save(audit);

// Retrieve analysis history
List<DocumentUnitAnalysisStageAudit> history = 
    auditRepo.findByDocumentId(documentId);
```

## Data Models Overview

### DocumentUnit - Core Document Entity
```java
DocumentUnit document = DocumentUnit.builder()
    .emailId("email123")
    .attachmentId("attachment456")
    .documentType("email")
    .content("Document content...")
    .createdOn(LocalDateTime.now())
    .threadId(789)
    .build();
```

### CallToAction - Actionable Items
```java
CallToAction cta = CallToAction.builder()
    .documentId(documentId)
    .category(CallToActionCategory.INVESTIGATION_REQUIRED)
    .description("Investigation needed for Title IX complaint")
    .priority("HIGH")
    .dueDate(LocalDate.now().plusDays(30))
    .assignedTo("compliance.officer@school.edu")
    .build();
```

### Analysis Stage Audit
```java
DocumentUnitAnalysisStageAudit audit = DocumentUnitAnalysisStageAudit.builder()
    .documentId(documentId)
    .stage("phase-1-analysis")
    .status("in-progress")
    .startedAt(LocalDateTime.now())
    .processingNotes("Initial categorization and key point extraction")
    .build();
```

## Business Services

### Document Processing Services
- **Document Analysis Orchestration**: Coordinating multi-stage document analysis
- **Compliance Assessment**: Title IX relevance and compliance evaluation
- **Audit Trail Management**: Comprehensive tracking of all processing activities
- **Data Validation**: Input validation and business rule enforcement

### Integration Services
- **Email Processing**: Integration with email systems and attachment handling
- **AI Model Integration**: Interface layer for AI-powered analysis services
- **Queue Management**: Background processing and workflow coordination
- **Notification Services**: Alerts and notifications for compliance events

## AI Integration Models

### Analysis Configuration
- **`ProgramOptions`**: Configuration for analysis programs and workflows
- **`EmbedDocumentsOptions`**: Settings for document embedding processes
- **`EmbedPolicyFolderOptions`**: Policy document embedding configuration

### AI Response Models
Located in `models/ai/` package:
- **AI Response Structures**: Standardized formats for AI analysis results
- **Tool Integration Models**: Data structures for AI tool interactions
- **Processing Metadata**: Tracking of AI model usage and performance

## Embedding and Search

### Vector Search Models
Located in `models/embed/` package:
- **Embedding Metadata**: Vector embedding information and parameters
- **Search Result Models**: Structured search results with relevance scoring
- **Similarity Metrics**: Document similarity and clustering models

## Database Schema Integration

### Entity Relationships
```sql
-- Core document table
CREATE TABLE document_units (
    unit_id SERIAL PRIMARY KEY,
    email_id VARCHAR(255),
    attachment_id INTEGER,
    document_type VARCHAR(100),
    content TEXT,
    created_on TIMESTAMP,
    thread_id INTEGER
);

-- Analysis audit trail
CREATE TABLE document_unit_analysis_stage_audit (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES document_units(unit_id),
    stage VARCHAR(100),
    status VARCHAR(50),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    analysis_result JSONB,
    processing_notes TEXT
);

-- Call to action tracking
CREATE TABLE call_to_actions (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES document_units(unit_id),
    category VARCHAR(100),
    description TEXT,
    priority VARCHAR(20),
    due_date DATE,
    assigned_to VARCHAR(255),
    status VARCHAR(50)
);
```

## Configuration

### Database Configuration
Repository classes use the core database utilities:
```java
// Default constructor uses singleton Db instance
DocumentUnitAnalysisStageAuditRepository repo = 
    new DocumentUnitAnalysisStageAuditRepository();

// Custom database instance for testing
DocumentUnitAnalysisStageAuditRepository testRepo = 
    new DocumentUnitAnalysisStageAuditRepository(testDb);
```

### Model Validation
Built-in validation for all domain models:
```java
// Automatic validation on model creation
DocumentUnit document = DocumentUnit.builder()
    .emailId(null) // Will throw validation exception
    .build();

// Validation utilities
ValidationResult result = ModelValidator.validate(document);
if (!result.isValid()) {
    throw new ValidationException(result.getErrors());
}
```

## Testing

### Unit Tests
Comprehensive test coverage for:
- **Model Validation**: Testing all domain model validation rules
- **Repository Operations**: Database CRUD operations and query methods
- **Business Logic**: Service layer logic and workflows
- **Data Integrity**: Referential integrity and constraint validation

### Test Utilities
```java
// Repository testing with test database
@TestDatabase
class DocumentUnitAnalysisStageAuditRepositoryTest {
    
    @Test
    void testSaveAndRetrieve() {
        DocumentUnitAnalysisStageAudit audit = createTestAudit();
        repository.save(audit);
        
        List<DocumentUnitAnalysisStageAudit> results = 
            repository.findByDocumentId(audit.getDocumentId());
        
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getStage()).isEqualTo("test-stage");
    }
}
```

### Mock Data Factories
```java
// Test data generation utilities
public class TestDataFactory {
    public static DocumentUnit createTestDocument() {
        return DocumentUnit.builder()
            .emailId("test-email-" + UUID.randomUUID())
            .documentType("email")
            .content("Test document content")
            .createdOn(LocalDateTime.now())
            .build();
    }
    
    public static CallToAction createTestCallToAction(Integer documentId) {
        return CallToAction.builder()
            .documentId(documentId)
            .category(CallToActionCategory.REVIEW_REQUIRED)
            .description("Test call to action")
            .priority("MEDIUM")
            .build();
    }
}
```

## Performance Considerations

### Database Optimization
- **Indexing Strategy**: Optimized indexes for common query patterns
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Optimized queries for large document sets
- **Batch Operations**: Bulk insert/update operations for performance

### Memory Management
- **Lazy Loading**: Efficient loading of related entities
- **Result Set Streaming**: Large result set handling without memory issues
- **Cache Management**: Strategic caching of frequently accessed data
- **Garbage Collection**: Optimized object lifecycle management

## Error Handling

### Exception Hierarchy
```java
// Domain-specific exceptions
public class DocumentProcessingException extends Exception {
    public DocumentProcessingException(String message, Throwable cause) {
        super(message, cause);
    }
}

public class AnalysisStageException extends DocumentProcessingException {
    private final String stage;
    private final Integer documentId;
    
    public AnalysisStageException(String stage, Integer documentId, 
                                 String message, Throwable cause) {
        super(message, cause);
        this.stage = stage;
        this.documentId = documentId;
    }
}
```

### Data Integrity
- **Referential Integrity**: Foreign key constraints and cascade rules
- **Business Rule Validation**: Domain-specific validation rules
- **Transaction Management**: ACID compliance for complex operations
- **Audit Trail Integrity**: Immutable audit records with full traceability

## Monitoring and Observability

### Performance Metrics
- Repository operation timing and success rates
- Document processing throughput and latency
- Database query performance and optimization opportunities
- Memory usage patterns and garbage collection metrics

### Audit and Compliance
- Complete audit trail for all document processing activities
- Compliance tracking with detailed reporting capabilities
- Data retention and archival policies
- Access logging and security monitoring

## Contributing

When extending the SCB Core module:
1. **Follow Domain-Driven Design**: Keep domain models focused and cohesive
2. **Maintain Data Integrity**: Ensure all database operations maintain consistency
3. **Add Comprehensive Tests**: Cover all new functionality with unit and integration tests
4. **Document Schema Changes**: Update database migration scripts and documentation
5. **Performance Testing**: Validate performance impact of new features

## Dependencies

### Core Dependencies
- **PostgreSQL JDBC Driver**: Database connectivity
- **HikariCP**: Connection pooling (inherited from core module)
- **Jackson**: JSON serialization for complex data types
- **Bean Validation**: Model validation annotations

### Development Dependencies
- **JUnit 5**: Testing framework
- **Mockito**: Mocking for unit tests
- **TestContainers**: Database integration testing
- **H2 Database**: In-memory database for testing

## Version History

### Current Version: 1.0.1-SNAPSHOT
- Enhanced audit trail capabilities with detailed stage tracking
- Improved document relationship modeling
- Performance optimizations for large document sets
- Extended call-to-action categorization and tracking