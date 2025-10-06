/**
 * OpenTelemetry Metrics for Case File Document Operations
 *
 * These metrics provide comprehensive monitoring and observability for document
 * retrieval and processing operations. They enable performance tracking, error
 * analysis, and operational insights across the document processing pipeline.
 *
 * **Metric Categories:**
 * - **Counters**: Track operation counts, success/error rates, and preprocessing activities
 * - **Histograms**: Measure operation durations and document sizes for performance analysis
 * - **Attributes**: Include operation type, status, document counts, and error types
 *
 * **Usage in Monitoring:**
 * - Track system performance and identify bottlenecks
 * - Monitor error rates and failure patterns
 * - Analyze document processing costs and efficiency
 * - Alert on performance degradation or system issues
 */

import { appMeters } from '/lib/site-util/metrics';

// OpenTelemetry Metrics for GetCaseFileDocument Tool
export const getCaseFileDocumentCounter = appMeters.createCounter(
  'ai_tool_get_case_file_document_total',
  {
    description: 'Total number of case file document retrieval operations',
    unit: '1',
  },
);

export const getCaseFileDocumentDurationHistogram = appMeters.createHistogram(
  'ai_tool_get_case_file_document_duration_ms',
  {
    description: 'Duration of case file document retrieval operations',
    unit: 'ms',
  },
);

export const caseFileDocumentSizeHistogram = appMeters.createHistogram(
  'ai_tool_case_file_document_size_bytes',
  {
    description: 'Size of retrieved case file documents in bytes',
    unit: 'bytes',
  },
);

export const caseFileDocumentPreprocessingCounter = appMeters.createCounter(
  'ai_tool_case_file_preprocessing_total',
  {
    description: 'Total number of case file document preprocessing operations',
    unit: '1',
  },
);

export const caseFileDocumentPreprocessingDurationHistogram =
  appMeters.createHistogram('ai_tool_case_file_preprocessing_duration_ms', {
    description: 'Duration of case file document preprocessing operations',
    unit: 'ms',
  });

export const caseFileDocumentErrorCounter = appMeters.createCounter(
  'ai_tool_get_case_file_document_errors_total',
  {
    description: 'Total number of case file document retrieval errors',
    unit: '1',
  },
);
