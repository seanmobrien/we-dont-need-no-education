# @repo/lib-site-util-env

Environment variable configuration and validation package for the Title IX Victim Advocacy Platform.

## Overview

This package provides type-safe access to environment variables with Zod schema validation for both client and server-side code. It handles runtime detection, provides utilities for environment variable processing, and supports per-package environment variable schemas.

## Features

- **Type-safe environment variables**: Full TypeScript support with Zod validation
- **Runtime detection**: Automatically detects client, server, edge, and Node.js runtimes
- **Client/Server separation**: Separate configurations for client-side (NEXT_PUBLIC_*) and server-side variables
- **Zod processors**: Reusable utilities for common environment variable types (URLs, booleans, integers, etc.)
- **Per-package schema support**: Foundation for packages to define their own environment schemas

## Installation

This package is part of the monorepo workspace and is installed automatically via:

```bash
cd web-ui
yarn install
```

## Usage

### Basic Usage

```typescript
import { env } from '@repo/lib-site-util-env';

// Get all environment variables
const allEnv = env();

// Get a specific variable (type-safe)
const hostname = env('NEXT_PUBLIC_HOSTNAME');
const apiKey = env('AZURE_API_KEY'); // Only available on server
```

### Runtime Detection

```typescript
import { isRunningOnServer, isRunningOnClient, isRunningOnEdge, runtime } from '@repo/lib-site-util-env';

if (isRunningOnServer()) {
  // Server-side code
  console.log('Running on server');
}

if (isRunningOnClient()) {
  // Client-side code  
  console.log('Running in browser');
}

// Get current runtime
console.log(runtime()); // 'nodejs' | 'edge' | 'client' | 'static' | 'server'
```

### Using Zod Processors

```typescript
import { ZodProcessors } from '@repo/lib-site-util-env/_common';
import { z } from 'zod';

// Create your schema using the processors
const mySchema = z.object({
  API_URL: ZodProcessors.url(),
  TIMEOUT: ZodProcessors.integer(),
  ENABLED: ZodProcessors.truthy(false), // default false
  LOG_LEVEL: ZodProcessors.logLevel('info'),
});
```

## Package Structure

```
lib-site-util-env/
├── src/
│   ├── index.ts          # Main exports
│   ├── _common.ts        # Shared utilities and Zod processors
│   ├── _client.ts        # Client-side environment schema
│   └── _server.ts        # Server-side environment schema
├── dist/                 # Built JavaScript files (CJS & ESM)
├── package.json
├── tsconfig.json
└── README.md
```

## Environment Variables

### Client-Side Variables (NEXT_PUBLIC_*)

- `NEXT_PUBLIC_HOSTNAME`: Application hostname URL
- `NEXT_PUBLIC_LOG_LEVEL_CLIENT`: Client-side logging level
- `NEXT_PUBLIC_DEFAULT_AI_MODEL`: Default AI model to use
- `NEXT_PUBLIC_FLAGSMITH_API_URL`: Flagsmith API endpoint
- `NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT_ID`: Flagsmith environment ID
- `NEXT_PUBLIC_MUI_LICENSE`: MUI X Pro license key
- `NEXT_PUBLIC_DATAGRID_CLIENT_CACHE_TIMEOUT`: Data grid cache timeout
- `NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING`: Azure Monitor connection string

### Server-Side Variables

- **Authentication**: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_KEYCLOAK_*`
- **Database**: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`
- **Azure OpenAI**: `AZURE_OPENAI_ENDPOINT`, `AZURE_API_KEY`, `AZURE_OPENAI_DEPLOYMENT_*`
- **Azure AI Search**: `AZURE_AISEARCH_ENDPOINT`, `AZURE_AISEARCH_KEY`, `AZURE_AISEARCH_*_INDEX_NAME`
- **Redis**: `REDIS_URL`, `REDIS_PASSWORD`
- **Google AI**: `GOOGLE_GENERATIVE_AI_API_KEY`, `GOOGLE_GENERATIVE_*`
- **Mem0**: `MEM0_API_HOST`, `MEM0_API_KEY`, `MEM0_*`
- **Storage**: `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_ACCOUNT_*`
- **Feature Flags**: `FLAGSMITH_SDK_KEY`

See `src/_client.ts` and `src/_server.ts` for complete variable definitions and documentation.

## Development

### Building

```bash
yarn build
```

### Development Mode

```bash
yarn dev  # Watch mode
```

### Testing

```bash
yarn test
```

### Linting

```bash
yarn lint
```

## Architecture Notes

### Dependencies

This package depends on types from the `compliance-theater` (app) package for AI model types. These are imported as external dependencies and resolved at runtime through TypeScript path mapping. This approach avoids circular dependencies while allowing the env package to validate AI-related environment variables.

### Per-Package Schema Support

The package is designed to support per-package environment variable schemas. Future enhancements will allow packages to:

1. Define their own `env.schema.ts` file
2. Register schemas at package initialization
3. Validate only the environment variables they need
4. Support both client and server environments

## Migration Notes

This package was extracted from `web-ui/packages/app/lib/site-util/env` as part of the monorepo refactoring. All imports should use:

```typescript
// New
import { env } from '@repo/lib-site-util-env';

// Old (deprecated)
import { env } from '@/lib/site-util/env';
```

## License

Private - Part of the Title IX Victim Advocacy Platform
