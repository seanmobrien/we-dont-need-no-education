import z from 'zod';

export const TASK_STATUSES = [
  'inbox',
  'ready',
  'in_progress',
  'blocked',
  'done',
  'deferred',
] as const;

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const TASK_OWNERS = ['model', 'user', 'system'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskOwner = (typeof TASK_OWNERS)[number];

export type WorkspaceTask = {
  taskId: string;
  caseId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  owner?: TaskOwner;
  relatedDocumentIds?: string[];
  relatedQuestionIds?: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  blockedReason?: string;
  tags?: string[];
};

export type WorkspaceDocumentSummary = {
  caseId: string;
  documentId: string;
  title?: string;
  date?: string;
  summary: string;
  relevance?: string[];
  status: 'draft' | 'reviewed' | 'needs_refresh';
  sourceSummaryId?: string;
  lastRefreshedAt: string;
  updatedAt: string;
};

export type WorkspaceQuestion = {
  questionId: string;
  caseId: string;
  question: string;
  type: 'factual' | 'legal' | 'evidentiary' | 'process';
  status: 'open' | 'investigating' | 'resolved' | 'deferred';
  relatedDocumentIds?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
};

export type WorkspaceSessionEntry = {
  timestamp: string;
  actor: 'system' | 'model' | 'user';
  summary: string;
};

export type WorkspaceMetadata = {
  schemaVersion: string;
  caseId: string;
  lastUpdated: string;
  lastCompacted?: string;
  files: Record<
    | 'overview'
    | 'tasks'
    | 'documentSummaries'
    | 'openQuestions'
    | 'timelineNotes'
    | 'sessionLog'
    | 'metadata',
    { path: string; updatedAt?: string; checksum?: string }
  >;
  tasks: WorkspaceTask[];
  documentSummaries: WorkspaceDocumentSummary[];
  questions: WorkspaceQuestion[];
  sessionLog: WorkspaceSessionEntry[];
};

export const workspaceIdSchema = z.string().min(1).max(256).regex(/^[A-Za-z0-9._-]+$/, {
  message: 'caseId must be alphanumeric with optional . _ - characters',
});

export const taskIdSchema = z.string().min(1).max(128);

export const questionIdSchema = z.string().min(1).max(128);

export const documentIdSchema = z.string().min(1).max(256);
