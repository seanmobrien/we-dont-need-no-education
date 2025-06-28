import { getCaseFileDocument } from '../../tools';
import { ClientTimelineAgent } from './agent';
import {
  TimelineAgentProps,
  DocumentMetadata,
  TimelineSummary,
  ProcessingResult,
  ComplianceRating,
  GlobalMetadata,
  SerializedTimelineAgent,
} from './types';

/**
 * Represents an agent responsible for building a timeline summary for a given case record.
 *
 * The `TimelineAgent` is responsible for building a timeline summary for data request cases
 * (e.g., FERPA/MNGDPA). It tracks pending and processed documents, loads and analyzes each
 * document in chronological order, records verbatim statements, compliance metadata, and
 * actions/inactions, then outputs a structured summary with global metadata, sequential
 * actions, and compliance ratings.
 *
 * Key features:
 * - Processes documents in chronological order based on send/receive dates
 * - Maintains detailed compliance tracking and metadata
 * - Preserves verbatim statements and critical information
 * - Supports resuming processing with new documents
 * - Generates structured summaries with compliance ratings
 *
 * @extends TimelineAgent
 *
 * @example
 * ```typescript
 * const agent = new TimelineAgent({ initialDocumentId: 'doc-123' });
 * await agent.initialize();
 * await agent.processNextDocument();
 * const summary = agent.generateSummary();
 * ```
 */
