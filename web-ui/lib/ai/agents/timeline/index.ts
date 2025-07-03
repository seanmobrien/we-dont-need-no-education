/**
 * Timeline Agent - Comprehensive compliance timeline processing for data request cases
 *
 * This module provides functionality for processing sequences of case documents
 * to generate detailed, compliance-focused timeline summaries for data request cases
 * such as FERPA and MNGDPA requests.
 *
 * Key Components:
 * - TimelineAgent: Core agent for document processing and timeline management
 * - ComplianceTimelineProcessor: Specialized processor for compliance analysis
 * - Types: Comprehensive type definitions for timeline data structures
 *
 * @example
 * ```typescript
 * import { TimelineAgentFactory, createComplianceProcessor } from './timeline';
 *
 * // Basic usage
 * const agent = TimelineAgentFactory({ initialDocumentId: 'doc-001' });
 * await agent.initialize();
 * await agent.processNextDocument();
 * const summary = agent.generateSummary();
 *
 * // Compliance processing
 * const processor = createComplianceProcessor('ferpa-request-001');
 * const complianceSummary = await processor.processCaseDocument('doc-001');
 * ```
 */

// Core agent exports
export { default as TimelineAgentFactory, TimelineAgent } from './agent';

// Compliance processor exports
export {
  ComplianceTimelineProcessor,
  createComplianceProcessor,
  demonstrateComplianceProcessing,
} from './compliance-processor';

// Type exports
export type {
  TimelineAgentProps,
  DocumentMetadata,
  TimelineEntry,
  GlobalMetadata,
  ComplianceRatings,
  TimelineSummary,
  ProcessingResult,
  TimelineAgentState,
  SerializedTimelineAgent,
} from './types';

export { ComplianceRating } from './types';

// Example and demonstration exports
export {
  timelineAgentExample,
  timelineAgentWithAdditionalDocuments,
  timelineAgentResetExample,
  ferpaComplianceExample,
} from './example';

// Import for internal use
import TimelineAgentFactory from './agent';
import { createComplianceProcessor } from './compliance-processor';

/**
 * Quick start function for common use cases
 */
export async function quickStartTimelineAgent(options: {
  initialDocumentId: string;
  additionalDocuments?: string[];
  processAllDocuments?: boolean;
}) {
  const agent = TimelineAgentFactory({
    initialDocumentId: options.initialDocumentId,
  });

  await agent.initialize();

  if (options.additionalDocuments) {
    agent.addDocuments(options.additionalDocuments);
  }

  if (options.processAllDocuments) {
    while (agent.hasMoreDocuments()) {
      await agent.processNextDocument();
    }
  }

  return {
    agent,
    summary: agent.generateSummary(),
    counts: agent.getDocumentCounts(),
  };
}

/**
 * Quick start function for compliance processing
 */
export async function quickStartComplianceProcessing(options: {
  initialDocumentId: string;
  case_file_ids: string[];
}) {
  const processor = createComplianceProcessor(options.initialDocumentId);

  // Initialize the underlying agent
  await processor['agent'].initialize();

  // Process each case file
  let currentSummary = '';
  for (const case_file_id of options.case_file_ids) {
    currentSummary = await processor.processCaseDocument(case_file_id);
  }

  return {
    processor,
    finalSummary: currentSummary,
    agent: processor['agent'],
  };
}
