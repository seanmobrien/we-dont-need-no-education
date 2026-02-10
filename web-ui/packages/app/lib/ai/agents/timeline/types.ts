/**
 * Configuration properties for initializing a Timeline Agent for a given call to action.
 *
 * @example
 * ```typescript
 * const agentProps: TimelineAgentProps = {
 *   propertyId: "cta-uuid",
 *   initialDocumentId: "doc-456"
 * };
 * ```
 */
export type TimelineAgentProps = {
  /** Unique identifier for the call to action being analyzed */
  propertyId: string;
  /** Optional initial document ID to start the timeline analysis from */
  initialDocumentId?: string;
};

/**
 * Enumeration of compliance rating levels used throughout the timeline analysis.
 * Ratings are used to assess various aspects of compliance such as timeliness,
 * completeness, accuracy, and transparency.
 *
 * @example
 * ```typescript
 * const rating: ComplianceRating = ComplianceRating.Good;
 * ```
 */
export enum ComplianceRating {
  /** Rating could not be determined due to insufficient information */
  Unknown = 'Unknown',
  /** Compliance standards not met, significant issues identified */
  Poor = 'Poor',
  /** Minimum compliance standards met, some room for improvement */
  Satisfactory = 'Satisfactory',
  /** Good compliance with standards, minor issues if any */
  Good = 'Good',
  /** Exceptional compliance, exceeds all standards */
  Excellent = 'Excellent',
}

/**
 * Metadata information for a document in the timeline analysis.
 * Contains essential document properties and communication details.
 *
 * @example
 * ```typescript
 * const metadata: DocumentMetadata = {
 *   documentId: "email-123",
 *   propertyId: "prop-456",
 *   documentType: "email",
 *   dateSent: "2024-01-15",
 *   sender: "john@example.com",
 *   recipient: "jane@university.edu",
 *   subject: "FERPA Request Follow-up",
 *   attachmentCount: 2,
 *   priority: "High"
 * };
 * ```
 */
export type DocumentMetadata = {
  /** Unique identifier for the document */
  documentId: string;
  /** Identifier linking this document to a specific property/case */
  propertyId: string;
  /** Type of document (e.g., "email", "letter", "form") */
  documentType: string;
  /** ISO date string when the document was sent (optional) */
  dateSent?: string;
  /** ISO date string when the document was received (optional) */
  dateReceived?: string;
  /** Email address or name of the document sender */
  sender: string;
  /** Email address or name of the document recipient */
  recipient: string;
  /** Subject line or title of the document */
  subject: string;
  /** Number of attachments included with the document */
  attachmentCount: number;
  /** Priority level assigned to the document */
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
};

/**
 * Represents a single entry in the timeline analysis.
 * Each entry corresponds to a significant event or action in the compliance timeline.
 *
 * @example
 * ```typescript
 * const entry: TimelineEntry = {
 *   documentId: "email-123",
 *   date: "2024-01-15T10:30:00Z",
 *   summary: "Initial FERPA request received from student",
 *   verbatimStatements: ["I request all my educational records"],
 *   complianceNotes: ["Request meets FERPA requirements"],
 *   actionTaken: "Forwarded to registrar's office",
 *   actionRequired: "Gather records within 45 days"
 * };
 * ```
 */
export type TimelineEntry = {
  /** Unique identifier of the document this entry relates to */
  documentId: string;
  /** ISO date string when this timeline event occurred */
  date: string;
  /** Brief summary of what happened in this timeline entry */
  summary: string;
  /** Direct quotes or verbatim text from the document (optional) */
  verbatimStatements?: string[];
  /** Compliance-related observations or notes (optional) */
  complianceNotes?: string[];
  /** Description of any action that was taken (optional) */
  actionTaken?: string;
  /** Description of any action that is required (optional) */
  actionRequired?: string;
  /** Additional flexible properties for extensibility */
  [key: string]: unknown;
};

