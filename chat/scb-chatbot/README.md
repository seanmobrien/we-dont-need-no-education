# SCB Chatbot Module

The SCB (Victim Advocacy) Chatbot module is the main application and orchestration layer for the Title IX Victim Advocacy Platform. It provides AI-powered evidence analysis assistants, interactive advocacy assistance, and coordinates the entire evidence processing pipeline through intelligent automation to help victims build strong cases against institutional misconduct.

## Purpose

This module serves as the primary entry point and orchestration layer for:
- **AI-Powered Advocacy Assistant**: Interactive conversational interface for evidence analysis and case building
- **Evidence Processing Pipeline**: Multi-stage automated evidence analysis workflow for violation detection
- **AI Violation Detection**: Specialized AI agents for different analysis tasks focused on institutional failures
- **Tool Integration**: Custom tools for evidence search, violation analysis, and case building
- **Queue Coordination**: Management of asynchronous processing workflows for large evidence volumes

## Architecture Overview

```
scb-chatbot/
├── chat/
│   ├── SchoolChatBot.java          # Main application entry point for advocacy platform
│   ├── assistants/                 # AI assistant implementations for case building
│   │   ├── tools/                  # Custom AI tools for violation detection
│   │   ├── services/               # AI processing services for advocacy
│   │   └── content/                # Content management for evidence
│   └── services/                   # Supporting services for victim advocacy
└── script/                         # Deployment and utility scripts
```

## Key Components

### Main Application (`SchoolChatBot.java`)
The central application class that provides:
- **Interactive Menu System**: Command-line interface for various advocacy operations
- **Environment Detection**: Development vs. production mode handling for case processing
- **Service Coordination**: Orchestrates all AI and processing services for victim support
- **User Interface**: Console-based user interaction for advocates and support staff

### AI Assistants

#### Evidence Analysis Assistants
- **Key Violation Analysis**: Extracts important violations and institutional failures from evidence
- **Institutional Failure Analysis**: Identifies institutional failures to respond appropriately to reports
- **Title IX Violation Assessment**: Evaluates evidence for Title IX compliance failures and misconduct
- **Case Building**: Multi-phase evidence analysis workflow to build comprehensive advocacy cases

#### Assistant Factory (`StageAnalystFactory`)
```java
// Dynamic assistant creation based on advocacy analysis stage
StageAnalystFactory factory = new StageAnalystFactory();

ToolAwareAssistant assistant = factory.createAssistant(
    stage: "title-ix-assessment",
    documentType: DocumentType.EMAIL,
    configuration: analysisConfig
);

// Process document with appropriate assistant
AnalysisResult result = assistant.analyze(document);
```

### Custom AI Tools

#### Call-to-Action Tool (`CallToActionTool`)
Specialized tool for identifying and managing actionable items:
```java
@Tool(name = "identifyCallToAction")
public CallToActionResponse identifyCallToAction(
    @P("documentContent") String content,
    @P("context") String context,
    @P("priority") String priority) {
    
    // AI-powered call-to-action identification
    return analyzeForActions(content, context, priority);
}
```

#### Key Points Tool (`AddKeyPointsTool`)
Extracts and categorizes important information:
```java
@Tool(name = "extractKeyPoints")
public List<KeyPoint> extractKeyPoints(
    @P("documentContent") String content,
    @P("analysisScope") String scope) {
    
    // Extract structured key points from document
    return processKeyPoints(content, scope);
}
```

#### Document Lookup Tools
- **Policy Search**: `lookupPolicySummary()` for policy document retrieval
- **Document Search**: `lookupDocumentSummary()` for general document search
- **Vector Search**: Semantic similarity search across document collections

### Processing Pipeline

#### Multi-Stage Analysis
```java
// Stage 1: Initial categorization and key point extraction
Stage1Processor stage1 = new Stage1Processor();
Stage1Result initialAnalysis = stage1.process(document);

// Stage 2: Title IX relevance assessment
Stage2Processor stage2 = new Stage2Processor();
Stage2Result titleIXAssessment = stage2.process(document, initialAnalysis);

// Stage 3: Call-to-action identification and reconciliation
Stage3Processor stage3 = new Stage3Processor();
Stage3Result finalAnalysis = stage3.process(document, titleIXAssessment);
```

#### Queue-Based Processing
- **Redis Queues**: Asynchronous task processing with Redis
- **Worker Coordination**: Multiple worker processes for scalability
- **Error Handling**: Robust retry and error recovery mechanisms
- **Progress Tracking**: Real-time status updates for long-running analyses

### Interactive Features

#### Console Interface
```
Welcome to the School Chat Bot!
Please select an option:
1. Chat with tool support
2. Analyze for Key Points  
3. Analyze for Calls to Action
4. Process Documents for Stage 1
5. Process Documents for Stage 2
6. Reconcile and Process Stage 3
7. Embed Documents
8. Run Batch Analysis
9. View Analysis Results
0. Exit
```

