import { TimelineAgent } from './agent';
import { log } from '@compliance-theater/logger';
import { TimelineEntry, ComplianceRating, TimelineSummary } from './types';
import TimelineAgentFactory from './agent';

/**
 * Specialized compliance processor for FERPA/MNGDPA data request cases.
 * This processor implements the specific requirements outlined in the compliance script.
 */
export class ComplianceTimelineProcessor {
  private agent: TimelineAgent;
  private currentSummary: string = '';

  constructor(agent: TimelineAgent) {
    this.agent = agent;
  }

  /**
   * Process a single case document according to the compliance script requirements
   * @param caseFileId The ID of the case file to process
   * @returns The updated timeline summary
   */
  async processCaseDocument(caseFileId: string): Promise<string> {
    // Add the document to the agent if not already present
    this.agent.addDocuments([caseFileId]);

    // Process the document
    const result = await this.agent.processNextDocument();

    if (!result) {
      throw new Error(`Failed to process case file ${caseFileId}`);
    }

    // Generate the updated summary according to the script format
    return this.generateComplianceSummary();
  }

  /**
   * Generate a comprehensive compliance summary in the exact format specified by the script
   */
  private generateComplianceSummary(): string {
    const summary = this.agent.generateSummary();
    const actions = summary.sequentialActions;

    // Build the compliance summary according to the script format
    let output = '';

    // Overview (Global Metadata)
    output += 'Overview (Global Metadata):\n\n';
    output += `Requested Record: ${this.extractRequestedRecord()}\n`;
    output += `Progress Status: ${this.calculateProgressStatus(summary)}\n`;
    output += `Overall Compliance: ${this.calculateOverallCompliance(
      summary
    )}\n`;
    output += `Executive Summary: ${this.generateExecutiveSummary(summary)}\n`;
    output += `Records Processed: ${this.getProcessedRecordsList(summary)}\n`;
    output += `Records Remaining: ${this.getRemainingRecordsList(summary)}\n`;
    output += `Next record to process: ${this.getNextRecordToProcess(
      summary
    )}\n\n`;

    // Sequential Actions (Numbered Steps)
    output += 'Sequential Actions (Numbered Steps):\n\n';

    actions.forEach((action, index) => {
      const stepNumber = index + 1;
      output += `${stepNumber}. Case File ID: ${action.documentId}\n`;
      output += `Date of Communication: ${action.date}\n`;
      output += `Relevant Actor: ${this.extractRelevantActor(action)}\n`;
      output += `Identified Action/Inaction: ${this.extractIdentifiedAction(
        action
      )}\n`;
      output += `Relevant Action: ${this.extractRelevantAction(action)}\n`;
      output += `Embedded Metadata:\n`;
      output += `  Key Findings: ${this.extractKeyFindings(action)}\n`;
      output += `  Violations & Challenges: ${this.extractViolations(
        action
      )}\n`;
      output += `  Current Context: ${this.extractCurrentContext(action)}\n\n`;
    });

    this.currentSummary = output;
    return output;
  }

  private extractRequestedRecord(): string {
    // Extract the specific record or data that has been requested
    // This would be determined from the initial document analysis
    return 'Mandated reporting disclosure regarding incident involving student';
  }

  private calculateProgressStatus(summary: TimelineSummary): string {
    const processed = summary.globalMetadata.processedDocuments;
    const total = summary.globalMetadata.totalDocuments;
    const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;

    return `${percentage}% complete. ${processed} of ${total} documents processed.`;
  }

  private calculateOverallCompliance(summary: TimelineSummary): string {
    const rating = summary.complianceRatings.overall;
    const issueCount = summary.criticalIssues.length;

    // Convert rating to numeric score (-100 to 100)
    let score = 0;
    switch (rating) {
      case ComplianceRating.Excellent:
        score = 90;
        break;
      case ComplianceRating.Good:
        score = 70;
        break;
      case ComplianceRating.Satisfactory:
        score = 50;
        break;
      case ComplianceRating.Poor:
        score = -20;
        break;
      default:
        score = 0;
    }

    // Adjust score based on critical issues
    score -= issueCount * 10;
    score = Math.max(-100, Math.min(100, score));

    let description = '';
    if (score >= 80) {
      description = 'Full compliance with all obligations';
    } else if (score >= 50) {
      description = 'Substantial compliance with minor issues';
    } else if (score >= 0) {
      description = 'Partial compliance with significant concerns';
    } else {
      description = 'Non-compliance with potential obstruction';
    }

    return `${score} (${description})`;
  }

  private generateExecutiveSummary(summary: TimelineSummary): string {
    const criticalIssues = summary.criticalIssues;
    const actionCount = summary.sequentialActions.length;

    let execSummary = `Timeline analysis of ${actionCount} communications reveals `;

    if (criticalIssues.length === 0) {
      execSummary +=
        'generally compliant response pattern with no critical violations identified.';
    } else {
      execSummary += `${criticalIssues.length} critical compliance issues including: `;
      execSummary += criticalIssues.slice(0, 2).join('; ');
      if (criticalIssues.length > 2) {
        execSummary += '; and other concerns.';
      }
    }

    return execSummary;
  }

