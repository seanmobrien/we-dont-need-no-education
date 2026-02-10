# Email API Drizzle Migration

This document describes the migration of the email API from direct neondb queries to the new Drizzle ORM-based data access layer.

## Overview

The email API endpoints (`/api/email`) have been upgraded to use a modern layered architecture:

- **Route Handlers** (`app/api/email/route.ts`) - Handle HTTP requests and validation
- **Service Layer** (`lib/api/email/email-service.ts`) - Business logic and data orchestration
- **Repository Layer** (`lib/api/email/email-drizzle-repository.ts`) - Data access using Drizzle ORM

## Architecture

### EmailDrizzleRepository

The `EmailDrizzleRepository` extends `BaseDrizzleRepository` and provides:

- **Type-safe database operations** using Drizzle ORM
- **Domain model mapping** between database records and application objects
- **Validation** for create and update operations
- **Custom query methods** like `findByGlobalMessageId`

```typescript
// Example usage
const repository = new EmailDrizzleRepository();
const email = await repository.get('email-uuid');
const emails = await repository.list({ page: 1, num: 10 });
```

### EmailService  

The `EmailService` provides business logic layer that:

- **Orchestrates complex operations** like fetching related contacts and recipients
- **Converts between domain models and API responses**
- **Handles recipient management** and document unit creation
- **Maintains transaction integrity** across multiple database operations

```typescript
// Example usage
const service = new EmailService();
const emails = await service.getEmailsSummary({ page: 1, num: 10 });
const newEmail = await service.createEmail({
  senderId: 123,
  subject: "Test Email",
  body: "Hello World",
  recipients: [{ recipientId: 456 }]
});
```

### Route Handlers

The route handlers have been simplified to:

- **Validate request data** and handle HTTP concerns
- **Delegate business logic** to the EmailService
- **Return consistent API responses** while maintaining backward compatibility
- **Handle errors gracefully** with proper HTTP status codes

## Domain Models

### EmailDomain

Core domain model used by the repository:

```typescript
type EmailDomain = {
  emailId: string;
  senderId: number;
  subject: string;
  emailContents: string;
  sentTimestamp: Date | string;
  threadId?: number | null;
  parentId?: string | null;
  importedFromId?: string | null;
  globalMessageId?: string | null;
};
```

### EmailDomainSummary

Summary version for list operations (excludes `emailContents`):

```typescript
type EmailDomainSummary = Omit<EmailDomain, 'emailContents'> & {
  count_attachments?: number;
  count_kpi?: number;
  count_notes?: number;
  count_cta?: number;
  count_responsive_actions?: number;
};
```

## API Compatibility

The migration maintains full backward compatibility:

- **Same HTTP endpoints** (`GET`, `POST`, `PUT`, `DELETE /api/email`)
- **Same request/response format** as the original implementation
- **Same validation rules** and error handling
- **Same pagination behavior** and query parameters

## Testing

Comprehensive test coverage includes:

- **EmailDrizzleRepository**: 17 unit tests covering all CRUD operations, validation, and mapping
- **EmailService**: 17 unit tests covering business logic, error handling, and data orchestration  
- **Route Handlers**: 15 integration tests covering HTTP endpoints and request/response handling

Total: **49 tests** specifically for the new Drizzle implementation.

## Benefits

1. **Type Safety**: Drizzle ORM provides compile-time type checking for database operations
2. **Better Separation of Concerns**: Clear layers between HTTP, business logic, and data access
3. **Reusability**: Repository and service classes can be reused by other parts of the application
4. **Maintainability**: Easier to test, debug, and extend individual components
5. **Performance**: Drizzle generates optimized SQL queries
6. **Consistency**: Follows established patterns used by other parts of the application

## Migration Path

The migration was done incrementally:

1. ✅ Create EmailDrizzleRepository with comprehensive tests
2. ✅ Create EmailService with business logic abstraction
3. ✅ Update route handlers to use service layer
4. ✅ Update existing tests to work with new architecture
5. ✅ Verify backward compatibility and functionality

## Future Enhancements

With the new architecture in place, future enhancements become easier:

- **Caching**: Add caching at the service layer
- **Validation**: Enhance validation with schema libraries like Zod
- **Query Optimization**: Use Drizzle's advanced query features
- **Event Sourcing**: Add event emission for email operations
- **Multi-tenancy**: Add tenant-aware filtering at the repository level