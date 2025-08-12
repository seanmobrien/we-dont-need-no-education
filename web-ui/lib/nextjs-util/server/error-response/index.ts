/**
 * error-response
 *
 * Utilities for producing consistent JSON error responses in Next.js server code.
 *
 * - Normalizes a wide range of inputs (string, number, Error, Response, options object)
 * - Provides a stable Response payload shape
 * - Derives sensible defaults and metadata (status, message, cause, source)
 *
 * For usage examples, see the README:
 * - ./docs/lib/nextjs-util/error-response.md
 */
import { isError } from "@/lib/react-util/_utility-methods";

// Local minimal fallbacks to allow evaluation in non-fetch environments (e.g., some Jest setups)
// These are only used if the corresponding global constructors are missing.
class __SimpleHeaders {
  private m = new Map<string, string>();
  constructor(init?: HeadersInit) {
    if (!init) return;
    if (Array.isArray(init)) {
      for (const [k, v] of init) this.m.set(String(k).toLowerCase(), String(v));
    } else if (init instanceof Map) {
      for (const [k, v] of (init as Map<string, string>).entries()) this.m.set(String(k).toLowerCase(), String(v));
    } else {
      const obj = init as Record<string, string>;
      for (const k of Object.keys(obj)) this.m.set(k.toLowerCase(), String(obj[k]));
    }
  }
  get(name: string): string | null {
    return this.m.get(String(name).toLowerCase()) ?? null;
  }
  set(name: string, value: string) {
    this.m.set(String(name).toLowerCase(), String(value));
  }
}

// Decide which Headers to use at module eval time without throwing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const __HeadersBase: any = typeof Headers !== 'undefined' ? Headers : __SimpleHeaders;

// Minimal Response polyfill that supports status, headers, json(), text()
class __SimpleResponse {
  status: number;
  headers: InstanceType<typeof __HeadersBase>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private __body: any;
  constructor(body?: BodyInit | null, init?: ResponseInit) {
    this.status = init?.status ?? 200;
    this.headers = new __HeadersBase(init?.headers ?? {});
    this.__body = body ?? '';
  }
  async json() {
    const text = await this.text();
    try {
      return JSON.parse(text || '{}');
    } catch {
      return {};
    }
  }
  async text() {
    if (typeof this.__body === 'string') return this.__body;
    if (this.__body == null) return '';
    try {
      // Attempt best-effort conversion
      return String(this.__body);
    } catch {
      return '';
    }
  }
}

// Choose a base Response class safely
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const __ResponseBase: any = typeof Response !== 'undefined' ? Response : __SimpleResponse;

/**
 * Options that can be used to influence how an error response is produced.
 *
 * @property cause - The originating error (or any value). If an `Error` is provided and no
 *                   message is present, the message falls back to `cause.message`.
 * @property status - HTTP status code. Defaults to 500 when omitted.
 * @property message - Error message to present to clients.
 * @property source - Optional string indicating the logical source of the error.
 */
export type ErrorResponseOptions = {
  cause?: unknown;
  status?: number;
  message?: string;
  source?: string;
};

/**
 * Normalize a single, unknown input into partial ErrorResponseOptions.
 *
 * @internal
 * @param arg - string | number | Error | Response | ErrorResponseOptions | unknown
 * @returns Partial options derived from the input
 */
const normalizeArg = (arg: unknown): Partial<ErrorResponseOptions> => {
  if (arg == null) return {};
  if (typeof arg === 'string') return { message: arg };
  if (typeof arg === 'number') return { status: arg };
  if (typeof Response !== 'undefined' && arg instanceof Response) {
    const status = arg.status;
    const message = arg.statusText || `HTTP ${status}`;
    return { status, message };
  }
  if (isError(arg)) return { cause: arg, message: (arg as Error).message };
  if (typeof arg === 'object') {
    // Treat plain option objects as-is; do NOT auto-derive message from cause here.
    // Message derivation from Error should only occur when the arg itself is an Error.
    const obj = { ...(arg as Record<string, unknown>) } as Partial<ErrorResponseOptions>;
    return obj;
  }
  return {};
};

