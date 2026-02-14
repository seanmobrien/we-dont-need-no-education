import { log, LoggedError } from '@compliance-theater/logger';
export const mcpToolsMetricsRegistry = {
    exportAllMetrics: () => {
        return {
            amendment: {
                counters: {
                    total_operations: 'ai_tool_amend_case_record_total',
                    errors: 'ai_tool_amend_case_record_errors_total',
                },
                histograms: {
                    duration: 'ai_tool_amend_case_record_duration_ms',
                    records_count: 'ai_tool_amendment_records_count',
                },
                description: 'Metrics for case record amendment operations',
            },
            caseFileDocument: {
                counters: {
                    total_operations: 'ai_tool_get_case_file_document_total',
                    errors: 'ai_tool_get_case_file_document_errors_total',
                    preprocessing_operations: 'ai_tool_case_file_preprocessing_total',
                },
                histograms: {
                    duration: 'ai_tool_get_case_file_document_duration_ms',
                    document_size: 'ai_tool_case_file_document_size_bytes',
                    preprocessing_duration: 'ai_tool_case_file_preprocessing_duration_ms',
                },
                description: 'Metrics for case file document retrieval and preprocessing',
            },
            search: {
                counters: {
                    case_file_operations: 'ai_tool_search_case_file_total',
                    case_file_errors: 'ai_tool_search_case_file_errors_total',
                    policy_store_operations: 'ai_tool_search_policy_store_total',
                    policy_store_errors: 'ai_tool_search_policy_store_errors_total',
                },
                histograms: {
                    case_file_duration: 'ai_tool_search_case_file_duration_ms',
                    case_file_results: 'ai_tool_search_case_file_results_count',
                    policy_store_duration: 'ai_tool_search_policy_store_duration_ms',
                    policy_store_results: 'ai_tool_search_policy_store_results_count',
                },
                description: 'Metrics for search operations across case files and policy stores',
            },
        };
    },
    startPeriodicMetricsUpdate: (intervalMs = 30000) => {
        const updateInterval = setInterval(() => {
            try {
            }
            catch (error) {
                LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'mcpToolsMetricsRegistry.startPeriodicMetricsUpdate',
                });
            }
        }, intervalMs);
        return () => {
            clearInterval(updateInterval);
            log((l) => l.info('Stopped periodic metrics updates for MCP tools'));
        };
    },
    getMetricsSummary: () => {
        const metrics = mcpToolsMetricsRegistry.exportAllMetrics();
        let totalCounters = 0;
        let totalHistograms = 0;
        let totalGauges = 0;
        Object.values(metrics).forEach((toolMetrics) => {
            totalCounters += Object.keys(toolMetrics.counters || {}).length;
            totalHistograms += Object.keys(toolMetrics.histograms || {}).length;
            totalGauges += Object.keys(toolMetrics.gauges || {}).length;
        });
        return {
            totalTools: Object.keys(metrics).length,
            totalCounters,
            totalHistograms,
            totalGauges,
            totalMetrics: totalCounters + totalHistograms + totalGauges,
            tools: Object.keys(metrics),
            lastUpdated: new Date().toISOString(),
        };
    },
    validateMetrics: () => {
        const validation = {
            valid: true,
            errors: [],
            warnings: [],
            validatedAt: new Date().toISOString(),
        };
        try {
            const metrics = mcpToolsMetricsRegistry.exportAllMetrics();
            Object.entries(metrics).forEach(([toolName, toolMetrics]) => {
                const allMetricNames = [
                    ...Object.values(toolMetrics.counters || {}),
                    ...Object.values(toolMetrics.histograms || {}),
                    ...Object.values(toolMetrics.gauges || {}),
                ];
                allMetricNames.forEach((metricName) => {
                    if (typeof metricName !== 'string') {
                        validation.errors.push(`Invalid metric name type in ${toolName}: ${metricName}`);
                        validation.valid = false;
                    }
                    else if (!metricName.startsWith('ai_tool_')) {
                        validation.warnings.push(`Metric ${metricName} in ${toolName} doesn't follow naming convention`);
                    }
                });
            });
        }
        catch (error) {
            validation.errors.push(`Validation failed: ${error}`);
            validation.valid = false;
        }
        return validation;
    },
};
export const createMcpToolAttributes = (toolName, operation, additionalAttributes = {}) => {
    return {
        tool_name: toolName,
        operation_type: operation,
        service_name: 'WebUi',
        service_namespace: 'ObApps.ComplianceTheatre',
        ...additionalAttributes,
    };
};
export const categorizeMcpToolError = (error) => {
    if (typeof error === 'string') {
        if (error.includes('not found'))
            return 'not_found';
        if (error.includes('permission'))
            return 'permission_denied';
        if (error.includes('timeout'))
            return 'timeout';
        if (error.includes('validation'))
            return 'validation_error';
        return 'string_error';
    }
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('not found'))
            return 'not_found';
        if (message.includes('permission'))
            return 'permission_denied';
        if (message.includes('timeout'))
            return 'timeout';
        if (message.includes('validation'))
            return 'validation_error';
        if (message.includes('network'))
            return 'network_error';
        if (message.includes('database'))
            return 'database_error';
        return 'runtime_error';
    }
    return 'unknown_error';
};
//# sourceMappingURL=mcpToolsMetrics.js.map