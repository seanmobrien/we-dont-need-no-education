import { wrapRouteRequest } from '/lib/nextjs-util/server';
import { NextResponse } from 'next/server';
import {
  ExtendedMemoryClient,
  memoryClientFactory,
} from '/lib/ai/mem0/memoryclient-factory';
import {
  determineHealthStatus,
  type HealthStatus,
} from '/lib/ai/mem0/types/health-check';

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
};

/**
 * Maps health status to health check status code
 */
function mapHealthStatusToCode(status: HealthStatus): HealthCheckStatusCode {
  switch (status) {
    case 'healthy':
      return 'ok';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return 'error';
  }
}

/**
 * Checks memory system health by calling the Mem0 health check endpoint
 * Returns granular subsystem health information
 */
async function checkMemoryHealth(): Promise<
  HealthCheckStatusEntry<
    'db' | 'vectorStore' | 'graphStore' | 'historyStore' | 'authService'
  >
> {
  try {
    const memoryClient = await memoryClientFactory<ExtendedMemoryClient>({});
    const healthResponse = await memoryClient.healthCheck({
      strict: false,
      verbose: 1,
    });

    const { details } = healthResponse;

    // Create granular subsystem status entries
    const subsystems = {
      db: {
        status: details.system_db_available
          ? ('ok' as const)
          : ('error' as const),
      },
      vectorStore: {
        status: details.vector_store_available
          ? ('ok' as const)
          : ('error' as const),
      },
      graphStore: {
        status: details.graph_store_available
          ? ('ok' as const)
          : ('error' as const),
      },
      historyStore: {
        status: details.history_store_available
          ? ('ok' as const)
          : ('error' as const),
      },
      authService: {
        status: details.auth_service.healthy
          ? ('ok' as const)
          : ('error' as const),
      },
    };

    // Determine overall memory system status
    const overallHealthStatus = determineHealthStatus(details);
    const overallStatusCode = mapHealthStatusToCode(overallHealthStatus);

    return {
      status: overallStatusCode,
      ...subsystems,
    };
  } catch (error) {
    // If we can't reach the memory service, consider everything an error
    console.error('Memory health check failed:', error);
    return {
      status: 'error',
      db: { status: 'error' },
      vectorStore: { status: 'error' },
      graphStore: { status: 'error' },
      historyStore: { status: 'error' },
      authService: { status: 'error' },
    };
  }
}

/**
 * GET /api/health
 * Returns a structured snapshot of subsystem statuses.
 * Wrapped for unified logging / error semantics.
 */
export const GET = wrapRouteRequest(async () => {
  // Get memory health asynchronously with timeout
  const memoryHealthPromise = Promise.race([
    checkMemoryHealth(),
    new Promise<
      HealthCheckStatusEntry<
        'db' | 'vectorStore' | 'graphStore' | 'historyStore' | 'authService'
      >
    >(
      (resolve) =>
        setTimeout(
          () =>
            resolve({
              status: 'error',
              db: { status: 'error' },
              vectorStore: { status: 'error' },
              graphStore: { status: 'error' },
              historyStore: { status: 'error' },
              authService: { status: 'error' },
            }),
          15000,
        ), // 15 second timeout
    ),
  ]);

  const [memoryHealth] = await Promise.all([memoryHealthPromise]);

  const healthCheckResponse: HealthCheckResponse = {
    database: { status: 'ok' },
    chat: { status: 'ok', cache: { status: 'ok' }, queue: { status: 'ok' } },
    memory: memoryHealth,
  };

  return NextResponse.json(healthCheckResponse, { status: 200 });
});
