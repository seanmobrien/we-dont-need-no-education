# Case File Authorization with Keycloak

This module implements per-user (case file) authorization for the Title IX Victim Advocacy Platform using Keycloak Authorization Services.

## Overview

Each case file is represented by a `user_id` in the `users` table, and all `document_units` records are linked to a case file via the `user_id` column. Keycloak resources are dynamically created for each case file, enabling fine-grained access control based on ACL attributes.

## Architecture

### 1.1 Responsibilities

| Layer | Responsibility |
|-----|----------------|
| Auth.js | Login, logout, session lifecycle, token storage |
| Keycloak | Identity, UMA authorization, resource & policy evaluation |
| Next.js API routes | Authorization enforcement + business logic |
| Database | Case files + mapping to Keycloak resource IDs |

**Key principle**:  
> Authentication is handled once (Auth.js). Authorization is evaluated per request (Keycloak).

### Database Schema

- **users table**: Represents case files (one user = one case file)
- **document_units table**: Links documents to case files via `user_id` foreign key
- **accounts table**: Links local users to Keycloak accounts (provider = 'keycloak')

### Keycloak Resources

Each case file has a corresponding Keycloak resource:

```json
{
  "name": "case-file:{userId}",
  "type": "case-file",
  "owner": "{keycloakUserId}",
  "scopes": [
    "case-file:read",
    "case-file:write",
    "case-file:admin"
  ],
  "attributes": {
    "caseFileId": ["{userId}"],
    "readers": ["{keycloakUserId}"],
    "writers": ["{keycloakUserId}"],
    "admins": ["{keycloakUserId}"]
  }
}
```

### Authorization Scopes

- **case-file:read**: View case file documents, emails, and properties
- **case-file:write**: Modify case file documents and emails
- **case-file:admin**: Full administrative access (add/remove users, manage sharing)

## 2. Core Authorization Model

### 2.1 Domain Model

- **Case File**
  - Logical container for emails, attachments, notes, analysis results
  - Authorization boundary
- **Case File Document**
  - Always inherits permissions from its parent case file

### 2.2 Keycloak Representation

- **One Keycloak Resource per Case File**
- **Resource Type**: `case-file`
- **Scopes**:
  - `case-file:read`
  - `case-file:write`
  - `case-file:admin`

### 2.3 Ownership & Sharing Rules

- Owner always has **read + write + admin**
- Owner may grant:
  - read
  - write
  - admin
- Sharing state is stored as **resource attributes**:
  - `readers`
  - `writers`
  - `admins`

---

## 3. Keycloak Configuration

### 3.1 Clients

#### 3.1.1 Auth.js Login Client

- Client ID: `casefile-web`
- Type: Confidential
- Flow: Authorization Code + PKCE
- Used **only** by Auth.js

#### 3.1.2 Resource Server Client

- Client ID: `casefile-api`
- Type: Confidential
- Authorization Enabled: ✅
- Service Account Enabled: ✅
- Used for:
  - UMA permission checks
  - Protection API calls

---

```typescript
import { env } from '@/lib/site-util/env';

const authIssues = env('AUTH_KEYCLOAK_ISSUER');
const authClientId = env('AUTH_KEYCLOAK_CLIENT_ID');
const authClientSecret = env('AUTH_KEYCLOAK_CLIENT_SECRET');
const authResourceServiceClient = env('AUTH_KEYCLOAK_CLIENT_ID');
const authRsourceClientSecret = env('AUTH_KEYCLOAK_CLIENT_SECRET');
const redirectUri = env('AUTH_KEYCLOAK_REDIRECT_URI') || '';
const impersonatorUsername = env('AUTH_KEYCLOAK_IMPERSONATOR_USERNAME') || undefined;
const impersonatorPassword = env('AUTH_KEYCLOAK_IMPERSONATOR_PASSWORD') || undefined,
const impersonatorOfflineToken: = env('AUTH_KEYCLOAK_IMPERSONATOR_OFFLINE_TOKEN') || undefined,
```
> For authorization requests, you’ll also need the client’s service-account credentials to obtain a PAT and to call the Protection API.

@/lib/auth/keycloak-provider.ts - existing auth.js Keycloak provider setup

```typescript
export const setupKeyCloakProvider = (): Provider[] => {
  const providerArgs = {
    clientId: env('AUTH_KEYCLOAK_CLIENT_ID'),
    clientSecret: env('AUTH_KEYCLOAK_CLIENT_SECRET'),
    issuer: env('AUTH_KEYCLOAK_ISSUER'),
    authorization: {
      params: {
        access_type: 'offline',
        prompt: 'consent',
        response_type: 'code',
        scope: env('AUTH_KEYCLOAK_SCOPE'),
      },
    },
    allowDangerousEmailAccountLinking: true,
  };
  const keycloak = KeyCloak<KeycloakProfile>(providerArgs);
  return [keycloak];
};
```
> Key point: Auth.js becomes our 'adapter'.  The server gets identity and tokens from auth()

