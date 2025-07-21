import postgres from 'postgres';
import { env, isRunningOnEdge } from '@/lib/site-util/env';

let _pgDbPromise: Promise<postgres.Sql> | undefined;
let _pgDb: postgres.Sql | undefined;
let procExitRegistered = false;

const stopPgDb = async () => {
  if (_pgDb) {
    try {
      await _pgDb.end({ timeout: 5 });
      /*
      _pgDb = undefined;
      _pgDbPromise = undefined;
      */
    } catch (error) {
      console.error('Error during database cleanup:', error);
    }
  }
};

export const pgDbWithInit = async () => {
  if (_pgDb !== undefined) {
    return _pgDb;
  }
  if (!_pgDbPromise) {
    _pgDbPromise = (async () => {
      // This function creates the actual database.  Isolated from the rest of the code
      // in order to delay postgres import until we know we need it.
      const createActualDb = async () => {
        // In all other cases, create a new postgres connection
        const postgres = await (import('postgres').then(x => x.default));
        const theDb = postgres(env('DATABASE_URL'), {
          ssl: 'verify-full',
          max: 3,
          debug: true,
        });
        // A second singleton guard to prevent multiple prexit registrations in the 
        // same process (e.g., during hot reloads in development)
        if (!procExitRegistered) {
          procExitRegistered = true;
          await (import('prexit')
            .then((x) => x.default)
            .then((prexit) => {                          
              // Register the exit handler
              prexit(stopPgDb);
          }));
              /* Lets see if the second singleton doesn't let us ditch all this crazy
              global handler stuff...                
              // Store the handler globally for cleanup tracking
              globalHandlers.__neondb_prexit_handlers!.add(exitHandler);
              // Store cleanup function to remove the handler
              cleanupHandler = () => {
                globalHandlers.__neondb_prexit_handlers!.delete(exitHandler);
                console.log('Cleaning up prexit handler.');
              };
              */
        }
        return theDb;
      };
      const createNoOpDb = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fnNoOp: (...args: any[]) => any = () => {
          console.warn(
            'No database connection available.  This is likely because you are running in a test environment or on the edge.',
          );
          return Promise.resolve(fnNoOp);
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fnNoOp as any).end = fnNoOp;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fnNoOp as any).query = fnNoOp;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return fnNoOp as postgres.Sql<any>;
      };
      // If running in a test environment, return a mock implementation
      if (
        process.env.NODE_ENV === 'test' ||
        process.env.JEST_WORKER_ID !== undefined
      ) {
        console.warn("Hmm looks like we're running in a test environment?  Really shouldn't be " +
          "hitting this codebase :(")
        return createNoOpDb();
      }
      // If running on the edge, return a no-op implementation
      if (isRunningOnEdge()) {
        return createNoOpDb();
      }
      return await createActualDb();      
    })();
    _pgDbPromise.then(
      (value) => (_pgDb = value),
      () => (_pgDbPromise = undefined),
    );
  }
  return _pgDbPromise;
};

export const pgDb = () => {
  if (_pgDb === undefined) {
    throw new Error(
      'Database not initialized. Please call pgDbWithInit() first.',
    );
  }
  return _pgDb;
};

exports.pgDbWithInit = pgDbWithInit;
exports.pgDb = pgDb;
// Export the default connection for legacy retrieval
Object.defineProperty(exports, 'default', {
  get: () => pgDb(),
  configurable: true,
});

/* so much cleanup and we still oversubscribe!
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
        await (sql?.end({ timeout: 5 }) ?? Promise.resolve());
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

*/

