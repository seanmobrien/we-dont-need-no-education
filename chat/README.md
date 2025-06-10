# Chat Backend - Title IX Victim Advocacy AI System

The chat backend is a sophisticated Java-based system that provides AI-powered document analysis and evidence processing capabilities to help victims, families, and advocates fight back against educational institutions that mishandle Title IX cases. Built using Maven multi-module architecture, it leverages modern AI frameworks and cloud services to deliver intelligent evidence analysis that levels the playing field against institutions with vast legal resources.

## Architecture Overview

This backend consists of four main modules working together to provide comprehensive evidence analysis and AI-powered advocacy assistance:

```
chat/
├── core/           # Shared utilities and common functionality
├── scb-core/       # Data models, repositories, and core advocacy logic
├── scb-embed/      # Document embedding and evidence search capabilities  
├── scb-chatbot/    # AI assistants for case building and main application entry point
└── pom.xml         # Parent Maven configuration
```

## Key Features

### AI-Powered Analysis
- **Azure OpenAI Integration**: Leverages GPT-4 models to help victims identify institutional failures and Title IX violations
- **LangChain4j Framework**: Provides robust AI application development capabilities for evidence analysis
- **Multi-Stage Processing**: Evidence undergoes systematic analysis to build comprehensive cases against bad actors
- **Tool-Aware Assistants**: AI agents equipped with specialized tools for building advocacy cases

### Evidence Processing Pipeline
- **Phase 1**: Initial evidence categorization and key violation extraction
- **Phase 2**: Title IX compliance failure assessment and institutional response analysis
- **Phase 3**: Case reconciliation and final evidence package preparation
- **Audit Trail**: Comprehensive tracking of all evidence analysis stages for legal documentation

### Vector Search & Embeddings
- **Semantic Search**: Advanced evidence retrieval using vector embeddings to find patterns of institutional misconduct
- **Policy Lookup**: Quick access to relevant policies and legal precedents to identify violations
- **Document Similarity**: Find related cases of institutional abuse and failure across evidence collections
- **Custom Embedding Models**: Optimized for educational misconduct and legal advocacy content

### Queue Management
- **Redis-Based Queues**: Asynchronous processing with Redis and Redisson for large-scale evidence analysis
- **Scalable Processing**: Distributed task processing to handle complex advocacy cases efficiently
- **Error Handling**: Robust error recovery and retry mechanisms for critical evidence processing
- **Progress Tracking**: Real-time status updates for long-running case analysis operations

## Technology Stack

### Core Technologies
- **Java 21**: Latest LTS version with modern language features
- **Maven**: Multi-module project management and dependency resolution
- **LangChain4j 1.0.0**: AI application framework for Java
- **Azure OpenAI**: Cloud-based AI model access
- **PostgreSQL**: Primary database for data persistence
- **Redis**: Caching and queue management

### Key Dependencies
- **AI & ML**: `langchain4j-azure-open-ai`, `langchain4j-embeddings`
- **Database**: `postgresql`, `hikaricp` (connection pooling)
- **Queue Management**: `redisson` (Redis client)
- **Document Processing**: `pdfbox` (PDF parsing)
- **Logging**: `logback`, `slf4j`
- **Testing**: `junit-jupiter`, `assertj`, `mockito`

## Module Breakdown

### [Core Module](./core/README.md)
Provides foundational utilities and shared functionality used across all modules:
- Database connection management
- Configuration and environment handling
- Logging and monitoring utilities
- Common exception handling

### [SCB Core](./scb-core/README.md)
Contains the core advocacy logic and data access layer:
- Domain models for evidence, analysis stages, and case audit trails
- Repository pattern implementation for victim case data access
- Business service layer for advocacy operations
- Database schema management for evidence tracking

### [SCB Embed](./scb-embed/README.md)
Handles evidence embedding and vector search capabilities:
- Evidence text extraction and preprocessing for analysis
- Vector embedding generation using advocacy-optimized models
- Similarity search and pattern recognition algorithms for misconduct detection
- Integration with vector databases for case building

### [SCB Chatbot](./scb-chatbot/README.md)
Main application entry point with AI assistants for victim advocacy:
- Interactive advocacy assistance interface
- AI-powered evidence analysis assistants to identify institutional failures
- Processing queue coordination for large evidence volumes
- Tool integration and case orchestration

## Getting Started