### Protecting API Endpoints

#### Email Endpoints

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { checkEmailAuthorization, CaseFileScope } from '@/lib/auth/resources/case-file';

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) => {
  const { emailId } = await params;
  
  // Check authorization
  const authCheck = await checkEmailAuthorization(req, emailId, {
    requiredScope: CaseFileScope.READ,
  });

  if (!authCheck.authorized) {
    return authCheck.response; // Returns 401/403/404 as appropriate
  }

  // Proceed with authorized request
  const email = await fetchEmail(emailId);
  return NextResponse.json(email);
};
```

#### Document Unit Endpoints

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { checkDocumentUnitAuthorization, CaseFileScope } from '@/lib/auth/resources/case-file';

export const PUT = async (
  req: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) => {
  const { unitId } = await params;
  
  // Check authorization (write scope for modifications)
  const authCheck = await checkDocumentUnitAuthorization(
    req,
    Number(unitId),
    {
      requiredScope: CaseFileScope.WRITE,
    },
  );

  if (!authCheck.authorized) {
    return authCheck.response;
  }

  // Proceed with update
  const updated = await updateDocumentUnit(Number(unitId), await req.json());
  return NextResponse.json(updated);
};
```



## 8. Protection API (Service Account)

### 8.1 Obtain PAT

