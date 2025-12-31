# @compliance-theater/typescript

TypeScript utility types and helpers for the Title IX Victim Advocacy Platform.

## Overview

This package provides a collection of TypeScript utility types, type guards, generic helpers, and specialized data structures to enhance type safety and developer experience.

## Features

- **Type Guards**: Runtime type checking utilities (`isKeyOf`, `isValidUuid`, etc.)
- **Generic Helpers**: Type manipulation utilities (`unwrapPromise`, `ArrayElement`, etc.)
- **Record Decorators**: Utilities for working with TypeScript records
- **Dual Key Map**: Specialized bi-directional map data structure
- **Abortable Promise**: Promise wrapper with abort support
- **Singleton Provider**: Type-safe singleton pattern implementation
- **Zod Integration**: Utilities for converting Zod schemas to JSON structures

## Usage

### Type Guards

```typescript
import { isKeyOf, isValidUuid } from "@compliance-theater/typescript/guards";

const obj = { foo: "bar", baz: 123 };
if (isKeyOf("foo", obj)) {
  console.log(obj["foo"]);
}

if (isValidUuid("550e8400-e29b-41d4-a716-446655440000")) {
  // Valid UUID v4
}
```

### Generic Helpers

```typescript
import { unwrapPromise, ArrayElement } from "@compliance-theater/typescript";

type MyPromiseType = Promise<string>;
type Unwrapped = unwrapPromise<MyPromiseType>; // string

type MyArray = ["a", "b", "c"];
type Element = ArrayElement<MyArray>; // 'a' | 'b' | 'c'
```

### Dual Key Map

```typescript
import { DualKeyMap } from "@compliance-theater/typescript/dual-key-map";

const map = new DualKeyMap<string, number, { value: string }>();
map.set("key1", 1, { value: "data" });

const data = map.get("key1", 1); // { value: 'data' }
```

### Singleton Provider

```typescript
import { SingletonProvider } from "@compliance-theater/typescript/singleton-provider";

class MyService {}

const service = SingletonProvider.Instance.getSingletonOrCreate(
  "my-service-key",
  () => new MyService()
);
```

## API

### Main Exports

- `guards`: Type guard utilities
- `generics`: Generic type helpers
- `types`: Common utility types
- `record-decorators`: Record manipulation utilities
- `dual-key-map`: Bi-directional map implementation
- `abortable-promise`: Promise with abort capability
- `singleton-provider`: Singleton pattern utilities
- `zod-to-json-structure`: Zod schema conversion

## Development

### Running Tests

```bash
yarn test
```

Note: Some tests may have dependencies on other packages that haven't been extracted yet.

## Dependencies

This is a pure TypeScript utility package with minimal runtime dependencies.
