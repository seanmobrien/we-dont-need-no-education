# Keycloak Impersonation Service

This document describes the Keycloak impersonation service that enables authenticated API calls to mem0 and MCP tools using user-specific tokens.

## Overview

The project supports multiple impersonation strategies selectable via environment flags. The default `Impersonation` class implements Keycloak's standard token exchange mechanism to obtain impersonated tokens for authenticated users. This allows downstream services (mem0, MCP tools) to receive proper user context instead of relying on session cookies or global API keys.

## Architecture

```
NextRequest → Session → Impersonation → Keycloak Token Exchange → Bearer Token → MCP/mem0 APIs
```

## Strategy Selection

Selection is controlled by environment flags (highest priority first):

1. `AUTH_KEYCLOAK_IMPERSONATE_THIRDPARTY=true`

- Uses third-party libraries: Keycloak Admin Client + openid-client + got/tough-cookie
- Flow: Admin login (offline token or password) → Admin impersonation → OIDC Authorization Code (prompt=none) → Token exchange

2. `AUTH_KEYCLOAK_IMPERSONATE_RESTAPI=true`

- Uses native fetch + Keycloak Admin REST API + Authorization Code flow

3. `AUTH_KEYCLOAK_IMPERSONATE_IMPLICIT=true`

- Uses Admin impersonation + Implicit flow (SoftwareMill approach)

4. Default: Token Exchange (audience-based)

All strategies implement the same `ImpersonationService` interface and are created via `fromRequest()` in `lib/auth/impersonation-factory.ts`.

## Configuration

### Environment Variables

The following environment variables must be configured for impersonation to work:

```bash
# Required for token exchange
AUTH_KEYCLOAK_ISSUER=https://your-keycloak.example.com/realms/your-realm
AUTH_KEYCLOAK_CLIENT_ID=your-client-id
AUTH_KEYCLOAK_CLIENT_SECRET=your-client-secret

# Optional - specifies audience for impersonated tokens
KEYCLOAK_IMPERSONATION_AUDIENCE=your-target-audience

# Common redirect URI used by implicit/REST/third-party strategies
NEXT_PUBLIC_HOSTNAME=https://your-app.example.com
# The factory will derive: ${NEXT_PUBLIC_HOSTNAME}/api/auth/callback/keycloak

# Enable one of the alternative strategies
# Third-party strategy (highest priority)
AUTH_KEYCLOAK_IMPERSONATE_THIRDPARTY=true
# OR Admin REST API strategy
# AUTH_KEYCLOAK_IMPERSONATE_RESTAPI=true
# OR Admin Implicit strategy
# AUTH_KEYCLOAK_IMPERSONATE_IMPLICIT=true

# Third-party strategy (impersonator credentials – one of the two)
# Prefer an offline token for the impersonator (admin service account/user)
AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN=eyJhbGci...
# Or use username/password (less preferred)
AUTH_KEYCLOAK_IMPERSONATOR_USERNAME=admin
AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD=super-secret
```

### Keycloak Configuration

Ensure your Keycloak client has the following settings:

1. **Token Exchange Enabled**: Enable token exchange in client settings
2. **Service Account Enabled**: Required for client credentials
3. **Impersonation Permissions**: Client must have permissions to impersonate users
4. **Audience Settings**: Configure appropriate audience restrictions if using `KEYCLOAK_IMPERSONATION_AUDIENCE`
5. **Admin Impersonation Permissions**: For REST/Implicit/Third-party flows, the impersonator must have permission to impersonate other users in the realm

## Usage

### Basic Usage

```typescript
import { Impersonation } from '@/lib/auth/impersonation';
import { NextRequest } from 'next/server';

// Create impersonation instance from request
const impersonation = await Impersonation.fromRequest(request);

if (impersonation) {
  // Get impersonated token
  const token = await impersonation.getImpersonatedToken();

  // Use in API calls
  const response = await fetch('https://api.example.com/data', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}
```

### With MCP Tools

