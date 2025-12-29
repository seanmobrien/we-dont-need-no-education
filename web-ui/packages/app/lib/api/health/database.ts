import { drizDbWithInit } from '@/lib/drizzle-db';
import { sql } from '@/lib/drizzle-db/drizzle-sql';
import { LoggedError } from '@/lib/react-util';
import InMemoryCache from '@/lib/api/health/base-cache';
import { globalRequiredSingleton } from '@compliance-theater/typescript/singleton-provider';
import { getFeatureFlag } from '@/lib/site-util/feature-flags/server';
import { SingletonProvider } from '@compliance-theater/typescript/singleton-provider';

export class DatabaseHealthCache extends InMemoryCache<{
  status: 'healthy' | 'warning' | 'error';
}> {
  constructor(config?: { ttlMs?: number }) {
    super(config);
  }
}

export const getDatabaseHealthCache = (): DatabaseHealthCache =>
  globalRequiredSingleton(
    'database-health-cache',
    () => new DatabaseHealthCache({ ttlMs: 2 * 60 * 1000 }),
  );

// Ensure cache TTL is initialized from Flagsmith (async). Uses a singleton
// promise to prevent multiple concurrent initializations.
const INIT_PROMISE_KEY = Symbol.for('@noeducation/database-health-cache-init');
const getInitPromise = (): Promise<void> | undefined =>
  SingletonProvider.Instance.get(INIT_PROMISE_KEY) as Promise<void> | undefined;

const setInitPromise = (p: Promise<void>) =>
  SingletonProvider.Instance.set(INIT_PROMISE_KEY, p as unknown as object);

export const ensureDatabaseCacheConfigured = async () => {
  const existing = getInitPromise();
  if (existing) return existing;

  const p = (async () => {
    try {
      const rawTtl = await getFeatureFlag('health_database_cache_ttl');
      const ttl = Number(rawTtl);
      if (Number.isFinite(ttl) && ttl > 0) {
        const cache = new DatabaseHealthCache({ ttlMs: ttl * 1000 });
        SingletonProvider.Instance.set('database-health-cache', cache);
      }
    } catch {
      // ignore - fallback to defaults
    }
  })();
  setInitPromise(p);
  try {
    await p;
  } finally {
    // leave the initialized cache in place; do not clear the init promise
  }
};

/**
 * A minimal, low-cost DB health check that uses a process-local cache.
 * The result is cached for 2 minutes to avoid hammering the DB on high
 * request volumes.
 */
export const checkDatabaseHealth = async (): Promise<{
  status: 'healthy' | 'warning' | 'error';
}> => {
  await ensureDatabaseCacheConfigured();
  const cache = getDatabaseHealthCache();
  const cached = cache.get();
  if (cached) return cached;

  try {
    // Run a very cheap query - this should be supported by all DBs and
    // is optimized by the server.
    await drizDbWithInit((db) => db.execute(sql`select 1 as ok`));
    const ok = { status: 'healthy' } as const;
    try {
      cache.set(ok);
    } catch {}
    return ok;
  } catch (err) {
    // Log structured error for debugging/monitoring and return error state.
    LoggedError.isTurtlesAllTheWayDownBaby(err, {
      log: true,
      source: 'check-database-health',
      message: 'Database health check failed',
      extra: { cause: err },
    });
    const bad = { status: 'error' } as const;
    try {
      cache.set(bad);
    } catch {}
    return bad;
  }
};
