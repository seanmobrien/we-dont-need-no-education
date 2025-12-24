# DualKeyMap

A generic dual-key dictionary for fast lookup by both ID and name.

## Overview

`DualKeyMap<TRecordType, TRecordIdType, TRecordNameType>` is a utility class for managing records that can be accessed by either a unique ID or a unique name. It maintains two maps internally:
- `idToRecord`: Maps IDs to records
- `nameToId`: Maps names to IDs

This pattern is useful for cases like provider maps, model maps, or any entity with both a unique ID and a unique name.

## Type Parameters
- `TRecordType`: The record type (e.g., `{ id: number, name: string, ... }`)
- `TRecordIdType`: The type of the ID field (e.g., `number` or `string`)
- `TRecordNameType`: The type of the name field (e.g., `string`)

## Constructor
```typescript
constructor(idField: keyof TRecordType, nameField: keyof TRecordType, entries?: IterableIterator<[TRecordIdType, TRecordType]>)
```
- `idField`: The field name in the record that is the ID
- `nameField`: The field name in the record that is the name
- `entries`: Optional initial entries as `[id, record]` pairs

## API
- `entries`: Iterator of `[id, record]` pairs
- `allIds`: Array of all IDs
- `allNames`: Array of all names
- `record(idOrName)`: Get a record by ID or name
- `name(idOrName)`: Get the name for a given ID or name
- `id(idOrName)`: Get the ID for a given ID or name
- `contains(idOrName)`: Check if a record exists by ID or name
- `set(id, record)`: Add or update a record
- `delete(idOrName)`: Remove a record by ID or name
- `clear()`: Remove all records

## Example
```typescript
type User = { id: number; name: string; email: string };
const users = new DualKeyMap<User, number, string>('id', 'name');
users.set(1, { id: 1, name: 'alice', email: 'alice@example.com' });
users.set(2, { id: 2, name: 'bob', email: 'bob@example.com' });

console.log(users.record(1)); // { id: 1, name: 'alice', email: ... }
console.log(users.record('bob')); // { id: 2, name: 'bob', email: ... }
console.log(users.id('alice')); // 1
console.log(users.name(2)); // 'bob'
```

## Usage Notes
- The class is generic and works for any record type with unique ID and name fields
- All lookups are O(1) via Map
- Use for any entity with dual-key access requirements
