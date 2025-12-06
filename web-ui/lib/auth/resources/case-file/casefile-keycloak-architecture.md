# Keycloak Authorization for Case Files in a Next.js Application

This document describes how to implement per–case-file authorization in a Next.js application using **Keycloak Authorization Services**, **keycloak-connect** on the backend, and **keycloak-js** on the frontend.

## 1. High-Level Architecture

### 1.1 Components

1. **Keycloak Server**

   - Manages realms, users, clients, and **Authorization Services**.
   - Exposes:
     - OIDC endpoints for authentication.
     - **Protection API** for resource and permission management.
     - **Entitlement / Token endpoint** for authorization decisions.

2. **Next.js Application**

   - **Frontend** uses **keycloak-js** for login, logout, and token handling.
   - **Backend/API routes** use **keycloak-connect** for granting validation and custom fetch wrappers for Authorization Services.

3. **Database**
   - A "case file" is a `users` record equivalent to a auth.js `users` record - eg the "Case File" owned by user id 1234 is case id 1234.
   - Each `document_units` record is linked to a `users` record via the `user_id` field - eg if document_units record "fffffffff-ffff-ffff-ffff-ffffffffffff" is has `user_id` of "1234", then it is linked to case id "1234".
   - `users` record is linked to `accounts` record via the `user_id` field in the `accounts` table
     - The accounts record with a `provider` of "keycloak" is the Keycloak user record.
     - The `provider_id` of the `accounts` record is the Keycloak user ID.

## 2. Authorization Model

### 2.1 Client as Resource Server

- Confidential client with Authorization Services enabled.
- Policy Enforcement Mode: `ENFORCING`.

### 2.2 Scopes

- `case-file:read`
- `case-file:write`
- `case-file:admin`

### 2.3 Resources (One Per Case File)

Resources should be created dynamically for each case file - if a case file resource is
not found, it should be created on the fly.

Example resource representation:

```json
{
  "name": "case-file:{caseId}",
  "type": "case-file",
  "owner": "{ownerUserId}",
  "scopes": ["case-file:read", "case-file:write", "case-file:admin"],
  "attributes": {
    "caseFileId": ["{caseId}"],
    "readers": ["{ownerUserId}"],
    "writers": ["{ownerUserId}"],
    "admins": ["{ownerUserId}"]
  }
}
```

### 2.4 Policies & Permissions

- A **JavaScript policy** evaluates:

  - Owner → full rights.
  - Otherwise → ACL attributes (`readers`, `writers`, `admins`).

- A **scope-based permission** applies the JS policy to all case-file resources.

## 3. Frontend (Next.js + Auth.js)

- Use existing auth.js session and token to authenticate requests to backend API routes.

## 4. Backend (Next.js API Routes + Keycloak Connect)

- Use `GrantManager` to validate access tokens.
- Use custom wrappers around the **Protection API**:
  - Create resources.
  - Update ACL attributes.
  - Request authorization decisions (UMA/entitlement).
  - Use `openid-client` for OIDC discovery and token exchange.

## 5. Sharing Workflow

### 5.1 Owner wants to share a case file

1. Validate owner has `case-file:admin` on the case file.
2. Fetch resource from Protection API.
3. Update arrays:
   - `readers`, `writers`, `admins`.
4. PUT updated resource.

### 5.2 Unsharing is the reverse

## 6. Authorization Check

Backend checks permissions by requesting an RPT or entitlement token from Keycloak including:

```
permission: "{resourceId}#{scope}"
```

Then inspects the resulting token’s `authorization.permissions`.

## 7. Summary

- **Granularity:** one resource per case file.
- **ACL management:** stored in Keycloak resource attributes.
- **Backend:** mixes token validation via `keycloak-connect` and Authorization Services via custom fetches.
- **Frontend:** simply authenticates and sends tokens.

This decouples authorization entirely from application logic and centralizes it in Keycloak.
