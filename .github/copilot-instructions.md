# Copilot Instructions for Title IX Victim Advocacy Platform

This repository contains a comprehensive AI-powered advocacy platform designed to help victims, families, and advocates fight back against educational institutions that mishandle Title IX cases. The platform combines sophisticated document analysis, email processing, and evidence gathering capabilities to level the playing field for victims.

## Code Standards

### Required Before Each Commit

- **web-ui**: Run `yarn lint` in `/web-ui/` directory before committing any TypeScript/React changes
- **chat**: Ensure Java code follows Maven compilation standards with `mvn compile`
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

- **Frontend**: See [web-ui/instructions/copilot-instructions.md](web-ui/instructions/copilot-instructions.md) for general patterns and [web-ui/instructions/typescript-react.instructions.md](web-ui/instructions/typescript-react.instructions.md) for React-specific guidelines
- **Backend**: See [chat/instructions/copilot-instructions.md](chat/instructions/copilot-instructions.md)