/**
 * Global metadata that applies to the entire case or timeline analysis.
 * Contains high-level information about the compliance request and its current status.
 *
 * @example
 * ```typescript
 * const globalMeta: GlobalMetadata = {
 *   caseId: "case-2024-001",
 *   propertyId: "prop-123",
 *   communicationId: "comm-456",
 *   caseType: "FERPA",
 *   requestType: "Educational Records Request",
 *   requestDate: "2024-01-15",
 *   requesterName: "John Smith",
 *   institutionName: "State University",
 *   complianceDeadline: "2024-03-01",
 *   currentStatus: "In Progress",
 *   totalDocuments: 15,
 *   processedDocuments: 8
 * };
 * ```
 */
export type GlobalMetadata = {
  /** Unique identifier for the entire case */
  caseId: string;
  /** Optional property identifier (may be inherited from context) */
  propertyId?: string;
  /** Optional communication thread identifier */
  communicationId?: string;
  /** Type of compliance case being analyzed */
  caseType: 'FERPA' | 'MNGDPA' | 'Other';
  /** Description of the type of request (e.g., "Records Request", "Directory Information") */
  requestType: string;
  /** ISO date string when the request was initially made */
  requestDate: string;
  /** Name of the person making the compliance request */
  requesterName: string;
  /** Name of the institution handling the request */
  institutionName: string;
  /** ISO date string of the compliance deadline */
  complianceDeadline: string;
  /** Current status of the case (e.g., "Open", "In Progress", "Completed") */
  currentStatus: string;
  /** Total number of documents in this case */
  totalDocuments: number;
  /** Number of documents that have been processed so far */
  processedDocuments: number;
};

/**
 * Collection of compliance ratings for different aspects of the timeline analysis.
 * Each rating assesses a specific dimension of compliance performance.
 *
 * @example
 * ```typescript
 * const ratings: ComplianceRatings = {
 *   timeliness: ComplianceRating.Good,
 *   completeness: ComplianceRating.Satisfactory,
 *   accuracy: ComplianceRating.Excellent,
 *   transparency: ComplianceRating.Good,
 *   overall: ComplianceRating.Good
 * };
 * ```
 */
export type ComplianceRatings = {
  /** Rating for how well deadlines and time requirements were met */
  timeliness: ComplianceRating;
  /** Rating for how complete the response was to the original request */
  completeness: ComplianceRating;
  /** Rating for the accuracy of information provided */
  accuracy: ComplianceRating;
  /** Rating for transparency in communications and process */
  transparency: ComplianceRating;
  /** Overall composite rating across all dimensions */
  overall: ComplianceRating;
};

/**
 * Complete summary of a timeline analysis, containing all processed information
 * and compliance assessments for a given case.
 *
 * This is the primary output type of the Timeline Agent analysis.
 *
 * @example
 * ```typescript
 * const summary: TimelineSummary = {
 *   globalMetadata: { caseId: "case-001", caseType: "FERPA", ... },
 *   sequentialActions: [
 *     { documentId: "doc-1", date: "2024-01-15", summary: "Request received" },
 *     { documentId: "doc-2", date: "2024-01-20", summary: "Acknowledgment sent" }
 *   ],
 *   complianceRatings: {
 *     timeliness: ComplianceRating.Good,
 *     overall: ComplianceRating.Satisfactory
 *   },
 *   criticalIssues: ["Potential deadline concern"],
 *   recommendations: ["Follow up within 5 business days"],
 *   lastUpdated: "2024-01-25T14:30:00Z"
 * };
 * ```
 */
export type TimelineSummary = {
  /** High-level metadata about the entire case */
  globalMetadata: GlobalMetadata;
  /** Chronologically ordered list of timeline entries */
  sequentialActions: TimelineEntry[];
  /** Compliance ratings across different dimensions */
  complianceRatings: ComplianceRatings;
  /** List of critical issues identified during analysis */
  criticalIssues: string[];
  /** List of recommendations for improving compliance */
  recommendations: string[];
  /** ISO timestamp of when this summary was last updated */
  lastUpdated: string;
};

