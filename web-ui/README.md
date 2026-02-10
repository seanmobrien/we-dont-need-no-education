# Web UI - Node.js Monorepo

Welcome to the Web UI workspace for the Title IX Victim Advocacy Platform. This is a self-contained Node.js monorepo that houses the frontend application and its supporting packages.

## Quick Start

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Run tests
yarn test

# Build for production
yarn build

# Lint code
yarn lint
```

The development server will start at `http://localhost:3000` (default).

## What's Here

This workspace contains the Next.js web application that provides an AI-powered interface for evidence management and analysis. The application helps victims, families, and advocates organize email evidence, analyze documents, and build cases against educational institutions that mishandle Title IX violations.

### Current Structure

```
web-ui/
├── packages/
│   └── app/              # Main Next.js application
├── package.json          # Workspace configuration
├── turbo.json           # Build orchestration
├── jest.config.mjs      # Test configuration
└── yarn.lock            # Dependency lock file
```

### Main Application

The primary application lives in [`packages/app/`](./packages/app/). See the [Application README](./packages/app/README.md) for detailed information about:

- Architecture and technology stack
- Email management and AI analysis features
- Development guidelines and testing
- API endpoints and component usage
- Configuration and deployment

## Future Packages

As part of the ongoing monorepo refactoring, the following packages will be extracted from the main application:

### Core Library Packages (Planned)
- **`lib-logger`** - Logging utilities and structured logging
- **`lib-typescript`** - TypeScript utilities and type helpers
- **`lib-send-api-request`** - API request utilities with retry logic
- **`lib-database`** - Database access layer (Drizzle ORM, schema, connections)
- **`lib-redis-client`** - Redis caching and session management
- **`lib-site-util`** - Site-wide utilities and helpers
- **`lib-react-util`** - React utilities, hooks, and components
- **`lib-nextjs-util`** - Next.js utilities and server-side helpers
- **`lib-auth`** - Authentication and authorization utilities
- **`lib-error-monitoring`** - Error tracking and monitoring

### Feature Packages (Planned)
- **`instrument`** - Instrumentation and observability (OpenTelemetry)
- **`components`** - Shared UI component library
- **`data-models`** - TypeScript data models and type definitions
- **`test-utils`** - Shared test utilities, mocks, and fixtures

See [MONOREPO_GUIDE.md](../MONOREPO_GUIDE.md) for the complete refactoring plan.

## Workspace Commands

This workspace uses [Turborepo](https://turbo.build/) for efficient task orchestration:

- `yarn dev` - Start all packages in development mode
- `yarn build` - Build all packages
- `yarn test` - Run tests across all packages
- `yarn test:unit` - Run unit tests only
- `yarn test:e2e` - Run end-to-end tests
- `yarn lint` - Lint all packages

## Package Management

This is a Yarn workspace. To work with individual packages:

```bash
# Run commands in a specific package
yarn workspace @repo/app dev
yarn workspace @repo/app test

# Add a dependency to a package
yarn workspace @repo/app add package-name

# Add a dev dependency
yarn workspace @repo/app add -D package-name
```

## Technology Stack

- **Build System**: Turborepo for monorepo orchestration
- **Package Manager**: Yarn 1.22.x (workspaces)
- **Node.js**: v24.x (required)
- **TypeScript**: 5.x
- **Testing**: Jest + React Testing Library + Playwright
- **Framework**: Next.js 15.x (see [app README](./packages/app/README.md))

## Development Guidelines

- Each package should be independently buildable and testable
- Packages reference each other using workspace protocol: `"@repo/package-name": "workspace:*"`
- Shared configuration (tsconfig, jest, etc.) lives at the workspace root
- Package-specific configuration extends from root configuration

## Links

- **Main Application**: [packages/app/README.md](./packages/app/README.md)
- **Monorepo Migration Guide**: [../MONOREPO_GUIDE.md](../MONOREPO_GUIDE.md)
- **Root README**: [../README.md](../README.md)

## Contributing

For contribution guidelines and coding standards, see the [Application README](./packages/app/README.md) which contains:
- TypeScript and React coding guidelines
- Testing practices
- Component development patterns
- API integration standards

---

For the Java backend (evidence analysis, AI processing), see the [`chat/`](../chat/) directory.
