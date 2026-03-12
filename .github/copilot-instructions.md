# Copilot Instructions for Title IX Victim Advocacy Platform

This repository contains a comprehensive AI-powered advocacy platform designed to help victims, families, and advocates fight back against educational institutions that mishandle Title IX cases. The platform combines sophisticated document analysis, email processing, and evidence gathering capabilities to level the playing field for victims.

## Code Standards

### Required Before Each Commit

- **web-ui**: Run `yarn lint` in `/web-ui/` directory before committing any TypeScript/React changes
- **chat**: Ensure Java code follows Maven compilation standards with `mvn compile`
- All code should maintain existing formatting and style patterns

### Test Mock Reset Rules

- Do not use `jest.clearAllMocks()` or `jest.resetAllMocks()` as a blanket reset strategy.
- Prefer targeted resets such as `mockFn.mockClear()` / `mockFn.mockReset()` for only the mocks used by the suite.
- Reuse preconfigured global mocks from Jest setup files instead of globally clearing all mock state.

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

- `web-ui/`: Monorepo containing Next.js 15 frontend with TypeScript, Material UI, and AI chat interface
  - `packages/`
    - `app`: Next.js front-end web application
    - `lib-typescript`: Shared TypeScript utility library
    - `lib-logger`: Logging utility library
- `chat/`: Java 21 backend with Maven multi-module architecture, LangChain4j integration
- `db/`: PostgreSQL database schema and migration files
- `.github/copilot-instructions.md`: Comprehensive development guidelines (this file)

## Monorepo Structure
- All code is organized in a monorepo with clear package boundaries:
- See [MONOREPO_GUIDE.md](../MONOREPO_GUIDE.md) for detailed structure and conventions.

## Key Technologies

- **Frontend**: See [instructions/web-ui/copilot-instructions.md](instructions/web-ui/copilot-instructions.md) for general patterns and [instructions/web-ui/typescript-react.instructions.md](./instructions/web-ui/typescript-react.instructions.md) for React-specific guidelines
- **Backend**: See [instructions/java.md](instructions/java.md)