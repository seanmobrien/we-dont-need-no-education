import { appMeters } from '@/lib/site-util/metrics';
export const getCaseFileDocumentCounter = appMeters.createCounter('ai_tool_get_case_file_document_total', {
    description: 'Total number of case file document retrieval operations',
    unit: '1',
});
export const getCaseFileDocumentDurationHistogram = appMeters.createHistogram('ai_tool_get_case_file_document_duration_ms', {
    description: 'Duration of case file document retrieval operations',
    unit: 'ms',
});
export const caseFileDocumentSizeHistogram = appMeters.createHistogram('ai_tool_case_file_document_size_bytes', {
    description: 'Size of retrieved case file documents in bytes',
    unit: 'bytes',
});
export const caseFileDocumentPreprocessingCounter = appMeters.createCounter('ai_tool_case_file_preprocessing_total', {
    description: 'Total number of case file document preprocessing operations',
    unit: '1',
});
export const caseFileDocumentPreprocessingDurationHistogram = appMeters.createHistogram('ai_tool_case_file_preprocessing_duration_ms', {
    description: 'Duration of case file document preprocessing operations',
    unit: 'ms',
});
export const caseFileDocumentErrorCounter = appMeters.createCounter('ai_tool_get_case_file_document_errors_total', {
    description: 'Total number of case file document retrieval errors',
    unit: '1',
});
//# sourceMappingURL=metrics.js.map