# @compliance-theater/database

Comprehensive database layer providing Drizzle ORM, PostgreSQL driver, and schema management for the Title IX Victim Advocacy Platform.

## Overview

This package consolidates all database-related functionality into a single, well-organized module:

- **Driver Layer** (`/driver`): Low-level PostgreSQL connection via `postgres` npm package
- **ORM Layer** (`/orm`): Drizzle ORM wrapper with type-safe query builders  
- **Schema** (`/schema`): Table definitions, relations, and migrations

## Architecture

```
@compliance-theater/database
├── driver/          # PostgreSQL driver (postgres-js)
│   ├── connection   # PgDbDriver singleton
│   ├── postgres     # PostgreSQL client configuration
│   └── types        # Database configuration types
├── orm/             # Drizzle ORM layer
│   ├── connection   # Drizzle DB singleton
│   ├── schema       # Unified schema object
│   ├── drizzle-types # Type exports
│   ├── drizzle-error # Error handling
│   └── db-helpers   # Query utilities
└── schema/          # Database schema
    ├── schema       # Table definitions
    ├── relations    # Table relationships
    └── custom-relations # Custom relations
```

## Usage

### Basic Database Access

```typescript
import { db } from '@compliance-theater/database';

// Type-safe queries
const users = await db.select().from(schema.users);

// With relations
const userWithPosts = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    posts: true,
  },
});
```

### Using the Driver Directly

```typescript
import { PgDbDriver } from '@compliance-theater/database/driver';

const driver = PgDbDriver.getInstance();
const sql = driver.getClient();

// Raw SQL queries
const result = await sql`SELECT * FROM users WHERE id = ${userId}`;
```

### Schema Access

```typescript
import { schema } from '@compliance-theater/database/schema';
import { eq } from 'drizzle-orm';

// Access table definitions
const { users, emails, documentUnits } = schema;

// Type-safe queries
await db.insert(users).values({
  id: newUserId,
  email: 'user@example.com',
});
```

### Error Handling

```typescript
import { DrizzleError, isDrizzleError } from '@compliance-theater/database/orm';

try {
  await db.insert(users).values({ ... });
} catch (error) {
  if (isDrizzleError(error)) {
    if (error.code === '23505') {
      // Handle unique constraint violation
      console.error('Duplicate entry:', error.constraint);
    }
  }
}
```

### Helper Utilities

```typescript
import { 
  getDocumentRelationReason,
  getOrCreateDocumentUnit,
} from '@compliance-theater/database/orm';

// Get or create a document relationship reason
const reasonId = await getDocumentRelationReason({
  db,
  reason: 'Duplicate',
  add: true,
});

// Get or create a document unit
const unit = await getOrCreateDocumentUnit({
  db,
  subject: 'Email Subject',
  sourceId: 'source-123',
});
```

## Types

The package exports comprehensive TypeScript types:

```typescript
import type {
  DatabaseType,
  SchemaType,
  EmailType,
  DocumentUnitType,
  CallToActionType,
  // ... many more
} from '@compliance-theater/database';

// Use in your code
function processEmail(email: EmailType) {
  // Fully typed
}
```

## Configuration

Database connection is configured via environment variables (managed by `@compliance-theater/env`):

- `DATABASE_URL`: PostgreSQL connection string
- Database connection pooling and timeout settings

## Schema Migrations

Migration files are located in `/src/schema/migrations/` (originally from `/drizzle/*.sql`).

To generate new migrations:

```bash
# From the app package
yarn drizzle-generate
```

## Dependencies

- `@compliance-theater/logger` - Error logging
- `@compliance-theater/env` - Environment configuration
- `@compliance-theater/typescript` - Type utilities
- `drizzle-orm` - ORM framework
- `postgres` - PostgreSQL client

## Development

```bash
# Build the package
yarn build

# Run tests
yarn test

# Type checking
tsc --noEmit
```

## Notes

- The ORM layer uses a singleton pattern to ensure a single database connection
- All database operations are type-safe through Drizzle ORM
- Error handling includes SQLSTATE code mapping for PostgreSQL errors
- The driver supports both pooled and direct connections

## License

Part of the Title IX Victim Advocacy Platform
