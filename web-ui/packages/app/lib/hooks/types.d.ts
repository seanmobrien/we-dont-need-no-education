/**
 * Type definitions for health monitoring hooks
 * @module @/lib/hooks/types
 */

declare module '@/lib/hooks/types' {
  import type { HealthStatus } from '@/lib/ai/mem0/types/health-check';

  export type { HealthStatus } from '@/lib/ai/mem0/types/health-check';

  export type RawHealthStatus = 'ok' | 'warning' | 'error';

  /**
   * Memory health response structure from the /api/health endpoint.
   *
   * Raw response structure returned by the health check API for memory services.
   * Each subsystem property is optional to handle cases where specific services are unavailable.
   */
  export type MemoryHealthResponse = {
    status: HealthStatus;
    db?: { status: HealthStatus };
    vectorStore?: { status: HealthStatus };
    graphStore?: { status: HealthStatus };
    historyStore?: { status: HealthStatus };
    authService?: { status: HealthStatus };
  };

  /**
   * Detailed memory subsystem status information with guaranteed status values.
   *
   * Normalized subsystem status structure where all properties are required.
   * Missing subsystems from the API response are defaulted to 'error' status.
   */
  export type MemorySubsystemStatus = {
    db: HealthStatus;
    vectorStore: HealthStatus;
    graphStore: HealthStatus;
    historyStore: HealthStatus;
    authService: HealthStatus;
  };

  /**
   * Complete health check response structure from the /api/health endpoint.
   *
   * Top-level health check response that may contain multiple service categories.
   */
  export type HealthCheckResponse = {
    memory?: MemoryHealthResponse;
    database?: { status: string };
    chat?: { status: string };
  };

  /**
   * Processed memory health data with normalized status and subsystem details.
   *
   * Final data structure returned by the useMemoryHealth hook after processing
   * the raw API response.
   */
  export type MemoryHealthData = {
    status: HealthStatus;
    subsystems: MemorySubsystemStatus;
  };

  /**
   * Return type for memory health monitoring hooks.
   */
  export type MemoryStatusHookResult = {
    healthStatus: HealthStatus;
    subsystems: MemorySubsystemStatus | undefined;
    refreshInterval: number;
    isLoading: boolean;
    isFetching: boolean;
    isError: boolean;
    error: Error | null;
    data: MemoryHealthData | undefined;
  };

  /**
   * Database health response structure for the useDatabaseHealth hook.
   */
  export type DatabaseHealthResponse = {
    data: RawHealthStatus;
    error: Error | null;
    isError: boolean;
    isFetching: boolean;
    isLoading: boolean;
    healthStatus: RawHealthStatus;
    refreshInterval: number;
  };

  /**
   * Processed chat health data with subsystem details.
   */
  export type ChatHealthData = {
    status: RawHealthStatus;
    subsystems?: {
      cache: RawHealthStatus;
      queue: RawHealthStatus;
    };
  };

  /**
   * Return type for chat health monitoring hooks.
   */
  export type ChatHealthHookResponse = {
    data: ChatHealthData | undefined;
    error: Error | null;
    isError: boolean;
    isFetching: boolean;
    isLoading: boolean;
    healthStatus: RawHealthStatus;
    refreshInterval: number;
    subsystems?: {
      cache: RawHealthStatus;
      queue: RawHealthStatus;
    };
  };

  /**
   * Generic health check result structure.
   */
  export type HealthCheckResult = {
    status: string;
    [key: string]: unknown;
  };
}