### Prerequisites
- Java 21 or higher
- Maven 3.8+
- PostgreSQL 14+
- Redis 6+
- Azure OpenAI access

### Environment Setup
Create a `.env` file in the chat directory with:
```bash
# Database Configuration
DB_URL=jdbc:postgresql://localhost:5432/victim_advocacy_db
DB_USERNAME=your_username
DB_PASSWORD=your_password

# Azure OpenAI Configuration
AZURE_OPENAI_KEY=your_azure_openai_key
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

# Redis Configuration
REDIS_URL=redis://localhost:6379
```

### Build and Run
```bash
# Build all modules
mvn clean install

# Run the main advocacy AI application
mvn exec:java -pl scb-chatbot -Dexec.mainClass="com.obapps.schoolchatbot.chat.SchoolChatBot"

# Run tests
mvn test

# Run tests for specific module
mvn test -pl scb-core
```

### Database Setup
1. Create PostgreSQL database and user
2. Run database migration scripts from `/db/` directory
3. Verify connection with the application

## Development Workflow

### Evidence Processing Flow
1. **Evidence Collection**: Documents and communications are imported through the web interface by victims and advocates
2. **Queue Processing**: Background workers pick up evidence analysis tasks to identify institutional failures
3. **AI Analysis**: Evidence processed through multiple AI-powered stages to build comprehensive advocacy cases
4. **Results Storage**: Analysis results stored with full audit trail for legal documentation
5. **Advocacy Interface**: Results available through web dashboard for case building and legal preparation

### Adding New Analysis Stages
1. Create new assistant class extending `ToolAwareAssistant` for specific advocacy needs
2. Implement required tools and prompts for institutional failure detection
3. Register with queue processing system for evidence analysis
4. Add corresponding database models and repositories for case tracking

### Custom Tool Development
1. Extend `MessageTool` base class for advocacy-specific functionality
2. Implement tool-specific logic and annotations for evidence analysis
3. Register tool with appropriate advocacy assistants
4. Add unit tests for tool functionality and case building accuracy

## Testing

### Unit Tests
- Comprehensive test coverage using JUnit 5
- Mock-based testing with Mockito
- AssertJ for fluent assertions
- Database testing with test containers

### Integration Tests
- End-to-end processing pipeline tests
- AI assistant integration tests
- Database integration tests
- Queue processing tests

### Running Tests
```bash
# All tests
mvn test

# Specific module
mvn test -pl scb-core

# Integration tests only
mvn test -Dtest="*IT"

# With coverage report
mvn test jacoco:report
```

## Configuration

### Application Properties
Key configuration options include:
- AI model selection and parameters
- Database connection pooling settings
- Queue processing concurrency limits
- Logging levels and output formats

### Security Configuration
- Database credentials management
- API key protection
- Service-to-service authentication
- Audit logging requirements

## Monitoring and Observability

### Logging
- Structured logging with Logback
- Configurable log levels per package
- Request/response tracing for AI operations
- Performance metrics and timing

### Metrics
- Processing queue depths and throughput
- AI model response times and costs
- Database query performance
- Error rates and types

## Deployment

### Production Considerations
- JVM tuning for AI workloads
- Database connection pool sizing
- Redis cluster configuration
- Monitoring and alerting setup

### Docker Support
```bash
# Build Docker images
docker build -t titleix-chat .

# Run with environment variables
docker run -e DB_URL=... -e AZURE_OPENAI_KEY=... titleix-chat
```

## Troubleshooting

### Common Issues
- **AI Rate Limits**: Configure appropriate retry mechanisms
- **Database Connections**: Monitor connection pool usage
- **Queue Processing**: Check Redis connectivity and memory
- **PDF Processing**: Verify PDFBox dependencies for complex documents

### Debug Mode
Enable debug logging for detailed operation tracing:
```bash
mvn exec:java -pl scb-chatbot -Dlogback.configurationFile=logback-debug.xml
```

## Contributing

1. Follow existing code style and patterns
2. Add comprehensive unit tests for new functionality
3. Update documentation for API changes
4. Ensure proper error handling and logging

## Performance Tuning

### JVM Options
```bash
-Xmx4g -Xms2g
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200
-XX:+UseStringDeduplication
```

### Database Optimization
- Connection pool tuning based on workload
- Query optimization for large document sets
- Index management for search performance

### AI Model Optimization
- Batch processing for multiple documents
- Caching of frequently used embeddings
- Token usage optimization for cost control