```typescript
import { toolProviderSetFactory } from '@/lib/ai/mcp/toolProviderFactory';

// Use the factory to select the active strategy based on flags
import { fromRequest as impersonationFactory } from '@/lib/auth/impersonation-factory';

const impersonation = await impersonationFactory({});

const toolProviders = await toolProviderSetFactory([
  {
    url: 'https://mcp-server.example.com/api',
    allowWrite: true,
    impersonation, // Pass impersonation instance
  },
]);
```

### With mem0 Client

```typescript
import { memoryClientFactory } from '@/lib/ai/mem0';

import { fromRequest as impersonationFactory } from '@/lib/auth/impersonation-factory';

const impersonation = await impersonationFactory({});

const memoryClient = await memoryClientFactory({
  impersonation, // Pass impersonation instance
  projectId: 'my-project',
});
```

## API Reference

### Impersonation Class

#### Static Methods

##### `fromRequest(request: NextRequest): Promise<Impersonation | null>`

Creates an Impersonation instance from a NextRequest.

- **Parameters**:
  - `request`: The NextRequest containing session information
- **Returns**: Promise resolving to Impersonation instance or null if not authenticated
- **Example**:
  ```typescript
  const impersonation = await Impersonation.fromRequest(request);
  ```

#### Instance Methods

##### `getImpersonatedToken(forceRefresh?: boolean): Promise<string>`

Gets an impersonated token for the authenticated user.

- **Parameters**:
  - `forceRefresh` (optional): Whether to force token refresh even if cached token is valid
- **Returns**: Promise resolving to the impersonated Bearer token
- **Throws**: Error if token exchange fails
- **Example**:
  ```typescript
  const token = await impersonation.getImpersonatedToken();
  const freshToken = await impersonation.getImpersonatedToken(true);
  ```

##### `getUserContext(): Readonly<UserContext>`

Gets the user context for this impersonation instance.

- **Returns**: Read-only user context object
- **Example**:
  ```typescript
  const context = impersonation.getUserContext();
  console.log(`User ID: ${context.userId}`);
  ```

##### `clearCache(): void`

Clears any cached tokens, forcing fresh token exchange on next request.

- **Example**:
  ```typescript
  impersonation.clearCache();
  ```

##### `hasCachedToken(): boolean`

Checks if the impersonation instance has a valid cached token.

- **Returns**: True if a valid cached token exists
- **Example**:
  ```typescript
  if (!impersonation.hasCachedToken()) {
    console.log('Will need to fetch new token');
  }
  ```

## Error Handling

The impersonation service implements comprehensive error handling:

### Graceful Degradation

When impersonation fails, the system gracefully falls back to existing authentication methods:

1. **MCP Tools**: Falls back to session cookies
2. **mem0 Client**: Falls back to global API key
3. **Logging**: All failures are logged for debugging

### Common Error Scenarios

1. **No Session**: `fromRequest()` returns `null`
2. **Incomplete Config**: `fromRequest()` returns `null`, logs warning
3. **Token Exchange Failure**: `getImpersonatedToken()` throws error with details
4. **Network Issues**: Errors include network diagnostics

### Error Examples

```typescript
try {
  const token = await impersonation.getImpersonatedToken();
} catch (error) {
  if (error.message.includes('Token exchange failed')) {
    console.log('Keycloak token exchange failed:', error.message);
    // Handle fallback authentication
  }
}
```

## Token Caching

The impersonation service implements intelligent token caching:

- **Cache Duration**: Tokens are cached until 1 minute before expiry
- **Automatic Refresh**: Expired tokens are automatically refreshed
- **Memory Efficient**: Only stores token and expiry time
- **Thread Safe**: Safe to use across multiple concurrent requests

### Cache Management

```typescript
// Check cache status
if (impersonation.hasCachedToken()) {
  console.log('Using cached token');
} else {
  console.log('Will fetch new token');
}

// Force refresh
const freshToken = await impersonation.getImpersonatedToken(true);

// Clear cache manually
impersonation.clearCache();
```

## Security Considerations

### Token Security

- Tokens are never logged or exposed in error messages
- Cached tokens are stored in memory only (not persisted)
- Token exchange uses secure HTTPS connections
- Client secrets are obtained from environment variables

### User Context

