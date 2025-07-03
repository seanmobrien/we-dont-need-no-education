# TimelineAgent - Compliance Timeline Processing

A sophisticated agent system for processing sequences of case documents to generate detailed, compliance-focused timeline summaries for data request cases (e.g., FERPA/MNGDPA).

## Overview

The TimelineAgent system provides comprehensive functionality for:

- **Document Processing**: Load and analyze case documents in chronological order
- **Timeline Management**: Track pending and processed documents with detailed metadata
- **Compliance Analysis**: Generate compliance ratings and identify critical issues
- **Verbatim Recording**: Preserve exact statements and communications
- **Structured Summaries**: Output detailed summaries with global metadata and sequential actions

## Key Components

### TimelineAgent

The core agent responsible for document processing and timeline management.

### ComplianceTimelineProcessor

Specialized processor that implements specific compliance requirements for FERPA/MNGDPA cases, generating summaries in the exact format required for compliance auditing.

### Types

Comprehensive type definitions ensuring type safety across all timeline operations.

## Quick Start

### Basic Usage

```typescript
import { TimelineAgentFactory } from './timeline';

// Create and initialize the agent
const agent = TimelineAgentFactory({
  initialDocumentId: 'ferpa-request-001',
});

await agent.initialize();

// Add additional documents
agent.addDocuments([
  'follow-up-email-001',
  'response-letter-002',
  'clarification-request-003',
]);

// Process documents one by one
while (agent.hasMoreDocuments()) {
  const result = await agent.processNextDocument();
  console.log(`Processed: ${result?.documentId}`);
}

// Generate final timeline summary
const summary = agent.generateSummary();
console.log('Timeline completed:', summary);
```

### Compliance Processing

```typescript
import { createComplianceProcessor } from './timeline';

// Create a compliance processor
const processor = createComplianceProcessor('initial-request-doc');

// Process case documents in sequence
let summary = await processor.processCaseDocument('case-file-001');
summary = await processor.processCaseDocument('case-file-002');
summary = await processor.processCaseDocument('case-file-003');

// The summary follows the exact compliance format
console.log(summary);
```

### Quick Start Functions

```typescript
import {
  quickStartTimelineAgent,
  quickStartComplianceProcessing,
} from './timeline';

// Process all documents automatically
const result = await quickStartTimelineAgent({
  initialDocumentId: 'doc-001',
  additionalDocuments: ['doc-002', 'doc-003'],
  processAllDocuments: true,
});

// Compliance processing with multiple case files
const complianceResult = await quickStartComplianceProcessing({
  initialDocumentId: 'ferpa-request',
  case_file_ids: ['325', '308', '307'],
});
```

## Detailed API

### TimelineAgent Class

#### Constructor

```typescript
const agent = TimelineAgentFactory({
  initialDocumentId?: string
});
```

#### Core Methods

**initialize(): Promise<void>**

- Initializes the agent by loading the initial document
- Extracts case metadata and identifies related documents
- Must be called before processing documents

**processNextDocument(): Promise<ProcessingResult | null>**

- Processes the next document in chronological order
- Returns processing result or null if no more documents
- Updates timeline state with new information

**addDocuments(documentIds: string[]): void**

- Adds new documents to the processing queue
- Prevents duplicate additions
- Updates document counts

**generateSummary(): TimelineSummary**

- Generates comprehensive timeline summary
- Updates compliance ratings
- Returns structured summary with all metadata

**hasMoreDocuments(): boolean**

- Checks if there are more documents to process

**getDocumentCounts(): { pending: number; processed: number; total: number }**

- Returns current document processing status

**reset(): void**

- Resets agent to initial state
- Clears all documents and timeline data

### ComplianceTimelineProcessor Class

#### Constructor

```typescript
const processor = new ComplianceTimelineProcessor(agent);
// Or use factory function
const processor = createComplianceProcessor(initialDocumentId);
```

#### Key Methods

**processCaseDocument(case_file_id: string): Promise<string>**

- Processes a single case document
- Returns updated compliance summary in required format
- Handles all compliance-specific analysis

**processNextRecord(): Promise<string>**

- Processes the next record in the timeline
- Returns formatted compliance summary

**getCurrentSummary(): string**

- Returns the current compliance summary text

## Data Structures

### TimelineSummary

```typescript
{
  globalMetadata: {
    caseId: string;
    caseType: 'FERPA' | 'MNGDPA' | 'Other';
    requestType: string;
    requestDate: string;
    requesterName: string;
    institutionName: string;
    complianceDeadline: string;
    currentStatus: string;
    totalDocuments: number;
    processedDocuments: number;
  };
  sequentialActions: TimelineEntry[];
  complianceRatings: {
    timeliness: ComplianceRating;
    completeness: ComplianceRating;
    accuracy: ComplianceRating;
    transparency: ComplianceRating;
    overall: ComplianceRating;
  };
  criticalIssues: string[];
  recommendations: string[];
  lastUpdated: string;
}
```

### TimelineEntry

```typescript
{
  documentId: string;
  date: string;
  summary: string;
  verbatimStatements?: string[];
  complianceNotes?: string[];
  actionTaken?: string;
  actionRequired?: string;
}
```

