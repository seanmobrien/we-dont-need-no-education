import { wrapRouteRequest } from '@/lib/nextjs-util/server';
import { NextResponse } from 'next/server';
import {
  ExtendedMemoryClient,
  memoryClientFactory,
} from '@/lib/ai/mem0/memoryclient-factory';
import {
  MemoryHealthCheckResponse,
  determineHealthStatus,
} from '@/lib/ai/mem0/types/health-check';
import { getMemoryHealthCache } from '@/lib/api/health/memory';
import { checkDatabaseHealth } from '@/lib/api/health/database';
import { env } from '@/lib/site-util/env';
import { LoggedError } from '@/lib/react-util';

/**
 * Health Check Route (GET /api/health)
 * -------------------------------------------------------------
 * Provides a lightweight, synchronous snapshot of core platform subsystem status.
 * Designed to be:
 *  - Fast (no outbound network calls here – delegate deeper checks elsewhere)
 *  - Deterministic (always resolves a JSON payload)
 *  - Simple schema (stable keys for external monitoring / k8s / uptime pings)
 *
 * Current Subsystems:
 *  - database: Indicates DB layer reachability (placeholder: assumed OK here)
 *  - chat: Aggregated status for chat‑related infrastructure
 *      - cache: In‑process / external cache layer (placeholder)
 *      - queue: Background processing / queue subsystem (placeholder)
 *
 * NOTE: This endpoint intentionally does NOT perform real connectivity probes in this
 * implementation to avoid cascading failures or latency amplification. If deeper
 * diagnostics are required, consider a separate /api/health/deep or /api/diagnostics route.
 *
 * Example Successful Response:
 * {
 *   "database": { "status": "ok" },
 *   "chat": {
 *     "status": "ok",
 *     "cache": { "status": "ok" },
 *     "queue": { "status": "ok" }
 *   }
 * }
 *
 * Build / Deployment Considerations:
 *  - Wrapped with wrapRouteRequest, which provides:
 *      * Consistent logging (when enabled)
 *      * Structured error handling returning a JSON errorResponseFactory on failures
 *      * Build‑phase fallback short‑circuit (returns a neutral JSON object when
 *        NEXT_PHASE === 'phase-production-build' or IS_BUILDING=1 unless explicitly overridden)
 *
 * Testing:
 *  - See: __tests__/app/api/health/route.test.ts for validation of:
 *      * Successful payload shape
 *      * Build fallback behavior
 *      * Logging invocation path
 *
 * Extending:
 *  - Introduce real checks by replacing static assignments with async probes, e.g.:
 *      const database = await dbPing();
 *      const cache = await cacheClient.ping();
 *    Ensure added calls are timeout‑bounded to preserve endpoint responsiveness.
 */

/**
 * Narrow set of status codes surfaced by the health layer.
 * Keep deliberately small to simplify external automation.
 */
type HealthCheckStatusCode = 'ok' | 'warning' | 'error';

/**
 * Enumerates discrete systems (or system groups) represented in the response.
 */
type HealthCheckSystem = 'database' | 'cache' | 'queue' | 'chat' | 'memory';

/**
 * Base shape for any status entry.
 */
type HealthCheckStatusEntryBase = {
  /** Current coarse status value */
  status: HealthCheckStatusCode;
};
type HealthCheckStatusEntry<K extends string = never> =
  HealthCheckStatusEntryBase & {
    [key in K]?: HealthCheckStatusEntryBase;
  };

/**
 * Maps each system to its expected nested structure.
 * chat includes embedded sub‑systems (cache, queue) to express grouped health.
 * memory includes embedded sub‑systems (db, vectorStore, graphStore, historyStore, authService) to express grouped health.
 */
type HealthSystemResponseTypeMap = {
  database: HealthCheckStatusEntry<never>;
  chat: HealthCheckStatusEntry<'cache' | 'queue'>;
  cache: HealthCheckStatusEntry<never>;
  queue: HealthCheckStatusEntry<never>;
  memory: HealthCheckStatusEntry<
    'db' | 'vectorStore' | 'graphStore' | 'historyStore' | 'authService'
  >;
};

/**
 * Final JSON response contract. Each top-level key is optional to allow
 * progressive enhancement without breaking consumers (absent key = not reported).
 */
type HealthCheckResponse = {
  [key in HealthCheckSystem]?: HealthSystemResponseTypeMap[key];
} & {
  server: string;
};

/**
 * Maps health status to health check status code
 */
