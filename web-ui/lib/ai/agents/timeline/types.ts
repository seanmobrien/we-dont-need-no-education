export type TimelineAgentProps = {
  propertyId?: string;
  initialDocumentId?: string;
};

export enum ComplianceRating {
  Unknown = 'Unknown',
  Poor = 'Poor',
  Satisfactory = 'Satisfactory',
  Good = 'Good',
  Excellent = 'Excellent',
}

export type DocumentMetadata = {
  documentId: string;
  documentType: string;
  dateSent?: string;
  dateReceived?: string;
  sender: string;
  recipient: string;
  subject: string;
  attachmentCount: number;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
};

export type TimelineEntry = {
  documentId: string;
  date: string;
  summary: string;
  verbatimStatements?: string[];
  complianceNotes?: string[];
  actionTaken?: string;
  actionRequired?: string;
  [key: string]: unknown;
};

export type GlobalMetadata = {
  caseId: string;
  propertyId?: string;
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

export type ComplianceRatings = {
  timeliness: ComplianceRating;
  completeness: ComplianceRating;
  accuracy: ComplianceRating;
  transparency: ComplianceRating;
  overall: ComplianceRating;
};

export type TimelineSummary = {
  globalMetadata: GlobalMetadata;
  sequentialActions: TimelineEntry[];
  complianceRatings: ComplianceRatings;
  criticalIssues: string[];
  recommendations: string[];
  lastUpdated: string;
};

export type ProcessingResult = {
  documentId: string;
  timelineEntry?: TimelineEntry;
  additionalDocuments?: string[];
  notes?: string[];
  complianceImpact?: Record<string, unknown>;
  verbatimStatements?: string[];
};

// Serialization types for TimelineAgent state
export type TimelineAgentState = {
  propertyId: string;
  pendingDocumentIds: string[];
  processedDocumentIds: string[];
  currentDocumentId: string | null;
  summary: TimelineSummary | null;
  metadata: Record<string, DocumentMetadata>;
  createdAt: string;
  lastUpdated: string;
};

export type SerializedTimelineAgent = {
  version: string;
  timestamp: string;
  state: TimelineAgentState;
};