```ts
async function getProtectionApiToken(): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.KEYCLOAK_RS_CLIENT_ID!,
    client_secret: process.env.KEYCLOAK_RS_CLIENT_SECRET!,
    scope: "uma_protection",
  });

  const res = await fetch(
    `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
    { method: "POST", body }
  );

  const json = await res.json();
  return json.access_token;
}
```

---

## 9. Case‑File Resource Creation

```ts
export async function createCaseFileResource(params: {
  caseFileId: string;
  ownerUserId: string;
}): Promise<string> {
  const pat = await getProtectionApiToken();

  const res = await fetch(
    `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/authz/protection/resource_set`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `case-file:${params.caseFileId}`,
        type: "case-file",
        owner: params.ownerUserId,
        scopes: [
          "case-file:read",
          "case-file:write",
          "case-file:admin"
        ],
        attributes: {
          readers: [params.ownerUserId],
          writers: [params.ownerUserId],
          admins: [params.ownerUserId],
        },
      }),
    }
  );

  const json = await res.json();
  return json._id;
}
```
## 10. Authorization Enforcement (UMA)

```ts
export async function checkCaseFilePermission(params: {
  userAccessToken: string;
  resourceId: string;
  scope: "case-file:read" | "case-file:write" | "case-file:admin";
}): Promise<boolean> {
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:uma-ticket",
    audience: process.env.KEYCLOAK_RS_CLIENT_ID!,
    permission: `${params.resourceId}#${params.scope}`,
  });

  const res = await fetch(
    `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.userAccessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  if (!res.ok) return false;

  const rpt = await res.json();
  return Array.isArray(rpt.authorization?.permissions);
}
```

---

## 11. Example API Route

```ts
// app/api/cases/[caseId]/route.ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authHelpers";
import { checkCaseFilePermission } from "@/lib/authorization";

export async function GET(_: Request, { params }: { params: { caseId: string } }) {
  const { sub, accessToken } = await requireUser();
  const resourceId = await getCaseFileResourceId(params.caseId);

  const allowed = await checkCaseFilePermission({
    userAccessToken: accessToken,
    resourceId,
    scope: "case-file:read",
  });

  if (!allowed) return new NextResponse("Forbidden", { status: 403 });

  return NextResponse.json(await loadCaseFileFromDb(params.caseId));
}
```

---

## 12. Sharing / ACL Updates

- Owner must have `case-file:admin`
- Update `readers`, `writers`, `admins` attributes via Protection API
- No policy changes required

### Creating Case File Resources

Resources are typically created automatically when a user signs in. To manually ensure a resource exists:

```typescript
import { ensureCaseFileResource, getKeycloakUserIdFromUserId } from '@/lib/auth/resources/case-file';

// Get the Keycloak user ID for the local user
const keycloakUserId = await getKeycloakUserIdFromUserId(userId);

if (keycloakUserId) {
  // Ensure the resource exists (creates if missing)
  const resource = await ensureCaseFileResource(userId, keycloakUserId);
  console.log('Resource ready:', resource.name);
}
```

### Checking Access Programmatically

```typescript
import { checkCaseFileAccess, CaseFileScope } from '@/lib/auth/resources/case-file';
import { extractToken } from '@/lib/auth/utilities';

const token = await extractToken(request);
if (token?.access_token) {
  const hasReadAccess = await checkCaseFileAccess(
    userId,
    CaseFileScope.READ,
    token.access_token,
  );
  
  if (hasReadAccess) {
    // User can read this case file
  }
}
```

## API Response Examples

### Successful Access (200 OK)

```json
{
  "emailId": "550e8400-e29b-41d4-a716-446655440000",
  "subject": "RE: Title IX Complaint",
  "body": "...",
  "sender": { ... }
}
```

### Unauthorized - No Token (401)

```json
{
  "error": "Unauthorized - No access token"
}
```

### Forbidden - Insufficient Permissions (403)

```json
{
  "error": "Forbidden - Insufficient permissions for this case file",
  "required": "case-file:read"
}
```

### Not Found - Invalid Case File (404)

```json
{
  "error": "Case file not found for this email"
}
```

## Migration Notes

### Database Migration

The `user_id` column was added to `document_units` in migration `0005_supreme_inertia.sql`:

```sql
ALTER TABLE "document_units" ADD COLUMN "user_id" integer NOT NULL DEFAULT 3;
ALTER TABLE "document_units" ALTER COLUMN "user_id" DROP DEFAULT;
ALTER TABLE "document_units" ADD CONSTRAINT "document_units_user_id_fkey" 
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
CREATE INDEX "idx_document_units_user_id" ON "document_units" USING btree ("user_id" int4_ops);
```

**Important**: Existing records default to `user_id = 3` during migration only. The default is then removed, so new records must explicitly specify a `user_id`.

### Keycloak Configuration

1. **Enable Authorization Services** on your Keycloak client
2. **Set Policy Enforcement Mode** to ENFORCING
3. **Create Scopes**: `case-file:read`, `case-file:write`, `case-file:admin`
4. **Create JavaScript Policy** to evaluate ACL attributes (readers, writers, admins)
5. **Create Scope-Based Permission** linking the policy to case-file resources

### JavaScript Policy Example

```javascript
var context = $evaluation.getContext();
var identity = context.getIdentity();
var resource = $evaluation.getPermission().getResource();
var userId = identity.getId();

// Owner has full access
if (resource.getOwner() === userId) {
    $evaluation.grant();
    return;
}

// Check ACL attributes
var attributes = resource.getAttributes();
var requestedScopes = $evaluation.getPermission().getScopes();

for (var i = 0; i < requestedScopes.size(); i++) {
    var scope = requestedScopes.get(i).getName();
    
    if (scope === 'case-file:read' && attributes.get('readers').contains(userId)) {
        $evaluation.grant();
        return;
    }
    if (scope === 'case-file:write' && attributes.get('writers').contains(userId)) {
        $evaluation.grant();
        return;
    }
    if (scope === 'case-file:admin' && attributes.get('admins').contains(userId)) {
        $evaluation.grant();
        return;
    }
}

$evaluation.deny();
```

## Testing

### Manual Testing

1. **Create a test user** in Keycloak
2. **Sign in** to create the case file resource
3. **Test authorized access**:
   ```bash
   curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/email/<emailId>
   ```
4. **Test unauthorized access** with a different user's token
5. **Verify 403 response** for insufficient permissions

### Automated Testing

See test files in `__tests__/lib/auth/resources/case-file/` for comprehensive test coverage.

## Troubleshooting

### "No access token found in request"

- Ensure the request includes a valid session cookie or Bearer token
- Check that `extractToken()` is working correctly
- Verify `AUTH_SECRET` is configured

### "Failed to get PAT"

- Verify Keycloak client credentials are correct
- Check that `AUTH_KEYCLOAK_CLIENT_ID` and `AUTH_KEYCLOAK_CLIENT_SECRET` are set
- Ensure the client has `service-accounts-enabled` in Keycloak

### "Case file not found for this email"

- Verify the email has an associated document_unit with a valid `user_id`
- Check database migration was applied successfully
- Ensure `user_id` is not null in document_units

## Future Enhancements

1. **Sharing Management API**: Create endpoints to manage ACL attributes (add/remove readers, writers, admins)
2. **List Filtering**: Implement filtering for list/search endpoints based on accessible case files
3. **Audit Logging**: Track authorization decisions for compliance purposes
4. **Caching**: Cache authorization decisions to reduce Keycloak API calls

## References

- [Keycloak Authorization Services](https://www.keycloak.org/docs/latest/authorization_services/)
- [Architecture Documentation](./casefile-keycloak-architecture.md)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
