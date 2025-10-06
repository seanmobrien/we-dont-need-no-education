# Drizzle OrderBy Builder

This module provides a function for applying dynamic ordering logic to Drizzle ORM query builders, similar to the existing `buildOrderBy` function but specifically designed for Drizzle's `PgSelectBuilder`.

## Overview

The `buildDrizzleOrderBy` function allows you to:

- Parse sort parameters from URL search params, GridSortModel, or NextJS requests
- Apply column mapping for translating frontend field names to database column names
- Handle complex sorting with multiple columns and custom SQL expressions
- Integrate seamlessly with existing Drizzle query builders

## Basic Usage

```typescript
import {
  buildDrizzleOrderBy,
  createColumnGetter,
} from '/lib/components/mui/data-grid/buildDrizzleOrderBy';
import { db } from '/lib/drizzle-db';
import { users } from '/drizzle/schema';

// Define available columns for sorting
const sortableColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  created_at: users.createdAt,
};

const getColumn = createColumnGetter(sortableColumns);

// Build the query with dynamic sorting
const query = db.select().from(users);
const sortedQuery = buildDrizzleOrderBy({
  query,
  source: request.url, // URL, GridSortModel, or NextRequest
  defaultSort: 'name',
  columnMap: {
    display_name: 'name',
    user_email: 'email',
  },
  getColumn,
});

const results = await sortedQuery;
```

## API Reference

### `buildDrizzleOrderBy(props)`

Main function for applying dynamic sorting to Drizzle queries.

#### Parameters

- `query` - The Drizzle select query to apply ordering to
- `source` - The source of sort parameters (URL, GridSortModel, NextRequest, etc.)
- `defaultSort` - Default sort to apply when no sort is specified
- `columnMap` - Optional mapping from frontend field names to database column names
- `getColumn` - Function that returns the actual Drizzle column object for a given column name

#### Returns

The same query builder with `orderBy` applied.

### `createColumnGetter(columns)`

Helper function to create a column getter from a mapping object.

```typescript
const getColumn = createColumnGetter({
  id: users.id,
  name: users.name,
  email: users.email,
  // Custom SQL expression
  full_name: sql\`\${users.firstName} || ' ' || \${users.lastName}\`,
});
```

### `createTableColumnGetter(table, customMappings?)`

Helper function that automatically maps column names using reflection.

```typescript
const getColumn = createTableColumnGetter(users, {
  // Custom mappings for complex cases
  display_name: users.name,
  user_email: users.email,
});
```

## Advanced Examples

### Complex Joins with Sorting

```typescript
const query = db
  .select({
    id: emails.emailId,
    subject: emails.subject,
    senderName: users.name,
    sentDate: emails.sentTimestamp,
  })
  .from(emails)
  .leftJoin(users, eq(emails.senderId, users.id));

const getColumn = (columnName: string) => {
  switch (columnName) {
    case 'id': return emails.emailId;
    case 'subject': return emails.subject;
    case 'sender_name': return users.name;
    case 'sent_date': return emails.sentTimestamp;
    case 'full_sender_info':
      return sql\`\${users.name} || ' <' || \${users.email} || '>'\`;
    default: return undefined;
  }
};

const sortedQuery = buildDrizzleOrderBy({
  query,
  source: sortModel,
  defaultSort: [
    { field: 'sent_date', sort: 'desc' },
    { field: 'subject', sort: 'asc' },
  ],
  getColumn,
});
```

### Repository Integration

```typescript
class EmailRepository {
  async getEmails(request: Request) {
    const baseQuery = db.select().from(emails);

    const getColumn = createTableColumnGetter({
      email_id: emails.emailId,
      subject: emails.subject,
      sent_timestamp: emails.sentTimestamp,
    });

    const sortedQuery = buildDrizzleOrderBy({
      query: baseQuery,
      source: request.url,
      defaultSort: 'sent_timestamp',
      columnMap: {
        title: 'subject',
        date: 'sent_timestamp',
      },
      getColumn,
    });

    return await sortedQuery.limit(50);
  }
}
```

## Column Mapping

The `columnMap` parameter allows you to translate frontend field names to database column names:

```typescript
buildDrizzleOrderBy({
  query,
  source: gridSortModel,
  columnMap: {
    displayName: 'name', // Frontend -> Database
    userEmail: 'email',
    createdDate: 'created_at',
  },
  getColumn,
});
```

## Type Safety

The `getColumn` function provides type safety by ensuring only valid columns are used for sorting:

```typescript
const ALLOWED_COLUMNS = {
  id: users.id,
  name: users.name,
  email: users.email,
} as const;

type AllowedColumn = keyof typeof ALLOWED_COLUMNS;

const getColumn = (columnName: string) => {
  if (columnName in ALLOWED_COLUMNS) {
    return ALLOWED_COLUMNS[columnName as AllowedColumn];
  }
  return undefined; // Invalid column - will be ignored
};
```

## Comparison with postgres.js Version

This function provides the same functionality as the original `buildOrderBy` function but is specifically designed for Drizzle ORM:

| Feature           | postgres.js `buildOrderBy` | `buildDrizzleOrderBy`     |
| ----------------- | -------------------------- | ------------------------- |
| SQL Generation    | Template literals          | Drizzle query builder     |
| Type Safety       | Runtime column validation  | Compile-time column types |
| Column References | String column names        | Actual column objects     |
| SQL Expressions   | Raw SQL strings            | Drizzle SQL helper        |
| Query Builder     | postgres.js fragments      | Drizzle PgSelectBuilder   |

## Error Handling

The function includes built-in error handling:

- Unknown columns are logged as warnings and ignored
- Invalid sort models are handled gracefully
- Default sorting is applied when no valid sort is provided

```typescript
// Unknown columns will log a warning but not break the query
buildDrizzleOrderBy({
  query,
  source: [{ field: 'nonexistent_column', sort: 'asc' }],
  getColumn: () => undefined, // Always returns undefined
}); // Returns original query unchanged
```
