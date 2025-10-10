import { drizzle } from 'drizzle-orm/postgres-js';
import schema, { DbDatabaseType } from './schema';
import { isPromise } from '@/lib/typescript/_guards';
import { LoggedError } from '../react-util';

/**
 * Drizzle DB connection helpers
 *
 * This module lazily initializes a Drizzle ORM `DbDatabaseType` instance using
 * a pg driver provided by `../neondb/connection`. The initialized instance is
 * cached on `globalThis.__obapps` so it survives module reloads and is shared
 * across the process. Two convenience entry points are provided:
 *
 * - `drizDbWithInit()` — async initializer that will wait for initialization
 *   and optionally run a callback with the initialized db.
 * - `drizDb()` — synchronous accessor that returns the initialized db or
 *   throws when initialization is in progress. It also accepts a callback
 *   which is invoked with the db when available.
 */

export { schema };

/**
 * Webpack-safe singleton keys using Symbol.for() to ensure uniqueness across all chunks.
 * This approach prevents module duplication issues where different webpack bundles
 * would otherwise create separate singleton instances.
 */
const DB_INSTANCE_KEY = Symbol.for('@noeducation/drizzle-db-instance');
const DB_PROMISE_KEY = Symbol.for('@noeducation/drizzle-db-promise');
const PG_DRIVER_KEY = Symbol.for('@noeducation/pg-driver-factory');

/**
 * Global registry interface using symbols for webpack-safe singleton access.
 * Symbols created with Symbol.for() are globally registered and shared across
 * all webpack chunks, preventing duplicate singleton instances.
 */
interface GlobalDbRegistry {
  [DB_INSTANCE_KEY]?: DbDatabaseType;
  [DB_PROMISE_KEY]?: Promise<DbDatabaseType>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [PG_DRIVER_KEY]?: any;
}

/**
 * Accessor for the currently stored Drizzle DB initialization promise.
 * Returns undefined before initialization has occurred; otherwise resolves
 * to {@link drizDb}.
 */
const get_DrizDbPromise = (): Promise<DbDatabaseType> | undefined =>
  (globalThis as GlobalDbRegistry)[DB_PROMISE_KEY];

/**
 * Setter for the Drizzle DB initialization promise. Passing `undefined`
 * clears the stored promise.
 */
const set_DrizDbPromise = (
  db: Promise<DbDatabaseType> | undefined,
): Promise<DbDatabaseType> | undefined => {
  (globalThis as GlobalDbRegistry)[DB_PROMISE_KEY] = db;
  return db;
};

/**
 * Returns the initialized Drizzle DB instance if available, or undefined.
 */
const get_DrizDb = (): DbDatabaseType | undefined =>
  (globalThis as GlobalDbRegistry)[DB_INSTANCE_KEY];

interface DrizDbInitOverloads {
  /**
   * Wait for Drizzle DB initialization and return the db instance.
   */
  (): Promise<DbDatabaseType>;
  /**
   * Wait for initialization and invoke the provided callback with the db.
   * The callback may return a value or a promise; the return type is preserved.
   */
  <T>(
    then: (db: DbDatabaseType) => T,
  ): T extends Promise<infer R> ? Promise<R> : Promise<T>;
}

const getPostgresDriver = async () => {
  let connection = (globalThis as GlobalDbRegistry)[PG_DRIVER_KEY];
  if (!connection) {
    try {
      const postgresql = await import('../neondb/connection');
      connection = postgresql.pgDbWithInit;
      (globalThis as GlobalDbRegistry)[PG_DRIVER_KEY] = connection;
    } catch (error) {
      throw new Error('Failed to load postgresjs driver', {
        cause: error,
      });
    }
  }
  return connection();
};

/**
 * Ensure the Drizzle DB is initialized and optionally run a callback with the db.
 *
 * When called without a callback the function resolves to the initialized
 * `DbDatabaseType`. When called with a callback the callback will be invoked
 * once the db is available and its result is returned (promisified if needed).
 */
export const drizDbWithInit: DrizDbInitOverloads = <T>(
  cb?: (db: DbDatabaseType) => T,
) => {
  const resolver = async (db: DbDatabaseType) => {
    if (cb) {
      const fnRet = cb(db);
      const pRet = isPromise<T>(fnRet) ? await fnRet : fnRet;
      return pRet;
    }
    return Promise.resolve(db) as T;
  };
  const drizDb = get_DrizDb();
  if (!!drizDb) {
    return Promise.resolve(drizDb).then(resolver);
  }
  let drizDbPromise = get_DrizDbPromise();
  if (!drizDbPromise) {
    drizDbPromise = getPostgresDriver()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((sql: any) => {
        const value = drizzle(sql, {
          casing: 'snake_case',
          schema,
        });
        (globalThis as GlobalDbRegistry)[DB_INSTANCE_KEY] = value;
        return value;
      });
    if (drizDbPromise) {
      set_DrizDbPromise(drizDbPromise);
      drizDbPromise.catch((err) => {
        const le = LoggedError.isTurtlesAllTheWayDownBaby(err, {
          log: true,
          message: 'Error initializing Drizzle DB',
          extra: {
            cause: err,
          },
          source: 'drizDbWithInit',
        });
        // Reset stored promise on error so future callers can retry initialization
        set_DrizDbPromise(undefined);
        throw le;
      });
    } else {
      throw new Error(
        'Failed to initialize Drizzle DB - could not create dbPromise',
      );
    }
  }
  return drizDbPromise.then(resolver) as Promise<T>;
};

interface DrizDbOverloads {
  /** Return the initialized Drizzle DB synchronously. Throws when initialization is in progress. */
  (): DbDatabaseType;
  /** Invoke the provided function with the initialized db and return its result (promisified if needed). */
  <T>(
    fn: (driz: DbDatabaseType) => T,
  ): T extends Promise<infer R> ? Promise<R> : Promise<T>;
}

/**
 * Synchronous accessor for the Drizzle DB instance.
 *
 * If the DB is already initialized the function returns the instance or, when
 * a callback is provided, invokes the callback with the db. When the DB is not
 * yet initialized this function will throw, signaling callers to retry or
 * await initialization via `drizDbWithInit()`.
 */
export const drizDb: DrizDbOverloads = <T>(
  fn?: (driz: DbDatabaseType) => T,
) => {
  const drizDb = get_DrizDb();
  if (drizDb) {
    if (fn) {
      const fnRet = fn(drizDb);
      return isPromise(fnRet) ? fnRet : Promise.resolve(fnRet);
    }
    return get_DrizDb();
  }
  // Queue up initialization if not already started so callers can observe it.
  const dbWithInit = drizDbWithInit();
  dbWithInit.catch((err) => {
    LoggedError.isTurtlesAllTheWayDownBaby(err, {
      log: true,
      message: 'Error initializing Drizzle DB',
      extra: {
        cause: err,
      },
      source: 'drizDb initialize',
    });
    return Promise.resolve();
  });
  throw new Error(
    'Drizzle DB is being initialized; please try your call again later.',
    {
      cause: {
        code: 'DB_INITIALIZING',
        retry: true,
        enqueue: dbWithInit.then,
      },
    },
  );
};
