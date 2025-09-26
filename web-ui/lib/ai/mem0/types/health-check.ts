/**
 * Memory Health Check Types
 * ========================
 * 
 * Type definitions for the Mem0 API health check response structure.
 * Based on the sample JSON structure from /api/v1/stats/health-check endpoint.
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
  jkws_url: string;
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

/**
 * Determines the overall health status based on the health check details
 */
export function determineHealthStatus(details: HealthDetails): HealthStatus {
  // Error if client is not active
  if (!details.client_active) {
    return 'error';
  }

  // Check if any critical services are unavailable
  const criticalServices = [
    details.system_db_available,
    details.vector_store_available,
    details.graph_store_available,
    details.history_store_available,
    details.auth_service.healthy,
  ];

  const unavailableServices = criticalServices.filter(service => !service);
  
  // Warning if one or more services are unavailable
  if (unavailableServices.length > 0) {
    return 'warning';
  }

  // Healthy if all services are available
  return 'healthy';
}

/**
 * Get refresh interval based on health status
 */
export function getRefreshInterval(status: HealthStatus): number {
  switch (status) {
    case 'healthy':
      return 3 * 60 * 1000; // 3 minutes
    case 'warning':
      return 30 * 1000; // 30 seconds
    case 'error':
      return 5 * 1000; // 5 seconds
    default:
      return 30 * 1000; // Default to 30 seconds
  }
}