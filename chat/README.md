# Chat Backend - Title IX Compliance AI System

The chat backend is a sophisticated Java-based system that provides AI-powered document analysis and processing capabilities for Title IX compliance management. Built using Maven multi-module architecture, it leverages modern AI frameworks and cloud services to deliver intelligent document processing at scale.

## Architecture Overview

This backend consists of four main modules working together to provide comprehensive document analysis and AI-powered assistance:

```
chat/
├── core/           # Shared utilities and common functionality
├── scb-core/       # Data models, repositories, and core business logic
├── scb-embed/      # Document embedding and vector search capabilities  
├── scb-chatbot/    # AI assistants and main application entry point
└── pom.xml         # Parent Maven configuration
```

## Key Features

### AI-Powered Analysis
- **Azure OpenAI Integration**: Leverages GPT-4 models for intelligent document analysis
- **LangChain4j Framework**: Provides robust AI application development capabilities
- **Multi-Stage Processing**: Documents undergo systematic analysis through configurable phases
- **Tool-Aware Assistants**: AI agents equipped with specialized tools for document processing

### Document Processing Pipeline
- **Phase 1**: Initial document categorization and key point extraction
- **Phase 2**: Title IX relevance assessment and call-to-action identification
- **Phase 3**: Reconciliation and final processing
- **Audit Trail**: Comprehensive tracking of all processing stages

### Vector Search & Embeddings
- **Semantic Search**: Advanced document retrieval using vector embeddings
- **Policy Lookup**: Quick access to relevant policies and procedures
- **Document Similarity**: Find related documents based on content similarity
- **Custom Embedding Models**: Optimized for educational and legal content

### Queue Management
- **Redis-Based Queues**: Asynchronous processing with Redis and Redisson
- **Scalable Processing**: Distributed task processing across multiple workers
- **Error Handling**: Robust error recovery and retry mechanisms
- **Progress Tracking**: Real-time status updates for long-running operations

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
Contains the core business logic and data access layer:
- Domain models for documents, analysis stages, and audit trails
- Repository pattern implementation for data access
- Business service layer for core operations
- Database schema management

### [SCB Embed](./scb-embed/README.md)
Handles document embedding and vector search capabilities:
- Document text extraction and preprocessing
- Vector embedding generation using various models
- Similarity search and retrieval algorithms
- Integration with vector databases

### [SCB Chatbot](./scb-chatbot/README.md)
Main application entry point with AI assistants:
- Interactive chatbot interface
- AI-powered document analysis assistants
- Processing queue coordination
- Tool integration and orchestration

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
DB_URL=jdbc:postgresql://localhost:5432/titleix_db
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

# Run the main chatbot application
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

### Document Processing Flow
1. **Ingestion**: Documents are imported through the web interface
2. **Queue Processing**: Background workers pick up analysis tasks
3. **AI Analysis**: Documents processed through multiple AI-powered stages
4. **Results Storage**: Analysis results stored with full audit trail
5. **Review Interface**: Results available through web dashboard

### Adding New Analysis Stages
1. Create new assistant class extending `ToolAwareAssistant`
2. Implement required tools and prompts
3. Register with queue processing system
4. Add corresponding database models and repositories

### Custom Tool Development
1. Extend `MessageTool` base class
2. Implement tool-specific logic and annotations
3. Register tool with appropriate assistants
4. Add unit tests for tool functionality

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