class ServerTimelineAgent extends ClientTimelineAgent {
  readonly #pendingDocuments = new Set<string>();
  readonly #processedDocuments = new Set<string>();
  readonly #documentMetadata = new Map<string, DocumentMetadata>();
  readonly #documentContent = new Map<string, string>();
  #timelineState: TimelineSummary = {
    globalMetadata: {
      caseId: '',
      propertyId: '',
      caseType: 'FERPA',
      requestType: 'Data Request',
      requestDate: '',
      requesterName: '',
      institutionName: '',
      complianceDeadline: '',
      currentStatus: 'In Progress',
      totalDocuments: 0,
      processedDocuments: 0,
    },
    sequentialActions: [],
    complianceRatings: {
      timeliness: ComplianceRating.Unknown,
      completeness: ComplianceRating.Unknown,
      accuracy: ComplianceRating.Unknown,
      transparency: ComplianceRating.Unknown,
      overall: ComplianceRating.Unknown,
    },
    criticalIssues: [],
    recommendations: [],
    lastUpdated: new Date().toISOString(),
  };
  #isInitialized = false;
  #propertyId: string | null = null;

  constructor(props: TimelineAgentProps | SerializedTimelineAgent) {
    super(props);
    if ('initialDocumentId' in props) {
      if (props.initialDocumentId) {
        this.#pendingDocuments.add(props.initialDocumentId);
      }
    } else if ('state' in props) {
      this.attach(props);
    }
  }

  /**
   * Initialize the agent by loading the initial document and extracting case metadata
   */
  async initialize(): Promise<void> {
    if (this.#isInitialized) return;

    const initialDocId = Array.from(this.#pendingDocuments)[0];
    if (!initialDocId) {
      throw new Error('No initial document provided');
    }

    try {
      // Load initial document and extract case metadata
      const initialDocument = await this.#loadDocument(initialDocId);
      const caseMetadata = await this.#extractCaseMetadata(initialDocument);
      // Update global metadata
      this.#timelineState.globalMetadata = {
        ...this.#timelineState.globalMetadata,
        ...caseMetadata,
      };

      // Identify related documents
      const relatedDocuments =
        await this.#identifyRelatedDocuments(initialDocument);
      relatedDocuments.forEach((docId) => this.#pendingDocuments.add(docId));

      this.#timelineState.globalMetadata.totalDocuments =
        this.#pendingDocuments.size;
      this.#isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize TimelineAgent: ${error}`);
    }
  }

  /**
   * Process the next document in chronological order
   */
  async processNextDocument(
    nextDocId?: string,
  ): Promise<ProcessingResult | null> {
    if (!this.#isInitialized) {
      throw new Error('Agent must be initialized before processing documents');
    }

    if (!nextDocId) {
      return null;
    }

    try {
      const document = await this.#loadDocument(nextDocId);
      const result = await this.#processDocument(nextDocId, document);

      // Update timeline state
      this.#updateTimelineState(result);

      // Move document from pending to processed
      this.#pendingDocuments.delete(nextDocId);
      this.#processedDocuments.add(nextDocId);

      // Add any additional documents identified during processing
      if (result.additionalDocuments) {
        result.additionalDocuments.forEach((docId) => {
          if (
            !this.#processedDocuments.has(docId) &&
            !this.#pendingDocuments.has(docId)
          ) {
            this.#pendingDocuments.add(docId);
          }
        });
      }

      // Update counters
      this.#timelineState.globalMetadata.processedDocuments =
        this.#processedDocuments.size;
      this.#timelineState.globalMetadata.totalDocuments =
        this.#processedDocuments.size + this.#pendingDocuments.size;

      this.#timelineState.lastUpdated = new Date().toISOString();

      return result;
    } catch (error) {
      throw new Error(`Failed to process document ${nextDocId}: ${error}`);
    }
  }

  /**
   * Generate the current timeline summary
   */
  generateSummary(): TimelineSummary {
    // Update compliance ratings based on current state
    this.#updateComplianceRatings();

    return {
      ...this.#timelineState,
      lastUpdated: new Date().toISOString(),
    };
  }

  // Private helper methods

  async #loadDocument(documentId: string): Promise<string> {
    // Check cache first
    if (this.#documentContent.has(documentId)) {
      return this.#documentContent.get(documentId)!;
    }
    /*
    - caseId: string
    - caseType: "FERPA" | "MNGDPA" | "Other"
    - requestType: string
    - requestDate: ISO date string
    - requesterName: string
    - institutionName: string
    - complianceDeadline: ISO date string
    - currentStatus: string
*/

    const docRequest = await getCaseFileDocument({
      caseFileId: documentId,
      goals: [
        `Create detailed timeline for call to action ${documentId}`,
        `Locate related case file documents and attachments for ${documentId}`,
        `Identify metadata such as Request Date, Requester Name, Requested Item, and Compliance Deadline for ${documentId}`,
        `Include verbatim statements regarding specific item(s) requested in ${documentId}`,
      ],
    });
    const result = docRequest?.structuredContent?.result;
    if (!result) {
      throw new Error(
        `Failed to load document ${documentId}: No content found`,
      );
    }
    if (result.isError === true) {
      throw new Error(
        `Failed to load document ${documentId}: ${result.message}`,
      );
    }
    const content =
      typeof result.value === 'string'
        ? result.value
        : JSON.stringify(result.value, null, 2);
    this.#documentContent.set(documentId, content);
    return content;
  }

  async #extractCaseMetadata(
    document: string,
  ): Promise<Partial<GlobalMetadata>> {
    const prompt = `
    Analyze the following document and extract case metadata. Return a JSON object with the following fields:
    - caseId: string
    - caseType: "FERPA" | "MNGDPA" | "Other"
    - requestType: string
    - requestDate: ISO date string
    - requesterName: string
    - institutionName: string
    - complianceDeadline: ISO date string
    - currentStatus: string

    Document:
    ${document}
    `;

    const response = await super.generateResponse(prompt);
    try {
      return JSON.parse(response);
    } catch {
      // Return default metadata if parsing fails
      return {
        caseId: 'unknown',
        requestDate: new Date().toISOString(),
        currentStatus: 'In Progress',
      };
    }
  }

  async #identifyRelatedDocuments(document: string): Promise<string[]> {
    const prompt = `
    Analyze the following document and identify all related document IDs, attachment IDs, 
    or case file references that should be included in the timeline analysis.
    Return a JSON array of document IDs.

    Document:
    ${document}
    `;

    const response = await this.generateResponse(prompt);
    try {
      const documentIds = JSON.parse(response);
      return Array.isArray(documentIds) ? documentIds : [];
    } catch {
      return [];
    }
  }

  async #processDocument(
    documentId: string,
    document: string,
  ): Promise<ProcessingResult> {
    // First, extract document metadata
    const metadata = await this.#extractDocumentMetadata(documentId, document);
    this.#documentMetadata.set(documentId, metadata);

    // Process the document with current timeline context
    const prompt = `
    You are processing a document as part of a compliance timeline analysis for a data request case.
    
    Current Timeline State:
    ${JSON.stringify(this.#timelineState, null, 2)}
    
    Document to Process:
    ID: ${documentId}
    Metadata: ${JSON.stringify(metadata, null, 2)}
    Content: ${document}
    
    Please analyze this document and return a JSON object with:
    - timelineEntry: Object describing this document's place in the timeline
    - additionalDocuments: Array of additional document IDs discovered (if any)
    - notes: Array of string notes about issues, concerns, or questions
    - complianceImpact: Object describing how this document affects compliance ratings
    - verbatimStatements: Array of critical verbatim quotes from the document
    
    Focus on compliance aspects, timeline accuracy, and any actions or inactions that affect the case.
    `;

    const response = await this.generateResponse(prompt);

    try {
      const result = JSON.parse(response);
      return {
        documentId,
        timelineEntry: result.timelineEntry || {},
        additionalDocuments: result.additionalDocuments || [],
        notes: result.notes || [],
        complianceImpact: result.complianceImpact || {},
        verbatimStatements: result.verbatimStatements || [],
      };
    } catch (error) {
      return {
        documentId,
        timelineEntry: {
          documentId,
          date:
            metadata.dateReceived ||
            metadata.dateSent ||
            new Date().toISOString(),
          summary: `Failed to process document: ${error}`,
        },
        additionalDocuments: [],
        notes: [`Error processing document: ${error}`],
        complianceImpact: {},
        verbatimStatements: [],
      };
    }
  }

  async #extractDocumentMetadata(
    documentId: string,
    document: string,
  ): Promise<DocumentMetadata> {
    const prompt = `
    Extract metadata from the following document. Return a JSON object with:
    - documentId: string
    - documentType: string
    - dateSent: ISO date string (if applicable)
    - dateReceived: ISO date string (if applicable)
    - sender: string
    - recipient: string
    - subject: string
    - attachmentCount: number
    - priority: "Low" | "Medium" | "High" | "Critical"
    
    Document:
    ${document}
    `;

    const response = await this.generateResponse(prompt);

    try {
      const metadata = JSON.parse(response);
      return {
        documentId,
        documentType: metadata.documentType || 'Unknown',
        dateSent: metadata.dateSent,
        dateReceived: metadata.dateReceived,
        sender: metadata.sender || '',
        recipient: metadata.recipient || '',
        subject: metadata.subject || '',
        attachmentCount: metadata.attachmentCount || 0,
        priority: metadata.priority || 'Medium',
      };
    } catch {
      return {
        documentId,
        documentType: 'Unknown',
        sender: '',
        recipient: '',
        subject: '',
        attachmentCount: 0,
        priority: 'Medium',
      };
    }
  }

  #updateTimelineState(result: ProcessingResult): void {
    // Add the timeline entry
    if (result.timelineEntry) {
      this.#timelineState.sequentialActions.push(result.timelineEntry);
    }

    // Add notes as critical issues if they indicate problems
    if (result.notes && result.notes.length > 0) {
      result.notes.forEach((note) => {
        if (
          note.toLowerCase().includes('concern') ||
          note.toLowerCase().includes('issue') ||
          note.toLowerCase().includes('problem')
        ) {
          this.#timelineState.criticalIssues.push(note);
        }
      });
    }

    // Sort sequential actions by date
    this.#timelineState.sequentialActions.sort((a, b) => {
      const dateA = new Date(a.date || '');
      const dateB = new Date(b.date || '');
      return dateA.getTime() - dateB.getTime();
    });
  }

  /**
   * Restore agent from a JSON snapshot string
   */
  static fromSnapshot(snapshot: string): ServerTimelineAgent {
    try {
      const serializedAgent = JSON.parse(snapshot) as SerializedTimelineAgent;
      return new ServerTimelineAgent(serializedAgent);
    } catch (error) {
      throw new Error(`Failed to restore agent from snapshot: ${error}`);
    }
  }

  /**
   * Update compliance ratings based on current timeline state
   */
  #updateComplianceRatings(): void {
    // Calculate overall compliance rating based on document processing
    const processedCount =
      this.#timelineState.globalMetadata.processedDocuments;
    const totalCount = this.#timelineState.globalMetadata.totalDocuments;

    if (totalCount === 0) {
      this.#timelineState.complianceRatings.overall = ComplianceRating.Unknown;
      return;
    }

    const completionRate = processedCount / totalCount;

    // Update overall compliance rating based on completion
    if (completionRate >= 0.9) {
      this.#timelineState.complianceRatings.overall =
        ComplianceRating.Excellent;
    } else if (completionRate >= 0.75) {
      this.#timelineState.complianceRatings.overall = ComplianceRating.Good;
    } else if (completionRate >= 0.5) {
      this.#timelineState.complianceRatings.overall =
        ComplianceRating.Satisfactory;
    } else if (completionRate >= 0.25) {
      this.#timelineState.complianceRatings.overall = ComplianceRating.Poor;
    } else {
      this.#timelineState.complianceRatings.overall = ComplianceRating.Unknown;
    }

    // Update document-specific ratings
    this.#timelineState.complianceRatings.completeness =
      completionRate >= 0.8
        ? ComplianceRating.Good
        : ComplianceRating.Satisfactory;

    this.#timelineState.complianceRatings.timeliness =
      ComplianceRating.Satisfactory;
    this.#timelineState.complianceRatings.accuracy = ComplianceRating.Good;
    this.#timelineState.complianceRatings.transparency = ComplianceRating.Good;
  }
}

const TimelineAgentFactory = (
  props: TimelineAgentProps,
): ServerTimelineAgent => {
  return new ServerTimelineAgent(props);
};

export default TimelineAgentFactory;
export { ServerTimelineAgent };
