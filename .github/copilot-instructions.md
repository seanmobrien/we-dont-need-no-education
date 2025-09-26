# Copilot Instructions for Title IX Victim Advocacy Platform

This repository contains a comprehensive AI-powered advocacy platform designed to help victims, families, and advocates fight back against educational institutions that mishandle Title IX cases. The platform combines sophisticated document analysis, email processing, and evidence gathering capabilities to level the playing field for victims.

## Code Standards

### Required Before Each Commit

- **Frontend**: Run `yarn lint` in `/web-ui/` directory before committing any TypeScript/React changes
- **Backend**: Ensure Java code follows Maven compilation standards with `mvn compile`
- All code should maintain existing formatting and style patterns

### Development Flow

**Frontend (Next.js/TypeScript)**:
- Build: `cd web-ui && yarn build`
- Development: `cd web-ui && yarn dev`
- Test: `cd web-ui && yarn test`
- Lint: `cd web-ui && yarn lint`

**Backend (Java/Maven)**:
- Build: `cd chat && mvn compile`
- Package: `cd chat && mvn package`
- Test: `cd chat && mvn test`
- Clean build: `cd chat && mvn clean compile`

## Repository Structure

- `web-ui/`: Next.js 15 frontend with TypeScript, Material UI, and AI chat interface
- `chat/`: Java 21 backend with Maven multi-module architecture, LangChain4j integration
- `db/`: PostgreSQL database schema and migration files
- `copilot-instructions.md`: Comprehensive development guidelines (reference for detailed patterns)

## Key Technologies

- **Frontend**: Next.js 15, TypeScript 5, React 19, Material UI 7, TailwindCSS, Drizzle ORM
- **Backend**: Java 21, Maven, LangChain4j, Azure OpenAI, PostgreSQL, Redis
- **AI/ML**: Azure OpenAI GPT-4, Google Gemini, vector embeddings, semantic search
- **Infrastructure**: Docker, GitHub Actions

## Development Guidelines

1. **Multi-AI Provider Architecture**: Use the established model factory pattern for Azure OpenAI and Google Gemini failover
2. **Evidence-Centric Design**: All features should support the platform's core mission of victim advocacy and evidence analysis
3. **Type Safety**: Maintain strict TypeScript interfaces for all data structures
4. **Repository Pattern**: Follow established repository patterns for database operations
5. **Security First**: Handle sensitive Title IX evidence data with appropriate security measures
6. **Testing**: Write unit tests for new functionality, especially AI integration and data processing
7. **Documentation**: Update relevant README files when adding new features or changing architecture

## Victim Advocacy Context

This platform serves a sensitive and critical purpose. When working on features:
- Prioritize user privacy and data security
- Ensure AI analysis maintains objectivity and accuracy
- Consider the legal and emotional context of Title IX cases
- Test thoroughly to avoid compromising evidence integrity
- Follow established patterns for handling sensitive educational institution data

## AI Integration Patterns

- Use structured prompts with clear sections for evidence analysis
- Implement proper error handling for AI model failures and rate limits
- Leverage the multi-provider model factory for Azure/Google failover
- Maintain vector embeddings for semantic document search
- Follow established patterns in the comprehensive `copilot-instructions.md` for detailed AI implementation guidance