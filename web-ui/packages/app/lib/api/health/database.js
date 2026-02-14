import { drizDbWithInit } from '@compliance-theater/database/orm';
import { sql } from '@compliance-theater/database/orm';
import { LoggedError } from '@compliance-theater/logger';
import InMemoryCache from '@/lib/api/health/base-cache';
import { globalRequiredSingleton } from '@compliance-theater/typescript/singleton-provider';
import { getFeatureFlag } from '@compliance-theater/feature-flags/server';
import { SingletonProvider } from '@compliance-theater/typescript/singleton-provider';
export class DatabaseHealthCache extends InMemoryCache {
    constructor(config) {
        super(config);
    }
}
export const getDatabaseHealthCache = () => globalRequiredSingleton('database-health-cache', () => new DatabaseHealthCache({ ttlMs: 2 * 60 * 1000 }));
const INIT_PROMISE_KEY = Symbol.for('@noeducation/database-health-cache-init');
const getInitPromise = () => SingletonProvider.Instance.get(INIT_PROMISE_KEY);
const setInitPromise = (p) => SingletonProvider.Instance.set(INIT_PROMISE_KEY, p);
export const ensureDatabaseCacheConfigured = async () => {
    const existing = getInitPromise();
    if (existing)
        return existing;
    const p = (async () => {
        try {
            const rawTtl = await getFeatureFlag('health_database_cache_ttl');
            const ttl = Number(rawTtl);
            if (Number.isFinite(ttl) && ttl > 0) {
                const cache = new DatabaseHealthCache({ ttlMs: ttl * 1000 });
                SingletonProvider.Instance.set('database-health-cache', cache);
            }
        }
        catch {
        }
    })();
    setInitPromise(p);
    try {
        await p;
    }
    finally {
    }
};
export const checkDatabaseHealth = async () => {
    await ensureDatabaseCacheConfigured();
    const cache = getDatabaseHealthCache();
    const cached = cache.get();
    if (cached)
        return cached;
    try {
        await drizDbWithInit((db) => db.execute(sql `select 1 as ok`));
        const ok = { status: 'healthy' };
        try {
            cache.set(ok);
        }
        catch { }
        return ok;
    }
    catch (err) {
        LoggedError.isTurtlesAllTheWayDownBaby(err, {
            log: true,
            source: 'check-database-health',
            message: 'Database health check failed',
            extra: { cause: err },
        });
        const bad = { status: 'error' };
        try {
            cache.set(bad);
        }
        catch { }
        return bad;
    }
};
//# sourceMappingURL=database.js.map