#### Chat Mode
```java
// Interactive chat with AI assistant
Scanner scanner = SchoolChatBot.getInstance().getScanner();
ToolAwareAssistant chatAssistant = createChatAssistant();

while (true) {
    System.out.print("You: ");
    String userInput = scanner.nextLine();
    
    if ("exit".equalsIgnoreCase(userInput)) break;
    
    String response = chatAssistant.chat(userInput);
    System.out.println("Assistant: " + response);
}
```

## AI Integration

### LangChain4j Integration
- **Tool-Aware Assistants**: AI agents equipped with custom tools
- **Memory Management**: Conversation history and context retention
- **Model Configuration**: Flexible AI model selection and parameters
- **Prompt Engineering**: Sophisticated prompts for domain-specific analysis

### Azure OpenAI Integration
```java
// Azure OpenAI model configuration
AzureOpenAiChatModel chatModel = AzureOpenAiChatModel.builder()
    .apiKey(System.getenv("AZURE_OPENAI_KEY"))
    .endpoint(System.getenv("AZURE_OPENAI_ENDPOINT"))
    .deploymentName("gpt-4o")
    .temperature(0.1)
    .maxTokens(4000)
    .build();
```

### Prompt Engineering (`Prompts.java`)
Comprehensive prompt templates for different analysis phases:
- **Phase 1 Prompts**: Initial document categorization
- **Phase 2 Prompts**: Title IX relevance assessment  
- **Phase 3 Prompts**: Reconciliation and finalization
- **Tool Descriptions**: Detailed descriptions for AI tool usage
- **Field Specifications**: Structured output format definitions

## Document Processing Workflows

### Batch Processing
```java
// Batch document analysis
BatchProcessor batchProcessor = new BatchProcessor();

BatchProcessingOptions options = BatchProcessingOptions.builder()
    .sourceDirectory("/path/to/documents")
    .processingStage(ProcessingStage.STAGE_1)
    .maxConcurrency(4)
    .enableAuditTrail(true)
    .build();

BatchResult result = batchProcessor.processDocuments(options);
```

### Real-time Processing
```java
// Real-time document analysis via queue
DocumentProcessor processor = new DocumentProcessor();

// Add document to processing queue
processor.enqueueDocument(documentId, ProcessingStage.STAGE_1);

// Monitor processing status
ProcessingStatus status = processor.getProcessingStatus(documentId);
```

### Error Recovery
- **Retry Logic**: Automatic retry for transient failures
- **Dead Letter Queues**: Failed message handling and analysis
- **Manual Intervention**: Tools for manual processing of failed documents
- **Audit Trail**: Complete tracking of all processing attempts

## Configuration

### Application Configuration
```java
// Core application settings
public class ChatBotConfig {
    public static final String DEFAULT_MODEL = "gpt-4o";
    public static final int MAX_CONCURRENT_PROCESSES = 4;
    public static final int QUEUE_TIMEOUT_SECONDS = 300;
    public static final boolean ENABLE_DEBUG_LOGGING = false;
}
```

### Environment Variables
```bash
# Azure OpenAI Configuration
AZURE_OPENAI_KEY=your_azure_openai_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

# Database Configuration
DB_URL=jdbc:postgresql://localhost:5432/titleix_db
DB_USERNAME=username
DB_PASSWORD=password

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=password

# Processing Configuration
MAX_PROCESSING_THREADS=4
ENABLE_STAGE_PROCESSING=true
AUDIT_TRAIL_ENABLED=true
```

### AI Model Configuration
```java
// Model selection per document type
Map<DocumentType, ModelConfig> modelConfigs = Map.of(
    DocumentType.EMAIL, ModelConfig.builder()
        .modelName("gpt-4o")
        .temperature(0.1)
        .maxTokens(4000)
        .build(),
    DocumentType.POLICY, ModelConfig.builder()
        .modelName("gpt-4o")
        .temperature(0.0)
        .maxTokens(8000)
        .build()
);
```

## Testing

### Unit Tests
- **Assistant Testing**: Individual AI assistant functionality
- **Tool Testing**: Custom tool validation and behavior
- **Pipeline Testing**: Multi-stage processing workflow validation
- **Integration Testing**: End-to-end system integration tests

### AI Testing
```java
@Test
void testKeyPointExtraction() {
    AddKeyPointsTool keyPointsTool = new AddKeyPointsTool();
    
    String testDocument = "Sample document content for testing...";
    List<KeyPoint> keyPoints = keyPointsTool.extractKeyPoints(testDocument, "compliance");
    
    assertThat(keyPoints).isNotEmpty();
    assertThat(keyPoints.get(0).getCategory()).isNotNull();
    assertThat(keyPoints.get(0).getImportance()).isGreaterThan(0);
}
```

### Performance Testing
```java
@PerformanceTest
void testBatchProcessingPerformance() {
    BatchProcessor processor = new BatchProcessor();
    List<Document> testDocuments = generateTestDocuments(100);
    
    long startTime = System.currentTimeMillis();
    BatchResult result = processor.processDocuments(testDocuments);
    long duration = System.currentTimeMillis() - startTime;
    
    assertThat(result.getSuccessCount()).isEqualTo(100);
    assertThat(duration).isLessThan(300000); // 5 minutes
}
```

