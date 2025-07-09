import postgres from 'postgres';
import { env, isRunningOnEdge } from '@/lib/site-util/env';

const sql = (() => {
  // If running in a test environment, return a mock implementation
  if (
    process.env.NODE_ENV === 'test' ||
    process.env.JEST_WORKER_ID !== undefined
  ) {
    return jest.fn().mockImplementation(() => {
      console.warn('How did you get here?', new Error().stack);
      return {
        end: jest.fn().mockResolvedValue(undefined),
        query: jest.fn().mockResolvedValue({}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as unknown as postgres.Sql<any>;
    });
  }
  // If running on the edge, return a no-op implementation
  if (isRunningOnEdge()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fnNoOp: (...args: any[]) => any = () => {
      console.warn(
        'No database connection avialable.  This is likely because you are running in a test environment or on the edge.',
      );
      return Promise.resolve(fnNoOp);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fnNoOp as any).end = fnNoOp;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fnNoOp as any).query = fnNoOp;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return fnNoOp as postgres.Sql<any>;
  }
  // In all other cases, create a new postgres connection
  return postgres(env('DATABASE_URL'), {
    ssl: 'verify-full',
    max: 3,
    debug: true,
  });
})() as postgres.Sql;

// Singleton pattern to prevent multiple prexit handler registrations during hot reloads
let prexitHandlerRegistered = false;
let cleanupHandler: (() => void) | null = null;

// Store handlers globally to manage them across hot reloads
const globalHandlers = globalThis as typeof globalThis & {
  __neondb_prexit_handlers?: Set<() => Promise<void>>;
};

// Initialize global handlers set if it doesn't exist
if (!globalHandlers.__neondb_prexit_handlers) {
  globalHandlers.__neondb_prexit_handlers = new Set();
}

// Clean up previous handler if module is being reloaded (webpack HMR)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof module !== 'undefined' && (module as any).hot) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (module as any).hot.dispose(() => {
    if (cleanupHandler) {
      cleanupHandler();
      cleanupHandler = null;
    }
    prexitHandlerRegistered = false;
  });
}

// Alternative cleanup for environments without HMR
// Check if we already have a handler registered globally
const existingHandlers = globalHandlers.__neondb_prexit_handlers;
if (existingHandlers.size > 0) {
  // Clear existing handlers to prevent duplicates
  existingHandlers.clear();
  prexitHandlerRegistered = false;
}

if (process.env.NEXT_RUNTIME === 'nodejs' && !prexitHandlerRegistered) {
  prexitHandlerRegistered = true;
  await import('prexit')
    .then((x) => x.default)
    .then((prexit) => {
      const exitHandler = async () => {
        console.log('Closing database connection.');
        await (sql?.end({ timeout: 5 }) ?? Promise.resolve());
        console.log('Cleanly closed database connection.');
      };

      // Register the exit handler
      prexit(exitHandler);

      // Store the handler globally for cleanup tracking
      globalHandlers.__neondb_prexit_handlers!.add(exitHandler);

      // Store cleanup function to remove the handler
      cleanupHandler = () => {
        globalHandlers.__neondb_prexit_handlers!.delete(exitHandler);
        console.log('Cleaning up prexit handler.');
      };
    });
}

export default sql;
