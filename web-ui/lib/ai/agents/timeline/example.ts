import TimelineAgentFactory, { TimelineAgent } from './agent';
import { ComplianceRating } from './types';

/**
 * Example usage of the TimelineAgent
 * Demonstrates how to create, initialize, and use the agent for processing
 * a sequence of case documents to generate a compliance-focused timeline summary.
 */

async function timelineAgentExample() {
  console.log('=== TimelineAgent Example ===');

  // 1. Create the agent with an initial document ID
  const agent: TimelineAgent = TimelineAgentFactory({
    initialDocumentId: 'initial-request-doc-001',
  });

  try {
    // 2. Initialize the agent - this loads the initial document and identifies related documents
    console.log('Initializing agent...');
    await agent.initialize();

    console.log('Agent initialized successfully');
    console.log('Document counts:', agent.getDocumentCounts());

    // 3. Process documents one by one in chronological order
    let processedCount = 0;
    while (agent.hasMoreDocuments()) {
      console.log(`\n--- Processing document ${processedCount + 1} ---`);

      const result = await agent.processNextDocument();
      if (result) {
        console.log(`Processed document: ${result.documentId}`);
        console.log(
          `Timeline entry created: ${result.timelineEntry?.summary || 'N/A'}`,
        );
        console.log(`Notes: ${result.notes?.length || 0} notes`);
        console.log(
          `Additional documents found: ${result.additionalDocuments?.length || 0}`,
        );

        if (result.verbatimStatements && result.verbatimStatements.length > 0) {
          console.log('Critical statements found:', result.verbatimStatements);
        }

        processedCount++;
      }

      // Show current document counts
      const counts = agent.getDocumentCounts();
      console.log(
        `Progress: ${counts.processed}/${counts.total} documents processed`,
      );

      // In a real application, you might want to pause here and wait for user input
      // or implement some other control flow
    }

    // 4. Generate the final timeline summary
    console.log('\n=== Generating Final Summary ===');
    const summary = agent.generateSummary();

    console.log('Timeline Summary Generated:');
    console.log('Case ID:', summary.globalMetadata.caseId);
    console.log('Case Type:', summary.globalMetadata.caseType);
    console.log('Request Date:', summary.globalMetadata.requestDate);
    console.log('Total Documents:', summary.globalMetadata.totalDocuments);
    console.log('Sequential Actions:', summary.sequentialActions.length);
    console.log('Critical Issues:', summary.criticalIssues.length);
    console.log(
      'Overall Compliance Rating:',
      summary.complianceRatings.overall,
    );

    // Display compliance ratings
    console.log('\n--- Compliance Ratings ---');
    Object.entries(summary.complianceRatings).forEach(([key, rating]) => {
      console.log(`${key}: ${rating}`);
    });

    // Display critical issues if any
    if (summary.criticalIssues.length > 0) {
      console.log('\n--- Critical Issues ---');
      summary.criticalIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }

    // Display recommendations if any
    if (summary.recommendations.length > 0) {
      console.log('\n--- Recommendations ---');
      summary.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    return summary;
  } catch (error) {
    console.error('Error during timeline processing:', error);
    throw error;
  }
}

/**
 * Example showing how to add documents during processing
 */
async function timelineAgentWithAdditionalDocuments() {
  console.log('\n=== TimelineAgent with Additional Documents Example ===');

  const agent = TimelineAgentFactory({
    initialDocumentId: 'ferpa-request-001',
  });

  await agent.initialize();

  // Process initial batch of documents
  let processedSome = 0;
  while (agent.hasMoreDocuments() && processedSome < 3) {
    await agent.processNextDocument();
    processedSome++;
  }

  console.log(
    'Processed initial batch, current counts:',
    agent.getDocumentCounts(),
  );

  // Add new documents that were discovered later
  console.log('Adding newly discovered documents...');
  agent.addDocuments([
    'follow-up-email-001',
    'clarification-request-002',
    'response-attachment-003',
  ]);

  console.log('After adding documents:', agent.getDocumentCounts());

  // Continue processing remaining documents
  while (agent.hasMoreDocuments()) {
    const result = await agent.processNextDocument();
    console.log(`Processed: ${result?.documentId}`);
  }

  const finalSummary = agent.generateSummary();
  console.log(
    'Final summary generated with',
    finalSummary.sequentialActions.length,
    'timeline entries',
  );

  return finalSummary;
}

/**
 * Example showing agent reset functionality
 */
async function timelineAgentResetExample() {
  console.log('\n=== TimelineAgent Reset Example ===');

  const agent = TimelineAgentFactory({
    initialDocumentId: 'test-doc-001',
  });

  // Initialize and process some documents
  await agent.initialize();
  console.log('Before reset:', agent.getDocumentCounts());

  // Reset the agent
  agent.reset();
  console.log('After reset:', agent.getDocumentCounts());

  // The agent can now be reused for a different case
  // Note: You would need to add new documents after reset
  agent.addDocuments(['new-case-doc-001', 'new-case-doc-002']);
  console.log('After adding new documents:', agent.getDocumentCounts());
}

// Export the examples for use in tests or demonstrations
export {
  timelineAgentExample,
  timelineAgentWithAdditionalDocuments,
  timelineAgentResetExample,
};

// Example of a typical FERPA compliance case workflow
export const ferpaComplianceExample = {
  caseId: 'FERPA-2024-001',
  initialDocumentId: 'student-records-request-001',
  expectedDocuments: [
    'initial-request-email',
    'identity-verification-form',
    'records-location-search',
    'partial-records-release',
    'clarification-request',
    'final-records-package',
    'delivery-confirmation',
  ],
  expectedCompliance: {
    timeliness: ComplianceRating.Good,
    completeness: ComplianceRating.Satisfactory,
    accuracy: ComplianceRating.Good,
    transparency: ComplianceRating.Good,
    overall: ComplianceRating.Good,
  },
};

// If this file is executed directly, run the examples
if (require.main === module) {
  (async () => {
    try {
      await timelineAgentExample();
      await timelineAgentWithAdditionalDocuments();
      await timelineAgentResetExample();
      console.log('\n=== All examples completed successfully ===');
    } catch (error) {
      console.error('Example execution failed:', error);
      process.exit(1);
    }
  })();
}
