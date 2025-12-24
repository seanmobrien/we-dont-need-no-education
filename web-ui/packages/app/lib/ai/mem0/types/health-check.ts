/**
 * Memory Health Check Types
 * ========================
 *
 * Type definitions for the Mem0 API health check response structure.
 * Based on the sample JSON structure from the Mem0 stats/health-check endpoint (base path configurable).
 */

/**
 * Mem0 version and build information
 */
export interface Mem0Info {
  version: string;
  build_type: string;
  build_info: string;
  verbose: {
    mem0_version: string;
    build_details: {
      type: string;
      info: string;
      path: string;
    };
    build_stamp: string;
  };
}

/**
 * Authentication service health status
 */
export interface AuthServiceHealth {
  healthy: boolean;
  enabled: boolean;
  server_url: string;
  realm: string;
  client_id: string;
  auth_url: string;
  token_url: string;
  jwks_url: string;
}

/**
 * Detailed health check information
 */
export interface HealthDetails {
  client_active: boolean;
  system_db_available: boolean;
  vector_enabled: boolean;
  vector_store_available: boolean;
  graph_enabled: boolean;
  graph_store_available: boolean;
  history_store_available: boolean;
  auth_service: AuthServiceHealth;
  errors: string[];
}

/**
 * Complete health check response structure
 */
export interface MemoryHealthCheckResponse {
  status: string;
  message: string;
  timestamp: string;
  service: string;
  mem0: Mem0Info;
  details: HealthDetails;
}

/**
 * Parameters for health check endpoint
 */
export interface HealthCheckParams {
  strict?: boolean;
  verbose?: 0 | 1;
}

/**
 * Simplified health status for UI components
 */
export type HealthStatus = 'healthy' | 'warning' | 'error';
