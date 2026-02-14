export { default as TimelineAgentFactory, TimelineAgent } from './agent';
export { ComplianceTimelineProcessor, createComplianceProcessor, demonstrateComplianceProcessing, } from './compliance-processor';
export { ComplianceRating } from './types';
import TimelineAgentFactory from './agent';
import { createComplianceProcessor } from './compliance-processor';
export async function quickStartTimelineAgent(options) {
    const agent = TimelineAgentFactory({
        propertyId: options.callToActionId,
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
export async function quickStartComplianceProcessing(options) {
    const processor = createComplianceProcessor(options.initialDocumentId);
    await processor['agent'].initialize();
    let currentSummary = '';
    for (const caseFileId of options.caseFileIds) {
        currentSummary = await processor.processCaseDocument(caseFileId);
    }
    return {
        processor,
        finalSummary: currentSummary,
        agent: processor['agent'],
    };
}
//# sourceMappingURL=index.js.map