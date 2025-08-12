# ErrorResponse and parseResponseOptions

Lightweight helpers for consistent JSON error responses in Next.js server code.

- Module: `@/lib/nextjs-util/server/error-response`
- Exports: `ErrorResponse`, `parseResponseOptions`, `ErrorResponseOptions`

## ErrorResponse

Creates a Response with a stable JSON shape and `Content-Type: application/json`.

Shape: `{ error: string, status: number }`

Signature:
- `new ErrorResponse(statusOrError?: unknown, messageOrOptions?: unknown)`

Accepted inputs (either parameter):
- string -> message
- number -> status
- Error -> message from error, cause tracked internally
- Response -> status and statusText used
- ErrorResponseOptions -> `{ status?, message?, source?, cause? }`

Behavior highlights:
- If both params provide a message, they’re combined: `"message1 - message2"`.
- If an options object has `cause: Error` and no message, message falls back to `cause.message`.
- Defaults: `status = 500`, `message = "An error occurred"`.

### Examples

```ts
import { ErrorResponse } from '@/lib/nextjs-util/server/error-response';

// Status only
return new ErrorResponse(404); // body: { error: 'An error occurred', status: 404 }

// Status + message
return new ErrorResponse(401, 'Unauthorized'); // { error: 'Unauthorized', status: 401 }

// From Error
return new ErrorResponse(new Error('Boom')); // { error: 'Boom', status: 500 }

// Response + custom message (messages combine)
const base = new Response(null, { status: 400, statusText: 'Bad Request' });
return new ErrorResponse(base, 'Try again'); // { error: 'Bad Request - Try again', status: 400 }

// Error + custom message (messages combine)
return new ErrorResponse(new Error('Original'), 'Custom'); // { error: 'Original - Custom', status: 500 }

// Options + Error (status preserved, message from Error, cause/source tracked internally)
const err = Object.assign(new Error('oops'), { source: 'db' });
return new ErrorResponse({ status: 503 }, err); // { error: 'oops', status: 503 }
```

## parseResponseOptions

Normalizes two unknown inputs into `{ status: number; message: string; cause?: string; source?: string }`.

```ts
import { parseResponseOptions } from '@/lib/nextjs-util/server/error-response';

const opts = parseResponseOptions('Auth failed', { status: 401, source: 'auth' });
// => { status: 401, message: 'Auth failed', source: 'auth' }

const opts2 = parseResponseOptions(new Error('Boom'), 'Custom');
// => { status: 500, message: 'Boom - Custom', cause: 'Error' }
```

Notes:
- Message combining applies when both inputs provide a message.
- If an input object contains `cause: Error` and no message, message falls back to `cause.message`.
- `source` is taken from the explicit option or from `cause.source` when present.
