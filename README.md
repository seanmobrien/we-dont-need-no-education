<!-- @format -->

# Title IX Victim Advocacy Platform

A comprehensive AI-powered platform to empower victims, families, and advocates in fighting back against educational institutions that mishandle Title IX cases through automated document analysis, email processing, and intelligent evidence gathering.

## Overview

This platform combines a modern web interface with sophisticated AI-powered backend services to help victims, parents, and families who face schools that abuse their position of power. When educational institutions suppress or improperly process instances of abuse, harassment, or other illegal activity, this system levels the playing field by providing advanced document analysis capabilities that would typically require expensive legal teams.

## Key Features

- **AI-Powered Evidence Analysis**: Leverages Azure OpenAI and LangChain4j to help victims identify critical evidence and Title IX violations in school communications
- **Email Evidence Management**: Web-based interface for victims and families to organize, analyze, and build cases from email communications
- **Multi-Stage Case Building**: Documents undergo systematic analysis to build comprehensive evidence packages for advocacy and legal action
- **Vector Search Capabilities**: Semantic document retrieval to find similar patterns of institutional misconduct across cases
- **Action Item Detection**: Automatically identifies school failures to respond appropriately to reports and required actions
- **Queue-Based Processing**: Redis-powered asynchronous processing to handle large volumes of evidence efficiently
- **Real-time Case Dashboard**: Material UI-based interface for victims and advocates to monitor evidence analysis and case strength

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

- PostgreSQL database with comprehensive schema for evidence storage, analysis tracking, and case management

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

### Local Development Authentication Bypass

⚠️ **CRITICAL SECURITY WARNING** ⚠️

For local development convenience, this application supports bypassing authentication. This feature is **EXTREMELY DANGEROUS** and must be used with caution:

#### Setup

1. Set the `LOCAL_DEV_AUTH_BYPASS_USER_ID` environment variable to any user ID (e.g., "1", "123")
2. The application will automatically authenticate all requests as this user
3. JWT tokens are automatically minted for the bypass user

#### Security Safeguards

- **Localhost Only**: The bypass only works when running on localhost, 127.0.0.1, or local network addresses
- **Automatic Validation**: The application validates the hostname and throws a scary error if not running locally
- **No Production Use**: The bypass is completely disabled in production environments

#### Example `.env.local` (for local development only)

```bash
# DANGER: Only use in local development!
LOCAL_DEV_AUTH_BYPASS_USER_ID=123
```

#### ⚠️ NEVER DO THESE THINGS ⚠️

- **NEVER** commit this variable set to any value in `.env` files
- **NEVER** deploy with this variable set in production
- **NEVER** set this variable on any non-localhost environment

The application will detect and prevent misuse with aggressive error messages designed to protect against accidental production deployment.

For more security information, see [SECURITY.md](./SECURITY.md).

## Project Structure

```
├── web-ui/           # Next.js frontend application for victims and advocates
├── chat/             # Java backend with AI processing for evidence analysis
│   ├── core/         # Core utilities and shared functionality
│   ├── scb-core/     # Victim advocacy core models and repositories
│   ├── scb-embed/    # Document embedding and evidence search
│   └── scb-chatbot/  # Main AI assistant for case building
├── db/               # Database schema and migrations
└── docs/             # Additional documentation
```

## Module Documentation

- [Chat Backend README](./chat/README.md) - Comprehensive guide to the Java backend for evidence analysis
- [Web UI README](./web-ui/README.md) - Frontend application documentation for victim advocacy interface
- [Core Module](./chat/core/README.md) - Shared utilities and common functionality
- [SCB Core](./chat/scb-core/README.md) - Core models and data access layer for case management
- [SCB Embed](./chat/scb-embed/README.md) - Document embedding and evidence search functionality
- [SCB Chatbot](./chat/scb-chatbot/README.md) - AI assistant for case building and evidence analysis

## Development Workflow

1. **Evidence Collection**: Import emails and documents through the web interface to build your case
2. **Automated Analysis**: Backend processes evidence through multi-stage AI analysis to identify key violations
3. **Case Building**: Use the dashboard to review analyzed content and build a comprehensive advocacy strategy
4. **Reporting**: Generate insights and evidence summaries to support legal action or advocacy efforts

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

See [LICENSE](./LICENSE.md) for licensing information.

![License: EJL-1.0](https://img.shields.io/badge/license-EJL--1.0-blueviolet)
