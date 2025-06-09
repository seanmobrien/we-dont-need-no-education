# Title IX Compliance Platform

A comprehensive AI-powered platform for educational institutions to manage Title IX compliance through automated document analysis, email processing, and intelligent workflow management.

## Overview

This platform combines a modern web interface with sophisticated AI-powered backend services to help educational institutions efficiently process, analyze, and manage documents and communications for Title IX compliance. The system automatically identifies relevant content, extracts actionable items, and provides intelligent insights through natural language processing.

## Key Features

- **AI-Powered Document Analysis**: Leverages Azure OpenAI and LangChain4j for intelligent document processing and Title IX relevance assessment
- **Email Management System**: Web-based interface for importing, viewing, and analyzing email communications
- **Multi-Stage Processing Pipeline**: Documents undergo systematic analysis through multiple phases for comprehensive evaluation
- **Vector Search Capabilities**: Semantic document retrieval using advanced embedding models
- **Call-to-Action Detection**: Automatically identifies and tracks actionable items within documents
- **Queue-Based Processing**: Redis-powered asynchronous processing for scalable document analysis
- **Real-time Dashboard**: Material UI-based interface for monitoring and managing compliance workflows

## Architecture

### Frontend (`/web-ui/`)
- **Framework**: Next.js 15.x with TypeScript
- **UI Library**: Material UI with data grid components
- **Authentication**: NextAuth.js integration
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: TailwindCSS with custom component system

### Backend (`/chat/`)
- **Language**: Java 21 with Maven multi-module architecture
- **AI Integration**: LangChain4j with Azure OpenAI
- **Queue Management**: Redis with Redisson
- **Database**: PostgreSQL with HikariCP connection pooling
- **Document Processing**: Apache PDFBox for PDF parsing
- **Embeddings**: Custom vector embedding pipeline

### Database (`/db/`)
- PostgreSQL database with comprehensive schema for document storage, analysis tracking, and compliance management

## Quick Start

### Prerequisites
- Node.js 22.x
- Java 21
- Maven 3.8+
- PostgreSQL 14+
- Redis 6+
- Azure OpenAI access

### Frontend Setup
```bash
cd web-ui
npm install
npm run dev
```

### Backend Setup
```bash
cd chat
mvn clean install
mvn exec:java -pl scb-chatbot
```

### Environment Configuration
Create appropriate `.env` files with:
- Database connection strings
- Azure OpenAI API keys and endpoints
- Redis connection details
- Authentication secrets

## Project Structure

```
├── web-ui/           # Next.js frontend application
├── chat/             # Java backend with AI processing
│   ├── core/         # Core utilities and shared functionality
│   ├── scb-core/     # School chatbot core models and repositories
│   ├── scb-embed/    # Document embedding and vector search
│   └── scb-chatbot/  # Main AI chatbot application
├── db/               # Database schema and migrations
└── docs/             # Additional documentation
```

## Module Documentation

- [Chat Backend README](./chat/README.md) - Comprehensive guide to the Java backend
- [Web UI README](./web-ui/README.md) - Frontend application documentation
- [Core Module](./chat/core/README.md) - Shared utilities and common functionality
- [SCB Core](./chat/scb-core/README.md) - Core models and data access layer
- [SCB Embed](./chat/scb-embed/README.md) - Document embedding and search functionality
- [SCB Chatbot](./chat/scb-chatbot/README.md) - AI assistant and processing pipeline

## Development Workflow

1. **Document Ingestion**: Import emails and documents through the web interface
2. **Automated Analysis**: Backend processes documents through multi-stage AI analysis
3. **Review and Action**: Use the dashboard to review analyzed content and track compliance
4. **Reporting**: Generate insights and reports based on processed data

## Technology Stack

### Core Technologies
- **Frontend**: Next.js, TypeScript, Material UI, TailwindCSS
- **Backend**: Java 21, Maven, LangChain4j, Spring components
- **Database**: PostgreSQL, Drizzle ORM, HikariCP
- **AI/ML**: Azure OpenAI, custom embedding models
- **Infrastructure**: Redis, Docker support

### Key Dependencies
- `@ai-sdk/azure` - Azure AI integration
- `langchain4j` - Java AI framework
- `@mui/x-data-grid-pro` - Advanced data grid components
- `drizzle-orm` - Type-safe database ORM
- `redisson` - Redis Java client

## Contributing

Please see [SECURITY.md](./SECURITY.md) for security guidelines and contribution policies.

## License

See [LICENSE](./LICENSE) for licensing information.
