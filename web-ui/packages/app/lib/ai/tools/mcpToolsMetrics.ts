/**
 * @module mcpToolsMetrics
 *
 * Centralized metrics export and management for all MCP (Model Context Protocol) tools.
 * Provides comprehensive OpenTelemetry metrics for AI tool usage, performance, and observability.
 */

import { log, LoggedError } from '@compliance-theater/logger';

/**
 * Type definitions for MCP tool metrics
 */
interface ToolMetrics {
  counters?: Record<string, string>;
  histograms?: Record<string, string>;
  gauges?: Record<string, string>;
  description: string;
}

interface MetricsRegistry {
  [toolName: string]: ToolMetrics;
}

/**
 * MCP Tools Metrics Registry
 *
 * Provides a centralized way to export all MCP tool metrics for observability backends
 * like Prometheus, DataDog, or other OpenTelemetry-compatible systems.
 */
export const mcpToolsMetricsRegistry = {
  /**
   * Export all MCP tool metrics for external observability systems
   *
   * @returns Object containing all MCP tool metric names and metadata
   */
  exportAllMetrics: (): MetricsRegistry => {
    return {
      // Amendment Tool Metrics
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

      // Case File Document Retrieval Metrics
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
        description:
          'Metrics for case file document retrieval and preprocessing',
      },

      // Search Tools Metrics
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
        description:
          'Metrics for search operations across case files and policy stores',
      },
    };
  },

  /**
   * Start periodic metrics collection for gauges and other metrics that need regular updates
   *
   * @param intervalMs Interval in milliseconds for periodic updates (default: 30 seconds)
   * @returns Cleanup function to stop periodic updates
   */
  startPeriodicMetricsUpdate: (intervalMs: number = 30000) => {
    const updateInterval = setInterval(() => {
      try {
        // Add any periodic gauge updates here if needed in the future
        // For now, most MCP tool metrics are event-based (counters/histograms)
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'mcpToolsMetricsRegistry.startPeriodicMetricsUpdate',
        });
      }
    }, intervalMs);

    // Return cleanup function
    return () => {
      clearInterval(updateInterval);
      log((l) => l.info('Stopped periodic metrics updates for MCP tools'));
    };
  },

  /**
   * Get a summary of all available MCP tool metrics
   *
   * @returns Summary object with metric counts and categories
   */
  getMetricsSummary: () => {
    const metrics = mcpToolsMetricsRegistry.exportAllMetrics();

    let totalCounters = 0;
    let totalHistograms = 0;
    let totalGauges = 0;

    Object.values(metrics).forEach((toolMetrics: ToolMetrics) => {
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

  /**
   * Validate that all metrics are properly configured and accessible
   *
   * @returns Validation results for all MCP tool metrics
   */
  validateMetrics: () => {
    const validation = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
      validatedAt: new Date().toISOString(),
    };

    try {
      const metrics = mcpToolsMetricsRegistry.exportAllMetrics();

      // Basic validation - ensure all metric names are strings and follow naming conventions
      Object.entries(metrics).forEach(
        ([toolName, toolMetrics]: [string, ToolMetrics]) => {
          const allMetricNames = [
            ...Object.values(toolMetrics.counters || {}),
            ...Object.values(toolMetrics.histograms || {}),
            ...Object.values(toolMetrics.gauges || {}),
          ] as string[];

          allMetricNames.forEach((metricName) => {
            if (typeof metricName !== 'string') {
              validation.errors.push(
                `Invalid metric name type in ${toolName}: ${metricName}`
              );
              validation.valid = false;
            } else if (!metricName.startsWith('ai_tool_')) {
              validation.warnings.push(
                `Metric ${metricName} in ${toolName} doesn't follow naming convention`
              );
            }
          });
        }
      );
    } catch (error) {
      validation.errors.push(`Validation failed: ${error}`);
      validation.valid = false;
    }

    return validation;
  },
};

/**
 * Helper function to create standardized MCP tool metric attributes
 *
 * @param toolName Name of the MCP tool
 * @param operation Type of operation being performed
 * @param additionalAttributes Any additional attributes specific to the operation
 * @returns Standardized attributes object for OpenTelemetry metrics
 */
export const createMcpToolAttributes = (
  toolName: string,
  operation: string,
  additionalAttributes: Record<string, string | number | boolean> = {}
) => {
  return {
    tool_name: toolName,
    operation_type: operation,
    service_name: 'WebUi',
    service_namespace: 'ObApps.ComplianceTheatre',
    ...additionalAttributes,
  };
};

/**
 * Helper function for consistent error categorization across MCP tools
 *
 * @param error The error object or string
 * @returns Categorized error type for metrics
 */
export const categorizeMcpToolError = (error: unknown): string => {
  if (typeof error === 'string') {
    if (error.includes('not found')) return 'not_found';
    if (error.includes('permission')) return 'permission_denied';
    if (error.includes('timeout')) return 'timeout';
    if (error.includes('validation')) return 'validation_error';
    return 'string_error';
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('not found')) return 'not_found';
    if (message.includes('permission')) return 'permission_denied';
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('validation')) return 'validation_error';
    if (message.includes('network')) return 'network_error';
    if (message.includes('database')) return 'database_error';
    return 'runtime_error';
  }

  return 'unknown_error';
};
