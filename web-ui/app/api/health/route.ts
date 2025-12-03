import { wrapRouteRequest } from '@/lib/nextjs-util/server';
import { NextResponse } from 'next/server';
import {
  ExtendedMemoryClient,
  memoryClientFactory,
} from '@/lib/ai/mem0/memoryclient-factory';
import { getMemoryHealthCache } from '@/lib/api/health/memory';
import { checkDatabaseHealth } from '@/lib/api/health/database';
import { env } from '@/lib/site-util/env';
import { LoggedError } from '@/lib/react-util';
import { fromRequest } from '@/lib/auth/impersonation';
import { MemoryHealthCheckResponse } from '@/lib/ai/mem0/types/health-check';
import { determineHealthStatus } from '@/lib/ai/mem0/lib/health-check';
import { checkChatHealth } from '@/lib/api/health/chat';

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
 * Example Successful Response:
 * {
 *   "memory": { 
 *      "status": "ok",
 *      "db": { "status": "ok" },
 *      "vectorStore": { "status": "ok" },
 *      "graphStore": { "status": "ok" },
 *      "historyStore": { "status": "ok" },
 *      "authService": { "status": "ok" },
 *    },
 *   "database": { "status": "ok" },
 *   "chat": {
 *     "status": "ok",
 *     "cache": { "status": "ok" },
 *     "queue": { "status": "ok" },
 *     "tools": { "status": "ok" },
 *   }
 * } 
 */

import {
  HealthCheckStatusCode,
  HealthCheckStatusEntry,
} from '@/lib/hooks/types';

/**
 * Enumerates discrete systems (or system groups) represented in the response.
 */
type HealthCheckSystem = 'database' | 'cache' | 'queue' | 'chat' | 'memory';

/**
 * Maps each system to its expected nested structure.
 * chat includes embedded sub‑systems (cache, queue) to express grouped health.
 * memory includes embedded sub‑systems (db, vectorStore, graphStore, historyStore, authService) to express grouped health.
 */
type HealthSystemResponseTypeMap = {
  database: HealthCheckStatusEntry<never>;
  chat: HealthCheckStatusEntry<'cache' | 'queue' | 'tools'>;
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
      ? 'healthy'
      : determineHealthStatus(details) === 'warning'
        ? 'warning'
        : 'error'
    : 'error';

  return {
    status,
    db: { status: details?.system_db_available ? 'healthy' : 'error' },
    vectorStore: { status: details?.vector_store_available ? 'healthy' : 'error' },
    graphStore: { status: details?.graph_store_available ? 'healthy' : 'error' },
    historyStore: { status: details?.history_store_available ? 'healthy' : 'error' },
    authService: { status: details?.auth_service?.healthy ? 'healthy' : 'error' },
  };
}

/**
 * Checks memory system health by calling the Mem0 health check endpoint
 * Returns granular subsystem health information
 *
 * Caching behavior:
 * - Returns cached responses for all status types (ok, warning, error)
 * - Uses different TTLs based on status:
 *   - ok: 60 seconds (default)
 *   - warning: 30 seconds (default)
 *   - error: 10 seconds (default)
 * - This prevents cascading failures during outages while still allowing
 *   relatively quick recovery detection
 */
async function checkMemoryHealth(): Promise<MemoryHealthCheckResponse> {
  const cache = await getMemoryHealthCache();
  const cached = cache.get();

  // Return cached response if available, regardless of status
  // The cache TTL is status-dependent, so errors/warnings expire faster
  if (cached) {
    return cached;
  }

  try {
    const memoryClient = await memoryClientFactory<ExtendedMemoryClient>({
      impersonation: await fromRequest(),
    });
    const healthResponse = await memoryClient.healthCheck({
      strict: false,
      verbose: 1,
    });

    // Cache the raw mem0 response and return it directly
    try {
      cache.set(healthResponse);
    } catch { }
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
          jwks_url: '',
        },
        errors: [],
      },
    };
    try {
      const cache = await getMemoryHealthCache();
      cache.set(fallback);
    } catch { }
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
                jwks_url: '',
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

  const chatHealth = await Promise.race([
    checkChatHealth(),
    new Promise<HealthCheckStatusEntry<'cache' | 'queue' | 'tools'>>((resolve) =>
      setTimeout(
        () =>
          resolve({
            status: 'error',
            tools: { status: 'error' },
            cache: { status: 'error' },
            queue: { status: 'error' },
          }),
        90 * 1000,
      ),
    ),
  ]);

  const healthCheckResponse: HealthCheckResponse = {
    server: env('NEXT_PUBLIC_HOSTNAME') ?? 'unknown',
    database: databaseStatus,
    chat: chatHealth,
    memory: transformMemoryResponse(memoryHealth),
  };

  return NextResponse.json(healthCheckResponse, { status: 200 });
});
