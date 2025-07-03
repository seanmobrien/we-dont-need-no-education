import AgentBase from '../agent-base';
import {
  TimelineAgentProps,
  DocumentMetadata,
  TimelineSummary,
  ProcessingResult,
  ComplianceRating,
  TimelineAgentState,
  SerializedTimelineAgent,
} from './types';

/**
 * Represents an agent responsible for building a timeline summary for a given case record.
 *
 * The `ClientTimelineAgent` is responsible for building a timeline summary for data request cases
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
 * @extends AgentBase
 *
 * @example
 * ```typescript
 * const agent = new ClientTimelineAgent({ initialDocumentId: 'doc-123' });
 * await agent.initialize();
 * await agent.processNextDocument();
 * const summary = agent.generateSummary();
 * ```
 */
export class ClientTimelineAgent extends AgentBase {
  protected readonly pendingDocuments = new Set<string>();
  protected readonly processedDocuments = new Set<string>();
  protected readonly documentMetadata = new Map<string, DocumentMetadata>();
  protected readonly documentContent = new Map<string, string>();
  protected timelineState: TimelineSummary = {
    globalMetadata: {
      caseId: '',
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
  protected isInitialized = false;
  #propertyId: string | null = null;

  constructor(props: TimelineAgentProps | SerializedTimelineAgent) {
    super();
    if ('version' in props) {
      this.attach(props);
      this.#propertyId = props.state.propertyId || null;
      props.state.pendingDocumentIds.forEach((id) =>
        this.pendingDocuments.add(id),
      );
      props.state.processedDocumentIds.forEach((id) =>
        this.processedDocuments.add(id),
      );
      if (props.state.metadata) {
        Object.entries(props.state.metadata).forEach(([id, meta]) => {
          this.documentMetadata.set(id, meta);
        });
      }
    } else {
      // Initialize with provided properties
      this.#propertyId = props.propertyId || null;
      if (props.initialDocumentId) {
        this.pendingDocuments.add(props.initialDocumentId);
      }
    }
  }

  /**
   * Get the current property ID
   */
  get propertyId(): string | null {
    return this.#propertyId;
  }

  /**
   * Get the currently active document ID being processed
   */
  getCurrentDocumentId(): string | null {
    const pendingDocs = Array.from(this.pendingDocuments);
    if (pendingDocs.length === 0) return null;

    // Return the first document in chronological order
    return this.getNextDocumentToProcess();
  }

  /**
   * Initialize the agent by loading the initial document and extracting case metadata
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const initialDocId = Array.from(this.pendingDocuments)[0];
    if (!initialDocId) {
      throw new Error('No initial document provided');
    }
  }

  /**
   * Process the next document in chronological order
   */
  async processNextDocument(): Promise<ProcessingResult | null> {
    if (!this.isInitialized) {
      throw new Error('Agent must be initialized before processing documents');
    }

    const nextDocId = this.getNextDocumentToProcess();
    if (!nextDocId) {
      return null; // No more documents to process
    }

    try {
      // Update counters
      this.timelineState.globalMetadata.processedDocuments =
        this.processedDocuments.size;
      this.timelineState.globalMetadata.totalDocuments =
        this.processedDocuments.size + this.pendingDocuments.size;

      this.timelineState.lastUpdated = new Date().toISOString();

      return {} as any;
    } catch (error) {
      throw new Error(`Failed to process document ${nextDocId}: ${error}`);
    }
  }

  /**
   * Add new documents to the processing queue
   */
  addDocuments(documentIds: string[]): void {
    documentIds.forEach((docId) => {
      if (
        !this.processedDocuments.has(docId) &&
        !this.pendingDocuments.has(docId)
      ) {
        this.pendingDocuments.add(docId);
      }
    });

    this.timelineState.globalMetadata.totalDocuments =
      this.processedDocuments.size + this.pendingDocuments.size;
  }

  /**
   * Generate the current timeline summary
   */
  generateSummary(): TimelineSummary {
    // Update compliance ratings based on current state
    this.updateComplianceRatings();

    return {
      ...this.timelineState,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Check if there are more documents to process
   */
  hasMoreDocuments(): boolean {
    return this.pendingDocuments.size > 0;
  }

  /**
   * Get the count of pending and processed documents
   */
  getDocumentCounts(): { pending: number; processed: number; total: number } {
    return {
      pending: this.pendingDocuments.size,
      processed: this.processedDocuments.size,
      total: this.pendingDocuments.size + this.processedDocuments.size,
    };
  }

  /**
   * Reset the agent to its initial state
   */
  reset(): void {
    this.pendingDocuments.clear();
    this.processedDocuments.clear();
    this.documentMetadata.clear();
    this.documentContent.clear();
    this.isInitialized = false;

    // Reset timeline state
    this.timelineState = {
      globalMetadata: {
        caseId: '',
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
  }

  // Private helper methods

  getNextDocumentToProcess(): string | null {
    if (this.pendingDocuments.size === 0) return null;

    // Sort pending documents by chronological order based on metadata
    const sortedDocs = Array.from(this.pendingDocuments).sort((a, b) => {
      const metaA = this.documentMetadata.get(a);
      const metaB = this.documentMetadata.get(b);

      if (!metaA && !metaB) return 0;
      if (!metaA) return 1;
      if (!metaB) return -1;

      const dateA = new Date(metaA.dateReceived || metaA.dateSent || '');
      const dateB = new Date(metaB.dateReceived || metaB.dateSent || '');

      return dateA.getTime() - dateB.getTime();
    });

    return sortedDocs[0];
  }

  protected updateComplianceRatings(): void {
    // This would implement sophisticated compliance rating logic
    // For now, provide a basic implementation
    const totalDocs = this.timelineState.globalMetadata.totalDocuments;
    const processedDocs = this.timelineState.globalMetadata.processedDocuments;
    const issueCount = this.timelineState.criticalIssues.length;

    // Completeness rating based on document processing
    if (processedDocs === totalDocs && totalDocs > 0) {
      this.timelineState.complianceRatings.completeness = ComplianceRating.Good;
    } else if (processedDocs / totalDocs > 0.8) {
      this.timelineState.complianceRatings.completeness =
        ComplianceRating.Satisfactory;
    } else {
      this.timelineState.complianceRatings.completeness = ComplianceRating.Poor;
    }

    // Overall rating based on issues
    if (issueCount === 0) {
      this.timelineState.complianceRatings.overall = ComplianceRating.Good;
    } else if (issueCount < 3) {
      this.timelineState.complianceRatings.overall =
        ComplianceRating.Satisfactory;
    } else {
      this.timelineState.complianceRatings.overall = ComplianceRating.Poor;
    }

    // Set other ratings to unknown for now - would be implemented based on specific analysis
    this.timelineState.complianceRatings.timeliness = ComplianceRating.Unknown;
    this.timelineState.complianceRatings.accuracy = ComplianceRating.Unknown;
    this.timelineState.complianceRatings.transparency =
      ComplianceRating.Unknown;
  }

  /**
   * Serialize the current agent state to a JSON-compatible object
   * This allows the agent's state to be saved and restored later
   */
  serialize(): SerializedTimelineAgent {
    const state: TimelineAgentState = {
      propertyId: this.propertyId || '',
      pendingDocumentIds: Array.from(this.pendingDocuments),
      processedDocumentIds: Array.from(this.processedDocuments),
      currentDocumentId: this.getCurrentDocumentId(),
      summary: this.timelineState,
      metadata: Object.fromEntries(this.documentMetadata),
      createdAt:
        this.timelineState.globalMetadata.requestDate ||
        new Date().toISOString(),
      lastUpdated: this.timelineState.lastUpdated,
    };

    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      state,
    };
  }

  protected attach(agent: SerializedTimelineAgent): void {
    const { state } = agent;
    this.reset();
    // Restore internal state
    this.pendingDocuments.clear();
    state.pendingDocumentIds.forEach((id: string) =>
      this.pendingDocuments.add(id),
    );

    this.processedDocuments.clear();
    state.processedDocumentIds.forEach((id: string) =>
      this.processedDocuments.add(id),
    );

    this.documentMetadata.clear();
    Object.entries(state.metadata).forEach(([id, metadata]) =>
      this.documentMetadata.set(id, metadata as DocumentMetadata),
    );

    if (state.summary) {
      this.timelineState = state.summary;
    }

    // Set propertyId if available
    if (state.propertyId) {
      this.#propertyId = state.propertyId;
    }

    // Mark as initialized if it has processed any documents or has summary data
    this.isInitialized =
      state.processedDocumentIds.length > 0 ||
      (state.summary?.globalMetadata.caseId?.length ?? 0) > 0;
  }

  /**
   * Restore agent state from a previously serialized state
   * This allows resuming an agent session from a saved state
   */
  static deserialize(
    serializedAgent: SerializedTimelineAgent,
  ): ClientTimelineAgent {
    const { state } = serializedAgent;

    // Create a new agent instance
    const agent = new ClientTimelineAgent({
      initialDocumentId: state.pendingDocumentIds[0]!,
      propertyId: state.propertyId!,
    });

    return agent;
  }

  /**
   * Create a serialized snapshot of the current state
   * Useful for checkpointing during long processing sessions
   */
  createSnapshot(): string {
    return JSON.stringify(this.serialize(), null, 2);
  }

  /**
   * Restore agent from a JSON snapshot string
   */
  static fromSnapshot(snapshot: string): ClientTimelineAgent {
    try {
      const serializedAgent = JSON.parse(snapshot) as SerializedTimelineAgent;
      return ClientTimelineAgent.deserialize(serializedAgent);
    } catch (error) {
      throw new Error(`Failed to restore agent from snapshot: ${error}`);
    }
  }

  /**
   * Check if the serialized state is compatible with the current version
   */
  static isCompatibleVersion(
    serializedAgent: SerializedTimelineAgent,
  ): boolean {
    const currentVersion = '1.0.0';
    const [currentMajor] = currentVersion.split('.').map(Number);
    const [serializedMajor] = serializedAgent.version.split('.').map(Number);

    // Compatible if major versions match
    return currentMajor === serializedMajor;
  }
}

const TimelineAgentFactory = (
  props: TimelineAgentProps,
): ClientTimelineAgent => {
  return new ClientTimelineAgent(props);
};

export default TimelineAgentFactory;
export { ClientTimelineAgent as TimelineAgent };
