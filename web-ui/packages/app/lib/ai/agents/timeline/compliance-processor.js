import { log } from '@compliance-theater/logger';
import { ComplianceRating } from './types';
import TimelineAgentFactory from './agent';
export class ComplianceTimelineProcessor {
    agent;
    currentSummary = '';
    constructor(agent) {
        this.agent = agent;
    }
    async processCaseDocument(caseFileId) {
        this.agent.addDocuments([caseFileId]);
        const result = await this.agent.processNextDocument();
        if (!result) {
            throw new Error(`Failed to process case file ${caseFileId}`);
        }
        return this.generateComplianceSummary();
    }
    generateComplianceSummary() {
        const summary = this.agent.generateSummary();
        const actions = summary.sequentialActions;
        let output = '';
        output += 'Overview (Global Metadata):\n\n';
        output += `Requested Record: ${this.extractRequestedRecord()}\n`;
        output += `Progress Status: ${this.calculateProgressStatus(summary)}\n`;
        output += `Overall Compliance: ${this.calculateOverallCompliance(summary)}\n`;
        output += `Executive Summary: ${this.generateExecutiveSummary(summary)}\n`;
        output += `Records Processed: ${this.getProcessedRecordsList(summary)}\n`;
        output += `Records Remaining: ${this.getRemainingRecordsList(summary)}\n`;
        output += `Next record to process: ${this.getNextRecordToProcess(summary)}\n\n`;
        output += 'Sequential Actions (Numbered Steps):\n\n';
        actions.forEach((action, index) => {
            const stepNumber = index + 1;
            output += `${stepNumber}. Case File ID: ${action.documentId}\n`;
            output += `Date of Communication: ${action.date}\n`;
            output += `Relevant Actor: ${this.extractRelevantActor(action)}\n`;
            output += `Identified Action/Inaction: ${this.extractIdentifiedAction(action)}\n`;
            output += `Relevant Action: ${this.extractRelevantAction(action)}\n`;
            output += `Embedded Metadata:\n`;
            output += `  Key Findings: ${this.extractKeyFindings(action)}\n`;
            output += `  Violations & Challenges: ${this.extractViolations(action)}\n`;
            output += `  Current Context: ${this.extractCurrentContext(action)}\n\n`;
        });
        this.currentSummary = output;
        return output;
    }
    extractRequestedRecord() {
        return 'Mandated reporting disclosure regarding incident involving student';
    }
    calculateProgressStatus(summary) {
        const processed = summary.globalMetadata.processedDocuments;
        const total = summary.globalMetadata.totalDocuments;
        const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
        return `${percentage}% complete. ${processed} of ${total} documents processed.`;
    }
    calculateOverallCompliance(summary) {
        const rating = summary.complianceRatings.overall;
        const issueCount = summary.criticalIssues.length;
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
        score -= issueCount * 10;
        score = Math.max(-100, Math.min(100, score));
        let description = '';
        if (score >= 80) {
            description = 'Full compliance with all obligations';
        }
        else if (score >= 50) {
            description = 'Substantial compliance with minor issues';
        }
        else if (score >= 0) {
            description = 'Partial compliance with significant concerns';
        }
        else {
            description = 'Non-compliance with potential obstruction';
        }
        return `${score} (${description})`;
    }
    generateExecutiveSummary(summary) {
        const criticalIssues = summary.criticalIssues;
        const actionCount = summary.sequentialActions.length;
        let execSummary = `Timeline analysis of ${actionCount} communications reveals `;
        if (criticalIssues.length === 0) {
            execSummary +=
                'generally compliant response pattern with no critical violations identified.';
        }
        else {
            execSummary += `${criticalIssues.length} critical compliance issues including: `;
            execSummary += criticalIssues.slice(0, 2).join('; ');
            if (criticalIssues.length > 2) {
                execSummary += '; and other concerns.';
            }
        }
        return execSummary;
    }
    getProcessedRecordsList(summary) {
        return summary.sequentialActions
            .map((action) => action.documentId)
            .join(', ');
    }
    getRemainingRecordsList(summary) {
        const remainingCount = summary.globalMetadata.totalDocuments -
            summary.globalMetadata.processedDocuments;
        if (remainingCount === 0) {
            return 'None';
        }
        return `${remainingCount} documents remaining`;
    }
    getNextRecordToProcess(summary) {
        const remaining = this.getRemainingRecordsList(summary);
        return remaining === 'None' ? 'None' : 'Next available document';
    }
    extractRelevantActor(action) {
        return action.summary.includes('parent')
            ? "Sean O'Brien (citizen/parent)"
            : action.summary.includes('school') ||
                action.summary.includes('authority')
                ? 'School Authority'
                : 'Unknown Actor';
    }
    extractIdentifiedAction(action) {
        if (action.actionTaken) {
            return action.actionTaken;
        }
        if (action.summary.toLowerCase().includes('request')) {
            return 'Submitted formal request for information';
        }
        else if (action.summary.toLowerCase().includes('follow-up')) {
            return 'Followed up on previous communication';
        }
        else if (action.summary.toLowerCase().includes('response')) {
            return 'Provided response to inquiry';
        }
        return action.summary;
    }
    extractRelevantAction(action) {
        if (action.verbatimStatements && action.verbatimStatements.length > 0) {
            return action.verbatimStatements
                .slice(0, 2)
                .map((stmt) => `"${stmt}"`)
                .join(' ');
        }
        return 'No verbatim statements captured';
    }
    extractKeyFindings(action) {
        const findings = [];
        if (action.complianceNotes && action.complianceNotes.length > 0) {
            findings.push(...action.complianceNotes);
        }
        if (findings.length === 0) {
            findings.push('Standard communication in sequence');
        }
        return findings.join('; ');
    }
    extractViolations(action) {
        const violations = [];
        if (action.summary.toLowerCase().includes('delay')) {
            violations.push('Potential timeline violation');
        }
        if (action.summary.toLowerCase().includes('incomplete')) {
            violations.push('Incomplete response provided');
        }
        if (action.summary.toLowerCase().includes('denial') ||
            action.summary.toLowerCase().includes('refuse')) {
            violations.push('Improper denial of request');
        }
        return violations.length > 0
            ? violations.join('; ')
            : 'No violations identified';
    }
    extractCurrentContext(action) {
        let context = '';
        if (action.actionRequired) {
            context = `Action required: ${action.actionRequired}`;
        }
        else {
            context = 'Request remains pending full response';
        }
        const nextAction = this.determineNextExpectedAction(action);
        if (nextAction) {
            context += `. Next expected action: ${nextAction}`;
        }
        return context;
    }
    determineNextExpectedAction(action) {
        if (action.summary.toLowerCase().includes('request')) {
            return 'Authority acknowledgment within 5 business days';
        }
        else if (action.summary.toLowerCase().includes('follow-up')) {
            return 'Substantive response addressing all concerns';
        }
        else if (action.summary.toLowerCase().includes('partial')) {
            return 'Complete response with remaining information';
        }
        return '';
    }
    getCurrentSummary() {
        return this.currentSummary;
    }
    async processNextRecord() {
        const result = await this.agent.processNextDocument();
        if (!result) {
            return 'No more records to process';
        }
        return this.generateComplianceSummary();
    }
}
export function createComplianceProcessor(propertyId) {
    const agent = TimelineAgentFactory({ propertyId });
    return new ComplianceTimelineProcessor(agent);
}
export async function demonstrateComplianceProcessing() {
    log((l) => l.info('=== Compliance Timeline Processing Demonstration ==='));
    const processor = createComplianceProcessor('initial-ferpa-request-325');
    await processor['agent'].initialize();
    processor['agent'].addDocuments(['325', '308', '307']);
    let summary = await processor.processCaseDocument('325');
    summary = await processor.processCaseDocument('308');
    log((l) => l.info('\nProcessing next record (307)...'));
    summary = await processor.processCaseDocument('307');
    log((l) => l.info('\n=== Final Compliance Summary ==='));
    log((l) => l.info(summary));
    return summary;
}
//# sourceMappingURL=compliance-processor.js.map