  private getProcessedRecordsList(summary: TimelineSummary): string {
    return summary.sequentialActions
      .map((action: TimelineEntry) => action.documentId)
      .join(', ');
  }

  private getRemainingRecordsList(summary: TimelineSummary): string {
    // This would need to be tracked by the agent
    const remainingCount =
      summary.globalMetadata.totalDocuments -
      summary.globalMetadata.processedDocuments;
    if (remainingCount === 0) {
      return 'None';
    }
    return `${remainingCount} documents remaining`;
  }

  private getNextRecordToProcess(summary: TimelineSummary): string {
    const remaining = this.getRemainingRecordsList(summary);
    return remaining === 'None' ? 'None' : 'Next available document';
  }

  private extractRelevantActor(action: TimelineEntry): string {
    // Extract actor information from the timeline entry
    return action.summary.includes('parent')
      ? "Sean O'Brien (citizen/parent)"
      : action.summary.includes('school') ||
        action.summary.includes('authority')
      ? 'School Authority'
      : 'Unknown Actor';
  }

  private extractIdentifiedAction(action: TimelineEntry): string {
    // Extract the specific action taken or not taken
    if (action.actionTaken) {
      return action.actionTaken;
    }

    // Infer from summary
    if (action.summary.toLowerCase().includes('request')) {
      return 'Submitted formal request for information';
    } else if (action.summary.toLowerCase().includes('follow-up')) {
      return 'Followed up on previous communication';
    } else if (action.summary.toLowerCase().includes('response')) {
      return 'Provided response to inquiry';
    }

    return action.summary;
  }

  private extractRelevantAction(action: TimelineEntry): string {
    // Extract verbatim statements from the document
    if (action.verbatimStatements && action.verbatimStatements.length > 0) {
      return action.verbatimStatements
        .slice(0, 2)
        .map((stmt) => `"${stmt}"`)
        .join(' ');
    }

    return 'No verbatim statements captured';
  }

  private extractKeyFindings(action: TimelineEntry): string {
    // Extract key findings from the action
    const findings = [];

    if (action.complianceNotes && action.complianceNotes.length > 0) {
      findings.push(...action.complianceNotes);
    }

    if (findings.length === 0) {
      findings.push('Standard communication in sequence');
    }

    return findings.join('; ');
  }

  private extractViolations(action: TimelineEntry): string {
    // Identify violations and challenges
    const violations = [];

    if (action.summary.toLowerCase().includes('delay')) {
      violations.push('Potential timeline violation');
    }

    if (action.summary.toLowerCase().includes('incomplete')) {
      violations.push('Incomplete response provided');
    }

    if (
      action.summary.toLowerCase().includes('denial') ||
      action.summary.toLowerCase().includes('refuse')
    ) {
      violations.push('Improper denial of request');
    }

    return violations.length > 0
      ? violations.join('; ')
      : 'No violations identified';
  }

  private extractCurrentContext(action: TimelineEntry): string {
    // Describe the state after this action and what should happen next
    let context = '';

    if (action.actionRequired) {
      context = `Action required: ${action.actionRequired}`;
    } else {
      context = 'Request remains pending full response';
    }

    // Add timeline expectations
    const nextAction = this.determineNextExpectedAction(action);
    if (nextAction) {
      context += `. Next expected action: ${nextAction}`;
    }

    return context;
  }

  private determineNextExpectedAction(action: TimelineEntry): string {
    // Determine what action should come next based on the current state
    if (action.summary.toLowerCase().includes('request')) {
      return 'Authority acknowledgment within 5 business days';
    } else if (action.summary.toLowerCase().includes('follow-up')) {
      return 'Substantive response addressing all concerns';
    } else if (action.summary.toLowerCase().includes('partial')) {
      return 'Complete response with remaining information';
    }

    return '';
  }

  /**
   * Get the current summary text
   */
  getCurrentSummary(): string {
    return this.currentSummary;
  }

  /**
   * Process the next document in the timeline as demonstrated in the script
   */
  async processNextRecord(): Promise<string> {
    const result = await this.agent.processNextDocument();

    if (!result) {
      return 'No more records to process';
    }

    return this.generateComplianceSummary();
  }
}

/**
 * Factory function to create a compliance processor
 */
export function createComplianceProcessor(
  propertyId: string
): ComplianceTimelineProcessor {
  const agent = TimelineAgentFactory({ propertyId });
  return new ComplianceTimelineProcessor(agent);
}

/**
 * Example usage demonstrating the script requirements
 */
export async function demonstrateComplianceProcessing() {
  log((l) => l.info('=== Compliance Timeline Processing Demonstration ==='));

  // Create a processor for the specific case mentioned in the script
  const processor = createComplianceProcessor('initial-ferpa-request-325');

  // Initialize the agent
  await processor['agent'].initialize();

  // Add the specific documents mentioned in the script
  processor['agent'].addDocuments(['325', '308', '307']);

  let summary = await processor.processCaseDocument('325');

  summary = await processor.processCaseDocument('308');

  log((l) => l.info('\nProcessing next record (307)...'));
  summary = await processor.processCaseDocument('307');

  log((l) => l.info('\n=== Final Compliance Summary ==='));
  log((l) => l.info(summary));

  return summary;
}
