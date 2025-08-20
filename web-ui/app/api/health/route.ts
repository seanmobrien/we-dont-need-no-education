import { wrapRouteRequest } from "@/lib/nextjs-util/server";
import { NextResponse } from "next/server";

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
 *      * Structured error handling returning a JSON ErrorResponse on failures
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
type HealthCheckStatusCode = 'ok' | 'error';

/**
 * Enumerates discrete systems (or system groups) represented in the response.
 */
type HealthCheckSystem = 'database' | 'cache' | 'queue' | 'chat';

/**
 * Base shape for any status entry.
 */
type HealthCheckStatusEntryBase = {
  /** Current coarse status value */
  status: HealthCheckStatusCode;
};
type HealthCheckStatusEntry<K extends HealthCheckSystem = never> = HealthCheckStatusEntryBase & {
  [key in K]?: HealthCheckStatusEntryBase;
};

/**
 * Maps each system to its expected nested structure.
 * chat includes embedded sub‑systems (cache, queue) to express grouped health.
 */
type HealthSystemResponseTypeMap = {
  database: HealthCheckStatusEntry<never>;
  chat: HealthCheckStatusEntry<'cache' | 'queue'>;
  cache: HealthCheckStatusEntry<never>;
  queue: HealthCheckStatusEntry<never>;
}

/**
 * Final JSON response contract. Each top-level key is optional to allow
 * progressive enhancement without breaking consumers (absent key = not reported).
 */
type HealthCheckResponse =  {
  [key in HealthCheckSystem]?: HealthSystemResponseTypeMap[key];
};
/**
 * GET /api/health
 * Returns a structured snapshot of subsystem statuses.
 * Wrapped for unified logging / error semantics.
 */
export const GET = wrapRouteRequest(() => {
  // Placeholder synchronous health synthesis; replace with bounded async probes as needed.
  const healthCheckResponse: HealthCheckResponse = {
    database: { status: "ok" },
    chat: { status: "ok", cache: { status: "ok" }, queue: { status: "ok" } },
  };
  return Promise.resolve(NextResponse.json(healthCheckResponse, { status: 200 }));
});