### ComplianceRating

```typescript
enum ComplianceRating {
  Unknown = 'Unknown',
  Poor = 'Poor',
  Satisfactory = 'Satisfactory',
  Good = 'Good',
  Excellent = 'Excellent',
}
```

## Compliance Summary Format

The ComplianceTimelineProcessor generates summaries in this exact format:

```
Overview (Global Metadata):

Requested Record: [Description of what was requested]
Progress Status: [Percentage complete and milestone information]
Overall Compliance: [Numeric score with description]
Executive Summary: [Concise summary of key facts and compliance status]
Records Processed: [Comma-delimited list of processed document IDs]
Records Remaining: [Comma-delimited list of remaining document IDs]
Next record to process: [ID of next document to process]

Sequential Actions (Numbered Steps):

1. Case File ID: [Document ID]
Date of Communication: [ISO date]
Relevant Actor: [Person/role responsible for action]
Identified Action/Inaction: [Precise description of what occurred]
Relevant Action: [Verbatim excerpts supporting the identified action]
Embedded Metadata:
  Key Findings: [Important discoveries, statute references, etc.]
  Violations & Challenges: [Compliance violations and mitigating actions]
  Current Context: [State after action and expected next steps]

[Additional numbered steps...]
```

## Advanced Usage

### Custom Document Processing

```typescript
// Extend the agent for custom processing logic
class CustomTimelineAgent extends TimelineAgent {
  async #processDocument(documentId: string, document: string) {
    // Custom processing logic
    const customResult = await this.customAnalysis(document);
    return {
      documentId,
      timelineEntry: customResult,
      // ... other fields
    };
  }
}
```

### Error Handling

```typescript
try {
  await agent.initialize();
  while (agent.hasMoreDocuments()) {
    const result = await agent.processNextDocument();
    if (result?.notes && result.notes.length > 0) {
      console.warn('Processing notes:', result.notes);
    }
  }
} catch (error) {
  console.error('Timeline processing failed:', error);
  // Handle error appropriately
}
```

### Resumable Processing

```typescript
// Process some documents
await agent.processNextDocument();
await agent.processNextDocument();

// Save state
const checkpoint = agent.generateSummary();

// Later, resume processing
if (agent.hasMoreDocuments()) {
  await agent.processNextDocument();
}
```

## Integration Examples

### FERPA Case Processing

```typescript
const agent = TimelineAgentFactory({
  initialDocumentId: 'ferpa-student-records-request',
});

await agent.initialize();

// Add typical FERPA documents
agent.addDocuments([
  'identity-verification-form',
  'records-search-results',
  'partial-records-release',
  'final-records-package',
  'delivery-confirmation',
]);

// Process all documents
while (agent.hasMoreDocuments()) {
  await agent.processNextDocument();
}

const summary = agent.generateSummary();
console.log('FERPA Case Summary:', summary);
```

### Automated Compliance Monitoring

```typescript
async function monitorCompliance(caseIds: string[]) {
  const results = [];

  for (const caseId of caseIds) {
    const processor = createComplianceProcessor(caseId);
    await processor['agent'].initialize();

    while (processor['agent'].hasMoreDocuments()) {
      const summary = await processor.processNextRecord();
      results.push({
        caseId,
        summary,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return results;
}
```

## Testing

The system includes comprehensive tests covering:

- Agent initialization and document processing
- Compliance processor functionality
- Error handling and edge cases
- Integration scenarios
- Type safety validation

Run tests with:

```bash
npm test -- timeline-agent.test.ts
```

## Implementation Notes

### Document Loading

- Documents are loaded via the `generateResponse` method from the base AgentBase class
- Content is cached to avoid redundant loading
- Real implementations should integrate with document storage systems

### Chronological Ordering

- Documents are processed in chronological order based on send/receive dates
- Metadata extraction determines the proper sequence
- Timeline entries are automatically sorted by date

### Compliance Ratings

- Ratings are calculated based on document processing completeness
- Critical issues affect overall compliance scores
- Ratings range from -100 (obstruction) to 100 (full compliance)

### Extensibility

- The system is designed for extension and customization
- Custom processors can be created for specific compliance requirements
- Type system ensures consistency across extensions

## Troubleshooting

### Common Issues

**Agent not initialized**: Always call `agent.initialize()` before processing documents.

**No documents to process**: Check that the initial document ID is valid and that related documents are properly identified.

**Processing errors**: Review document format and ensure the generateResponse method is properly implemented.

**Type errors**: Ensure all imports are correct and TypeScript compiler options are configured properly.

### Debug Information

Enable debug logging by checking processing results:

```typescript
const result = await agent.processNextDocument();
if (result?.notes) {
  console.debug('Processing notes:', result.notes);
}
```

## Contributing

When extending the TimelineAgent system:

1. Maintain type safety throughout
2. Follow the established patterns for document processing
3. Ensure compliance summary format compatibility
4. Add comprehensive tests for new functionality
5. Update documentation for new features

## License

This system is part of the NoEducation web application and follows the project's licensing terms.
