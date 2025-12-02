import type { HealthDetails, HealthStatus } from '../types/health-check';

/**
 * Determines the overall health status based on the health check details
 */
export const determineHealthStatus = (details: HealthDetails): HealthStatus => {
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

  const unavailableServices = criticalServices.filter((service) => !service);

  // Warning if one or more services are unavailable
  if (unavailableServices.length > 0) {
    return 'warning';
  }

  // Healthy if all services are available
  return 'healthy';
}


