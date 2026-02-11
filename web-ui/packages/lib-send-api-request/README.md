# @compliance-theater/send-api-request

API request utilities for the Title IX Victim Advocacy Platform.

## Overview

This package provides a consistent interface for making HTTP API requests with features like:
- Cookie forwarding for server-side requests
- Automatic error handling with structured logging
- Cancellable promises using AbortController
- Type-safe request/response handling
- Helper factories for area-specific API clients

## Installation

This is a workspace package and should be referenced using the workspace protocol:

```json
{
  "dependencies": {
    "@compliance-theater/send-api-request": "workspace:*"
  }
}
```

## Usage

### Basic API Request

```typescript
import { sendApiRequest } from '@compliance-theater/send-api-request';

const result = await sendApiRequest<ResponseType>({
  url: '/api/endpoint',
  area: 'email',
  action: 'list',
  method: 'GET'
});
```

### HTTP Method Helpers

```typescript
import { 
  sendApiGetRequest,
  sendApiPostRequest,
  sendApiPutRequest,
  sendApiDeleteRequest 
} from '@compliance-theater/send-api-request';

// GET request
const data = await sendApiGetRequest<User>({
  url: '/api/users/123',
  area: 'users',
  action: 'get'
});

// POST request
const created = await sendApiPostRequest<User>({
  url: '/api/users',
  area: 'users',
  action: 'create',
  input: { name: 'John Doe', email: 'john@example.com' }
});
```

### API Request Helper Factory

For consistent API access within a specific area, use the factory:

```typescript
import { apiRequestHelperFactory } from '@compliance-theater/send-api-request';

const emailApi = apiRequestHelperFactory({ area: 'email' });

// GET
const emails = await emailApi.get<Email[]>({
  url: '/api/emails',
  action: 'list'
});

// POST
const newEmail = await emailApi.post<Email>({
  url: '/api/emails',
  action: 'create',
  input: emailData
});

// PUT
const updated = await emailApi.put<Email>({
  url: '/api/emails/123',
  action: 'update',
  input: updates
});

// DELETE
await emailApi.delete({
  url: '/api/emails/123',
  action: 'delete'
});
```

### Server-Side Cookie Forwarding

When making requests from server-side code (like API routes), you can forward cookies:

```typescript
import { sendApiGetRequest } from '@compliance-theater/send-api-request';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const data = await sendApiGetRequest({
    url: '/api/protected/resource',
    area: 'protected',
    action: 'get',
    req, // Forward the request to include cookies
    forwardCredentials: true // Default is true
  });
  
  return Response.json(data);
}
```

### Error Handling

```typescript
import { 
  sendApiGetRequest, 
  ApiRequestError 
} from '@compliance-theater/send-api-request';

try {
  const data = await sendApiGetRequest({
    url: '/api/resource',
    area: 'resource',
    action: 'get'
  });
} catch (error) {
  if (ApiRequestError.isApiRequestError(error)) {
    console.error('API Error:', error.message);
    console.error('Response:', error.response.status);
  }
}
```

### Cancellable Requests

All request functions return a cancellable promise:

```typescript
import { sendApiGetRequest } from '@compliance-theater/send-api-request';

const promise = sendApiGetRequest({
  url: '/api/long-running',
  area: 'data',
  action: 'process'
});

// Cancel if needed
promise.cancel();

try {
  const result = await promise;
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request was cancelled');
  }
}
```

## API

### Types

- `ApiRequestParams` - Parameters for making an API request
- `ReadApiRequestParams` - Parameters for GET/DELETE requests (no input)
- `WriteApiRequestParams` - Parameters for POST/PUT requests (requires input)
- `ApiRequestHelper` - Interface for area-specific API helpers
- `ApiRequestFunction` - Type for custom API request functions
- `AdditionalRequestParams` - Optional parameters for dependency injection

### Functions

- `sendApiRequest<T>(params)` - Main function for API requests
- `sendApiGetRequest<T>(params)` - Convenience wrapper for GET requests
- `sendApiPostRequest<T>(params)` - Convenience wrapper for POST requests
- `sendApiPutRequest<T>(params)` - Convenience wrapper for PUT requests
- `sendApiDeleteRequest<T>(params)` - Convenience wrapper for DELETE requests
- `apiRequestHelperFactory({ area })` - Factory for creating area-specific helpers

### Classes

- `ApiRequestError` - Error class for API request failures
  - `static isApiRequestError(error)` - Type guard
  - `response` - The HTTP Response object

## Dependencies

- `@compliance-theater/logger` - For structured logging
- `@compliance-theater/typescript` - For AbortablePromise and ICancellablePromiseExt
- `next` (peer) - For Next.js request/response types

## Development

### Build

```bash
yarn build
```

### Test

```bash
yarn test
```

### Lint

```bash
yarn lint
```

### Clean

```bash
yarn clean:build
```

## Notes

- This package includes minimal Next.js utilities (getHeaderValue, guards, types) copied from the app's nextjs-util to avoid circular dependencies until nextjs-util is extracted as a separate package.
- All requests use the native `fetch` API
- Requests automatically include `Content-Type: application/json` header
- Cookie forwarding only occurs on server-side when `req` parameter is provided
- All API calls are logged with verbose level for debugging

## License

Private - Internal use only for the Title IX Victim Advocacy Platform
