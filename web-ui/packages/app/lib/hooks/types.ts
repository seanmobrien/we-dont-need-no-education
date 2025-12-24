import type { HealthStatus } from '@/lib/ai/mem0/types/health-check';

export type { HealthStatus } from '@/lib/ai/mem0/types/health-check';

/**
 * Narrow set of status codes surfaced by the health layer.
 * Keep deliberately small to simplify external automation.
 */
export type HealthCheckStatusCode = 'healthy' | 'warning' | 'error';

/**
 * Base shape for any status entry.
 */
export type HealthCheckStatusEntryBase = {
  /** Current coarse status value */
  status: HealthCheckStatusCode;
};

export type HealthCheckStatusEntry<K extends string = never> =
  HealthCheckStatusEntryBase & {
    [key in K]?: HealthCheckStatusEntryBase;
  };

/**
 * Memory health response structure from the /api/health endpoint
 *
 * @interface MemoryHealthResponse
 * @description Raw response structure returned by the health check API for memory services.
 * Each subsystem property is optional to handle cases where specific services are unavailable.
 *
 * @example
 * ```typescript
 * // Example API response
 * {
 *   status: 'ok',
 *   db: { status: 'ok' },
 *   vectorStore: { status: 'warning' },
 *   graphStore: { status: 'ok' },
 *   historyStore: { status: 'error' },
 *   authService: { status: 'ok' }
 * }
 * ```
 */
export type MemoryHealthResponse = {
  /** Overall memory system health status */
  status: HealthStatus;

  /** Database subsystem health status - optional as service may be unavailable */
  db?: { status: HealthStatus };

  /** Vector store subsystem health status - optional as service may be unavailable */
  vectorStore?: { status: HealthStatus };

  /** Graph store subsystem health status - optional as service may be unavailable */
  graphStore?: { status: HealthStatus };

  /** History store subsystem health status - optional as service may be unavailable */
  historyStore?: { status: HealthStatus };

  /** Authentication service health status - optional as service may be unavailable */
  authService?: { status: HealthStatus };
};

/**
 * Detailed memory subsystem status information with guaranteed status values
 *
 * @interface MemorySubsystemStatus
 * @description Normalized subsystem status structure where all properties are required.
 * Missing subsystems from the API response are defaulted to 'error' status to ensure
 * proper error indication in the UI.
 *
 * @example
 * ```typescript
 * const subsystems: MemorySubsystemStatus = {
 *   db: 'ok',
 *   vectorStore: 'warning',
 *   graphStore: 'ok',
 *   historyStore: 'error',
 *   authService: 'ok'
 * };
 * ```
 */
export type MemorySubsystemStatus = {
  /** Database connection and query execution status */
  db: HealthStatus;

  /** Vector embedding storage and retrieval status */
  vectorStore: HealthStatus;

  /** Knowledge graph storage and traversal status */
  graphStore: HealthStatus;

  /** Conversation history persistence status */
  historyStore: HealthStatus;

  /** Authentication service availability status */
  authService: HealthStatus;
};

/**
 * Complete health check response structure from the /api/health endpoint
 *
 * @interface HealthCheckResponse
 * @description Top-level health check response that may contain multiple service categories.
 * Currently focused on memory services, but extensible for database, chat, and other services.
 *
 * @example
 * ```typescript
 * const response: HealthCheckResponse = {
 *   memory: {
 *     status: 'ok',
 *     db: { status: 'ok' },
 *     vectorStore: { status: 'warning' }
 *   },
 *   database: { status: 'ok' },
 *   chat: { status: 'warning' }
 * };
 * ```
 */
export type HealthCheckResponse = {
  /** Memory service health details - primary focus of this hook */
  memory?: MemoryHealthResponse;

  /** General database service status - future extension point */
  database?: { status: HealthStatus };

  /** Chat service status - future extension point */
  chat?: {
    status: HealthStatus;
    cache?: { status: HealthStatus };
    queue?: { status: HealthStatus };
    tools?: { status: HealthStatus };
  };
};

/**
 * Processed chat health data with subsystem details
 */
export type ChatHealthData = {
  status: HealthStatus;
  subsystems?: {
    cache: HealthStatus;
    queue: HealthStatus;
    tools: HealthStatus;
  };
};

/**
 * Processed memory health data with normalized status and subsystem details
 *
 * @interface MemoryHealthData
 * @description Final data structure returned by the useMemoryHealth hook after processing
 * the raw API response.Converts API status codes to standard HealthStatus enum values
 * and ensures all subsystems have defined status values.
 *
 * @example
  * ```typescript
 * const healthData: MemoryHealthData = {
 *   status: 'healthy',
 *   subsystems: {
 *     db: 'ok',
 *     vectorStore: 'warning',
 *     graphStore: 'ok',
 *     historyStore: 'error',
 *     authService: 'ok'
 *   }
 * };
 * ```
  */
export type MemoryHealthData = {
  /** Overall health status using standardized HealthStatus enum */
  status: HealthStatus;

  /** Detailed status for each memory subsystem */
  subsystems: MemorySubsystemStatus;
};

/**
 * @typedef {Object} MemoryStatusHookResult
 * @property {HealthStatus} returns.healthStatus - Current overall health status
 * @property {MemorySubsystemStatus|undefined} subsystems - Individual subsystem statuses
 * @property {number} refreshInterval - Current refresh interval in milliseconds
 * @property {boolean} isLoading - True when initial data is being fetched
 * @property {boolean} isFetching - True when any fetch is in progress
 * @property {boolean} isError - True when query has encountered an error
 * @property {Error|null} error - Current error object if query failed
 * @property {MemoryHealthData|undefined} data - Full health data when available
 */
export type MemoryStatusHookResult = {
  /** Latest memory health data or undefined if not yet fetched */
  health: {
    memory: MemoryHealthData;
    chat: ChatHealthData;
    database: HealthStatus;
  };
  refreshInterval: number;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
};

/**
 * Database health response structure for the useDatabaseHealth hook
 */
export type DatabaseHealthResponse = {
  data: HealthStatus;
  error: Error | null;
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  healthStatus: HealthStatus;
  refreshInterval: number;
};
