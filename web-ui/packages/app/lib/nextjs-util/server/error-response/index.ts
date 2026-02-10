import { isError } from '@compliance-theater/logger';

export type ErrorResponseOptions = {
  cause?: unknown;
  status?: number;
  message?: string;
  source?: string;
};

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
    const obj = {
      ...(arg as Record<string, unknown>),
    } as Partial<ErrorResponseOptions>;
    return obj;
  }
  return {};
};

export const parseResponseOptions = (
  first?: unknown,
  second?: unknown,
): { status: number; message: string; cause?: string; source?: string } => {
  const a = normalizeArg(first);
  const b = normalizeArg(second);
  const merged: ErrorResponseOptions = { ...a, ...b } as ErrorResponseOptions;

  const status = typeof merged.status === 'number' ? merged.status : 500;
  const aMsg =
    typeof a.message === 'string' && a.message.length > 0
      ? a.message
      : undefined;
  const bMsg =
    typeof b.message === 'string' && b.message.length > 0
      ? b.message
      : undefined;
  const combined = aMsg && bMsg ? `${aMsg} - ${bMsg}` : (bMsg ?? aMsg);
  const message =
    combined && combined.length > 0 ? combined : 'An error occurred';

  const hasSource = (val: unknown): val is { source: unknown } => {
    return (
      typeof val === 'object' &&
      val !== null &&
      'source' in (val as Record<string, unknown>)
    );
  };

  let source: string | undefined;
  if (typeof merged.source === 'string') source = merged.source;
  else if (merged.cause && hasSource(merged.cause)) {
    const s = merged.cause.source;
    source = s != null ? String(s) : undefined;
  }

  let cause: string | undefined;
  if (merged.cause !== undefined) {
    cause = isError(merged.cause)
      ? (merged.cause as Error).name
      : String(merged.cause);
  }

  return {
    status,
    message,
    ...(source ? { source } : {}),
    ...(cause ? { cause } : {}),
  };
};

export const errorResponseFactory = (
  statusOrError?: unknown,
  messageOrOptions?: unknown,
) => {
  const opts = parseResponseOptions(statusOrError, messageOrOptions);
  return Response.json(
    {
      error: opts.message,
      status: opts.status,
      cause: opts.cause,
    },
    {
      status: opts.status,
      headers: { 'Content-Type': 'application/json' },
    },
  );
};