/**
 * Combine two inputs into a normalized error shape.
 *
 * Rules:
 * - Status: prefers explicit numbers, defaults to 500
 * - Message: derives from inputs; if both inputs provide a message, they are combined
 *            as "message1 - message2"; falls back to "An error occurred"
 * - Cause: if provided, is stringified; `Error` becomes its `.name`
 * - Source: explicit `source`, or extracted from `cause.source` when present
 *
 * @param first - Primary input: string | number | Error | Response | ErrorResponseOptions | unknown
 * @param second - Secondary input with the same accepted types; overrides where present
 * @returns Normalized `{ status, message, cause?, source? }`
 *
 * @example
 * parseResponseOptions('Auth failed', { status: 401, source: 'auth' })
 * // => { status: 401, message: 'Auth failed', source: 'auth' }
 *
 * @example
 * parseResponseOptions(new Error('Boom'), 'Custom')
 * // => { status: 500, message: 'Boom - Custom', cause: 'Error' }
 *
 * For more end-to-end examples, see {@link ./README.md}.
 */
export const parseResponseOptions = (
  first?: unknown,
  second?: unknown
): { status: number; message: string; cause?: string; source?: string } => {
  const a = normalizeArg(first);
  const b = normalizeArg(second);
  const merged: ErrorResponseOptions = { ...a, ...b } as ErrorResponseOptions;

  const status = typeof merged.status === 'number' ? merged.status : 500;
  const aMsg = typeof a.message === 'string' && a.message.length > 0 ? a.message : undefined;
  const bMsg = typeof b.message === 'string' && b.message.length > 0 ? b.message : undefined;
  const combined = aMsg && bMsg ? `${aMsg} - ${bMsg}` : (bMsg ?? aMsg);
  const message = combined && combined.length > 0 ? combined : 'An error occurred';

  const hasSource = (val: unknown): val is { source: unknown } => {
    return typeof val === 'object' && val !== null && 'source' in (val as Record<string, unknown>);
  };

  let source: string | undefined;
  if (typeof merged.source === 'string') source = merged.source;
  else if (merged.cause && hasSource(merged.cause)) {
    const s = merged.cause.source;
    source = s != null ? String(s) : undefined;
  }

  let cause: string | undefined;
  if (merged.cause !== undefined) {
    cause = isError(merged.cause) ? (merged.cause as Error).name : String(merged.cause);
  }

  return { status, message, ...(source ? { source } : {}), ...(cause ? { cause } : {}) };
};

/**
 * ErrorResponse
 *
 * A small helper that creates a JSON Response with a consistent error shape:
 * `{ error: string, status: number, cause?: string }`.
 *
 * It accepts flexible inputs (string | number | Error | Response | options),
 * and uses {@link parseResponseOptions} to normalize them.
 *
 * See {@link ./README.md} for examples.
 */
export class ErrorResponse extends __ResponseBase {
  /**
   * Create a new ErrorResponse.
   *
   * @param statusOrError - A flexible input: string | number | Error | Response | ErrorResponseOptions | unknown
   * @param messageOrOptions - Optional second input of the same accepted types; values override the first
   *
   * ### Behavior
   * - If `statusOrError` is a number, it is used as the HTTP status code.
   * - If `statusOrError` is a `Response`, its status and statusText are used.
   * - If `statusOrError` is an Error (as determined by `isError`), its message is used.
   * - Otherwise, defaults to status 500 and a generic error message.
   */
  constructor(statusOrError?: unknown, messageOrOptions?: unknown) {
    const opts = parseResponseOptions(statusOrError, messageOrOptions);
    super(JSON.stringify({ error: opts.message, status: opts.status, cause: opts.cause }), {
      status: opts.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}