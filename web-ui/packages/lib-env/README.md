# @compliance-theater/env

Environment variable utilities with Zod validation for the Title IX Victim Advocacy Platform.

## Features

- Type-safe environment variable access
- Client/server environment separation
- Zod schema validation
- Runtime environment detection
- Support for per-package environment schemas

## Usage

### Basic Usage

```typescript
import { env, isRunningOnServer, isRunningOnClient } from '@compliance-theater/env';

// Get all environment variables (type-safe)
const envVars = env();

// Get a specific environment variable
const dbUrl = env('DATABASE_URL'); // Server-only

// Check runtime environment
if (isRunningOnServer()) {
  console.log('Running on server');
}
```

### Client vs Server

The package automatically detects whether code is running on the client or server and provides the appropriate environment variables.

- **Client environment**: Only `NEXT_PUBLIC_*` variables
- **Server environment**: All variables including server-only secrets

### Environment Variable Schema

The package uses Zod schemas to validate environment variables at runtime. This ensures that all required variables are present and have the correct types.

## API

### Functions

- `env()` - Get all environment variables
- `env(key)` - Get a specific environment variable
- `getServerEnv()` - Get server environment variables (returns null on client)
- `getClientEnv()` - Get client environment variables
- `isRunningOnServer()` - Check if code is running on server
- `isRunningOnClient()` - Check if code is running on client
- `isRunningOnEdge()` - Check if code is running on Edge runtime
- `isBuilding()` - Check if Next.js is building
- `runtime()` - Get current runtime type

### Types

- `ServerEnvType` - Type for server environment variables
- `ClientEnvType` - Type for client environment variables
- `RuntimeConfig` - Runtime environment type

## Development

```bash
# Build the package
yarn build

# Run tests
yarn test

# Lint
yarn lint
```