- Only non-sensitive user metadata is extracted from sessions
- User IDs are used for impersonation, not sensitive data
- All impersonation attempts are logged for audit purposes

### Network Security

- All Keycloak communication uses HTTPS
- Proper error handling prevents information leakage
- Timeout protection prevents hanging connections

## Monitoring and Debugging

### Logging

The service provides comprehensive logging:

```typescript
// Debug level logs
log((l) => l.debug('Created impersonation instance', { userId }));
log((l) => l.debug('Using cached impersonated token'));
log((l) => l.debug('Performing Keycloak token exchange', { userId }));

// Warning level logs
log((l) => l.warn('Failed to get impersonated token, falling back', error));
log((l) =>
  l.warn('Incomplete Keycloak configuration', { hasIssuer, hasClientId }),
);

// Error level logs (via LoggedError)
LoggedError.isTurtlesAllTheWayDownBaby(error, {
  source: 'Impersonation.getImpersonatedToken',
  severity: 'error',
  data: { userId, hasEmail },
});
```

### Metrics

Track the following metrics for monitoring:

- Token exchange success/failure rates
- Cache hit/miss ratios
- Token refresh frequency
- Fallback authentication usage

### Troubleshooting

Common issues and solutions:

1. **Impersonation always returns null**

   - Check Keycloak environment variables
   - Verify user is authenticated
   - Check session contains user ID

2. **Token exchange fails**

   - Verify Keycloak client configuration
   - Check network connectivity to Keycloak
   - Validate client permissions for token exchange

3. **Tokens expire frequently**
   - Check Keycloak token lifetime settings
   - Monitor cache hit ratios
   - Consider increasing token validity period

## Integration Examples

### Complete Chat API Integration

```typescript
// app/api/ai/chat/route.ts
export const POST = (req: NextRequest) => {
  return wrapRouteRequest(async (req: NextRequest) => {
    const session = await auth();
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Create impersonation instance
    const impersonation = await Impersonation.fromRequest(req);

    // Use with tool providers
    const toolProviders = await toolProviderSetFactory([
      {
        url: '/api/ai/tools/sse',
        allowWrite: true,
        impersonation, // User-specific authentication
      },
    ]);

    // Use with memory client
    const memoryClient = await memoryClientFactory({
      impersonation, // User-specific authentication
    });

    // Rest of chat logic...
  });
};
```

### Custom Service Integration

```typescript
// Custom service using impersonation
class CustomService {
  constructor(private impersonation?: Impersonation) {}

  async makeAuthenticatedCall(data: any) {
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.impersonation) {
      try {
        const token = await this.impersonation.getImpersonatedToken();
        headers['Authorization'] = `Bearer ${token}`;
        headers['X-User-ID'] = this.impersonation.getUserContext().userId;
      } catch (error) {
        console.warn('Failed to get impersonated token, using fallback auth');
        // Implement fallback authentication
      }
    }

    return fetch('/api/external-service', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
  }
}
```

## Best Practices

1. **Always Handle Null Returns**: `fromRequest()` can return null
2. **Implement Fallbacks**: Don't assume impersonation will always work
3. **Cache Wisely**: Let the service handle caching, don't implement your own
4. **Log Appropriately**: Use existing logging patterns for consistency
5. **Test Both Paths**: Test with and without impersonation available
6. **Monitor Performance**: Track token exchange performance and cache efficiency

## Migration Guide

### Existing Code Updates

If you have existing code using session cookies or global API keys:

1. **Add Impersonation Parameter**: Update your functions to accept optional impersonation
2. **Create Impersonation Instance**: Use `fromRequest()` in your API routes
3. **Pass Through**: Pass impersonation to downstream services
4. **Maintain Fallbacks**: Keep existing auth as fallback

### Example Migration

**Before:**

```typescript
const toolProviders = await toolProviderSetFactory([
  {
    url: '/api/tools',
    headers: { Cookie: sessionCookie },
  },
]);
```

**After:**

```typescript
const impersonation = await Impersonation.fromRequest(req);
const toolProviders = await toolProviderSetFactory([
  {
    url: '/api/tools',
    impersonation, // Replaces session cookie approach
  },
]);
```