// Transform raw MemoryHealthCheckResponse into the HealthCheckStatusEntry shape
function transformMemoryResponse(
  resp: MemoryHealthCheckResponse,
): HealthCheckStatusEntry<
  'db' | 'vectorStore' | 'graphStore' | 'historyStore' | 'authService'
> {
  const details = resp?.details;
  const status: HealthCheckStatusCode = details
    ? determineHealthStatus(details) === 'healthy'
      ? 'ok'
      : determineHealthStatus(details) === 'warning'
        ? 'warning'
        : 'error'
    : 'error';

  return {
    status,
    db: { status: details?.system_db_available ? 'ok' : 'error' },
    vectorStore: { status: details?.vector_store_available ? 'ok' : 'error' },
    graphStore: { status: details?.graph_store_available ? 'ok' : 'error' },
    historyStore: { status: details?.history_store_available ? 'ok' : 'error' },
    authService: { status: details?.auth_service?.healthy ? 'ok' : 'error' },
  };
}

/**
 * Checks memory system health by calling the Mem0 health check endpoint
 * Returns granular subsystem health information
 */
async function checkMemoryHealth(): Promise<MemoryHealthCheckResponse> {
  const cache = getMemoryHealthCache();
  const cached = cache.get();
  if (cached) return cached;
  try {
    const memoryClient = await memoryClientFactory<ExtendedMemoryClient>({});
    const healthResponse = await memoryClient.healthCheck({
      strict: false,
      verbose: 1,
    });

    // Cache the raw mem0 response and return it directly
    try {
      cache.set(healthResponse);
    } catch {}
    return healthResponse;
  } catch (error) {
    // If we can't reach the memory service, consider everything an error
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'memory-health-check',
      context: {},
    });
    // If mem0 failed, create a minimal fallback MemoryHealthCheckResponse-like object
    const fallback: MemoryHealthCheckResponse = {
      status: 'error',
      message: 'unavailable',
      timestamp: new Date().toISOString(),
      service: 'mem0',
      mem0: {
        version: '0',
        build_type: 'unknown',
        build_info: '',
        verbose: {
          mem0_version: '0',
          build_details: { type: '', info: '', path: '' },
          build_stamp: '',
        },
      },
      details: {
        client_active: false,
        system_db_available: false,
        vector_enabled: false,
        vector_store_available: false,
        graph_enabled: false,
        graph_store_available: false,
        history_store_available: false,
        auth_service: {
          healthy: false,
          enabled: false,
          server_url: '',
          realm: '',
          client_id: '',
          auth_url: '',
          token_url: '',
          jkws_url: '',
        },
        errors: [],
      },
    };
    try {
      const cache = getMemoryHealthCache();
      cache.set(fallback);
    } catch {}
    return fallback;
  }
}

/**
 * GET /api/health
 * Returns a structured snapshot of subsystem statuses.
 * Wrapped for unified logging / error semantics.
 */
export const GET = wrapRouteRequest(async () => {
  // Get memory health asynchronously with timeout; checkMemoryHealth caches raw mem0 response
  const memoryHealthPromise = Promise.race([
    checkMemoryHealth(),
    new Promise<MemoryHealthCheckResponse>((resolve) =>
      setTimeout(
        () =>
          resolve({
            status: 'error',
            message: 'timeout',
            timestamp: new Date().toISOString(),
            service: 'mem0',
            mem0: {
              version: '0',
              build_type: 'unknown',
              build_info: '',
              verbose: {
                mem0_version: '0',
                build_details: { type: '', info: '', path: '' },
                build_stamp: '',
              },
            },
            details: {
              client_active: false,
              system_db_available: false,
              vector_enabled: false,
              vector_store_available: false,
              graph_enabled: false,
              graph_store_available: false,
              history_store_available: false,
              auth_service: {
                healthy: false,
                enabled: false,
                server_url: '',
                realm: '',
                client_id: '',
                auth_url: '',
                token_url: '',
                jkws_url: '',
              },
              errors: [],
            },
          }),
        15000,
      ),
    ),
  ]);

  const [memoryHealth] = await Promise.all([memoryHealthPromise]);

  const databaseStatus = await checkDatabaseHealth();

  const healthCheckResponse: HealthCheckResponse = {
    server: env('NEXT_PUBLIC_HOSTNAME') ?? 'unknown',
    database: databaseStatus,
    chat: { status: 'ok', cache: { status: 'ok' }, queue: { status: 'ok' } },
    memory: transformMemoryResponse(memoryHealth),
  };

  return NextResponse.json(healthCheckResponse, { status: 200 });
});
