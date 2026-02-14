export const determineHealthStatus = (details) => {
    if (!details.client_active) {
        return 'error';
    }
    const criticalServices = [
        details.system_db_available,
        details.vector_store_available,
        details.graph_store_available,
        details.history_store_available,
        details.auth_service.healthy,
    ];
    const unavailableServices = criticalServices.filter((service) => !service);
    if (unavailableServices.length > 0) {
        return 'warning';
    }
    return 'healthy';
};
//# sourceMappingURL=health-check.js.map