## Deployment

### Deployment Scripts
Located in `src/script/`:
- **`deploy-azure-openai-security.sh`**: Azure OpenAI resource deployment
- **Azure Resource Setup**: Automated cloud resource provisioning
- **Security Configuration**: Identity and access management setup
- **Environment Preparation**: Database and Redis setup scripts

### Docker Deployment
```dockerfile
# Multi-stage Docker build
FROM openjdk:21-jdk as builder
COPY . /app
WORKDIR /app
RUN mvn clean package -DskipTests

FROM openjdk:21-jre
COPY --from=builder /app/scb-chatbot/target/scb-chatbot-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Production Configuration
```bash
# JVM tuning for production
JAVA_OPTS="-Xmx8g -Xms4g -XX:+UseG1GC -XX:MaxGCPauseMillis=200"

# Application configuration
SPRING_PROFILES_ACTIVE=production
LOGGING_LEVEL_ROOT=INFO
ENABLE_PERFORMANCE_MONITORING=true
```

## Monitoring and Observability

### Application Metrics
- **Processing Throughput**: Documents processed per hour
- **Analysis Accuracy**: Quality metrics for AI analysis results
- **Queue Performance**: Queue depth and processing latency
- **Error Rates**: Failure rates by processing stage and document type

### AI Metrics
- **Token Usage**: OpenAI API token consumption and costs
- **Model Performance**: Response time and quality metrics
- **Tool Usage**: Custom tool invocation frequency and success rates
- **Prompt Effectiveness**: Analysis of prompt performance and optimization

### Logging
```java
// Structured logging for AI operations
logger.info("Starting document analysis",
    kv("documentId", documentId),
    kv("stage", processingStage),
    kv("modelName", modelName),
    kv("userId", userId));

// Performance logging
try (var timer = Timer.start("document.analysis.stage1")) {
    AnalysisResult result = performAnalysis(document);
    logger.info("Analysis completed",
        kv("documentId", documentId),
        kv("duration", timer.getDuration()),
        kv("keyPointsFound", result.getKeyPoints().size()));
}
```

## Advanced Features

### Custom Assistant Development
```java
// Creating specialized analysis assistants
public class CustomComplianceAssistant extends ToolAwareAssistant {
    
    @Override
    protected List<Tool> getSpecializedTools() {
        return List.of(
            new PolicyLookupTool(),
            new ComplianceValidationTool(),
            new ReportGenerationTool()
        );
    }
    
    @Override
    protected String getSystemPrompt() {
        return "You are a specialized Title IX compliance assistant...";
    }
}
```

### Workflow Customization
- **Custom Processing Stages**: Define new analysis phases
- **Conditional Processing**: Dynamic workflow based on document content
- **Integration Points**: Hooks for external system integration
- **Custom Tools**: Develop specialized tools for specific use cases

### Batch Operations
- **Mass Document Processing**: Handle large document collections
- **Scheduled Processing**: Automated batch processing on schedule
- **Progress Reporting**: Real-time progress updates for large batches
- **Resource Management**: Intelligent resource allocation for batch jobs

## Troubleshooting

### Common Issues
- **AI Model Timeouts**: Configure appropriate timeout values
- **Queue Overflow**: Monitor and scale Redis queue capacity
- **Memory Issues**: Optimize JVM settings for large document processing
- **API Rate Limits**: Implement proper rate limiting and retry logic

### Debug Mode
```bash
# Enable detailed debugging
mvn exec:java -pl scb-chatbot \
  -Dlogback.configurationFile=logback-debug.xml \
  -Ddebug.ai.enabled=true \
  -Ddebug.tools.enabled=true
```

### Performance Tuning
- **Concurrent Processing**: Optimize thread pool sizes
- **Memory Management**: Tune garbage collection settings
- **Database Connections**: Configure connection pool sizes
- **AI Model Caching**: Cache model responses for similar queries

## Contributing

When extending the chatbot module:
1. **Follow AI Best Practices**: Implement proper prompt engineering and tool design
2. **Maintain Audit Trails**: Ensure all processing is fully tracked
3. **Test AI Functionality**: Validate AI assistant behavior with comprehensive tests
4. **Performance Testing**: Ensure new features maintain system performance
5. **Documentation**: Update user guides and API documentation

## Security Considerations

### API Key Management
- **Environment Variables**: Store sensitive credentials securely
- **Azure Key Vault**: Use cloud-based secret management
- **Rotation Policies**: Implement regular key rotation
- **Access Logging**: Log all API access and usage

### Data Protection
- **Encryption in Transit**: HTTPS for all external communications
- **Encryption at Rest**: Database and file system encryption
- **Access Controls**: Role-based access to processing functions
- **Audit Logging**: Complete audit trail of all operations