/**
 * Result of processing a single document through the timeline analysis.
 * Contains the extracted timeline entry and any additional metadata or references.
 *
 * @example
 * ```typescript
 * const result: ProcessingResult = {
 *   documentId: "email-123",
 *   timelineEntry: {
 *     documentId: "email-123",
 *     date: "2024-01-15",
 *     summary: "Initial request received"
 *   },
 *   additionalDocuments: ["attachment-1", "attachment-2"],
 *   notes: ["Contains sensitive student information"],
 *   complianceImpact: { deadlineAffected: true },
 *   verbatimStatements: ["I hereby request my educational records"]
 * };
 * ```
 */
export type ProcessingResult = {
  /** Unique identifier of the document that was processed */
  documentId: string;
  /** Timeline entry extracted from this document (optional if no timeline impact) */
  timelineEntry?: TimelineEntry;
  /** IDs of additional documents referenced or attached (optional) */
  additionalDocuments?: string[];
  /** Processing notes or observations (optional) */
  notes?: string[];
  /** Impact on compliance metrics or deadlines (optional) */
  complianceImpact?: Record<string, unknown>;
  /** Direct quotes extracted from the document (optional) */
  verbatimStatements?: string[];
};

/**
 * Internal state representation of a Timeline Agent instance.
 * Contains all the data needed to resume or serialize the agent's current state.
 *
 * This type is used internally for state management and persistence.
 *
 * @example
 * ```typescript
 * const state: TimelineAgentState = {
 *   propertyId: "prop-123",
 *   pendingDocumentIds: ["doc-4", "doc-5"],
 *   processedDocumentIds: ["doc-1", "doc-2", "doc-3"],
 *   currentDocumentId: "doc-4",
 *   summary: { globalMetadata: {...}, sequentialActions: [...] },
 *   metadata: {
 *     "doc-1": { documentId: "doc-1", documentType: "email", ... }
 *   },
 *   createdAt: "2024-01-15T10:00:00Z",
 *   lastUpdated: "2024-01-15T14:30:00Z"
 * };
 * ```
 */
export type TimelineAgentState = {
  /** Property identifier this agent is analyzing */
  propertyId: string;
  /** List of document IDs that still need to be processed */
  pendingDocumentIds: string[];
  /** List of document IDs that have been successfully processed */
  processedDocumentIds: string[];
  /** ID of the document currently being processed (null if none) */
  currentDocumentId: string | null;
  /** Current timeline summary (null if not yet generated) */
  summary: TimelineSummary | null;
  /** Cached metadata for all known documents, keyed by document ID */
  metadata: Record<string, DocumentMetadata>;
  /** ISO timestamp when this agent state was created */
  createdAt: string;
  /** ISO timestamp when this agent state was last modified */
  lastUpdated: string;
};

/**
 * Serializable representation of a Timeline Agent for persistence or transfer.
 * Includes versioning information for backward compatibility.
 *
 * This type is used when saving/loading agent state to/from storage.
 *
 * @example
 * ```typescript
 * const serialized: SerializedTimelineAgent = {
 *   version: "1.0.0",
 *   timestamp: "2024-01-15T14:30:00Z",
 *   state: {
 *     propertyId: "prop-123",
 *     pendingDocumentIds: [...],
 *     processedDocumentIds: [...],
 *     // ... other state properties
 *   }
 * };
 *
 * // Save to storage
 * localStorage.setItem('timeline-agent', JSON.stringify(serialized));
 *
 * // Load from storage
 * const loaded = JSON.parse(localStorage.getItem('timeline-agent'));
 * ```
 */
export type SerializedTimelineAgent = {
  /** Version string for backward compatibility when deserializing */
  version: string;
  /** ISO timestamp when this serialization was created */
  timestamp: string;
  /** The complete agent state to be serialized/deserialized */
  state: TimelineAgentState;
};
