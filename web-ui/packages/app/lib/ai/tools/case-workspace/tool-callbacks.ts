import z from 'zod';
import { LoggedError } from '@compliance-theater/logger';
import {
  toolCallbackResultFactory,
  toolCallbackResultSchemaFactory,
} from '../utility';
import {
  addWorkspaceQuestion,
  appendWorkspaceSessionLog,
  appendWorkspaceTask,
  compactWorkspace,
  getCaseWorkspaceSummary,
  readWorkspaceFile,
  updateWorkspaceQuestionStatus,
  updateWorkspaceTaskDetails,
  updateWorkspaceTaskStatus,
  upsertWorkspaceDocumentSummary,
} from './workspace-service';
import {
  TASK_OWNERS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  documentIdSchema,
  questionIdSchema,
  taskIdSchema,
  workspaceIdSchema,
} from './types';
import { WorkspaceFileName } from './workspace-storage';

const workspaceSummarySchema = z.object({
  caseId: z.string(),
  files: z.array(
    z.object({
      name: z.string(),
      path: z.string(),
      updatedAt: z.string().optional(),
      exists: z.boolean(),
      checksum: z.string().optional(),
    }),
  ),
  taskCounts: z.object({
    inbox: z.number(),
    ready: z.number(),
    in_progress: z.number(),
    blocked: z.number(),
    done: z.number(),
    deferred: z.number(),
  }),
  documentSummaries: z.number(),
  openQuestions: z.number(),
  lastUpdated: z.string().optional(),
});

const taskSchema = z.object({
  taskId: z.string(),
  caseId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES).optional(),
  owner: z.enum(TASK_OWNERS).optional(),
  relatedDocumentIds: z.array(z.string()).optional(),
  relatedQuestionIds: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
  blockedReason: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const documentSummarySchema = z.object({
  caseId: z.string(),
  documentId: z.string(),
  title: z.string().optional(),
  date: z.string().optional(),
  summary: z.string(),
  relevance: z.array(z.string()).optional(),
  status: z.enum(['draft', 'reviewed', 'needs_refresh']),
  sourceSummaryId: z.string().optional(),
  lastRefreshedAt: z.string(),
  updatedAt: z.string(),
});

const questionSchema = z.object({
  questionId: z.string(),
  caseId: z.string(),
  question: z.string(),
  type: z.enum(['factual', 'legal', 'evidentiary', 'process']),
  status: z.enum(['open', 'investigating', 'resolved', 'deferred']),
  relatedDocumentIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  resolvedAt: z.string().optional(),
});

const sessionEntrySchema = z.object({
  timestamp: z.string(),
  actor: z.enum(['system', 'model', 'user']),
  summary: z.string(),
});

const workspaceFileNames: WorkspaceFileName[] = [
  'overview',
  'tasks',
  'documentSummaries',
  'openQuestions',
  'timelineNotes',
  'sessionLog',
  'metadata',
];

const safeHandler = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      source: 'case-workspace-tools',
      log: true,
    });
    throw error instanceof Error ? error : new Error(String(error));
  }
};

export const getCaseWorkspace = async ({ caseId }: { caseId: string }) => {
  const summary = await safeHandler(() => getCaseWorkspaceSummary(caseId));
  return toolCallbackResultFactory(summary);
};

export const getCaseWorkspaceConfig = {
  description:
    'Return a summary of the case workspace including file status and task counts.',
  inputSchema: {
    caseId: workspaceIdSchema.describe('Case identifier to load.'),
  },
  outputSchema: toolCallbackResultSchemaFactory(workspaceSummarySchema),
};

export const readWorkspaceFileCallback = async ({
  caseId,
  file,
}: {
  caseId: string;
  file: WorkspaceFileName;
}) => {
  const result = await safeHandler(() => readWorkspaceFile(caseId, file));
  return toolCallbackResultFactory(result);
};

export const readWorkspaceFileConfig = {
  description:
    'Read a workspace file (overview, tasks, document summaries, open questions, timeline notes, session log, metadata).',
  inputSchema: {
    caseId: workspaceIdSchema.describe('Case identifier to read.'),
    file: z
      .enum(workspaceFileNames as [WorkspaceFileName, ...WorkspaceFileName[]])
      .describe('Workspace file to read'),
  },
  outputSchema: toolCallbackResultSchemaFactory(
    z.object({
      content: z.string(),
      path: z.string(),
    }),
  ),
};

export const appendTaskCallback = async (input: {
  caseId: string;
  title: string;
  description?: string;
  status?: (typeof TASK_STATUSES)[number];
  priority?: (typeof TASK_PRIORITIES)[number];
  owner?: (typeof TASK_OWNERS)[number];
  relatedDocumentIds?: string[];
  relatedQuestionIds?: string[];
  tags?: string[];
}) => {
  const task = await safeHandler(() => appendWorkspaceTask(input));
  return toolCallbackResultFactory(task);
};

export const appendTaskConfig = {
  description:
    'Append a task to the case workspace with stable task ids and status tracking.',
  inputSchema: {
    caseId: workspaceIdSchema.describe('Case identifier to target.'),
    title: z.string().describe('Short task title.'),
    description: z.string().optional(),
    status: z
      .enum(TASK_STATUSES)
      .optional()
      .describe('Workflow status (defaults to inbox).'),
    priority: z.enum(TASK_PRIORITIES).optional(),
    owner: z.enum(TASK_OWNERS).optional(),
    relatedDocumentIds: z.array(z.string()).optional(),
    relatedQuestionIds: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  },
  outputSchema: toolCallbackResultSchemaFactory(taskSchema),
};

export const updateTaskStatusCallback = async (input: {
  caseId: string;
  taskId: string;
  status: (typeof TASK_STATUSES)[number];
  blockedReason?: string;
}) => {
  const task = await safeHandler(() => updateWorkspaceTaskStatus(input));
  return toolCallbackResultFactory(task);
};

export const updateTaskStatusConfig = {
  description: 'Update the status for a workspace task.',
  inputSchema: {
    caseId: workspaceIdSchema,
    taskId: taskIdSchema.describe('Stable task identifier to update.'),
    status: z.enum(TASK_STATUSES),
    blockedReason: z
      .string()
      .optional()
      .describe('Reason when marking a task blocked.'),
  },
  outputSchema: toolCallbackResultSchemaFactory(taskSchema),
};

export const updateTaskDetailsCallback = async (input: {
  caseId: string;
  taskId: string;
  title?: string;
  description?: string;
  priority?: (typeof TASK_PRIORITIES)[number];
  owner?: (typeof TASK_OWNERS)[number];
  tags?: string[];
}) => {
  const task = await safeHandler(() => updateWorkspaceTaskDetails(input));
  return toolCallbackResultFactory(task);
};

export const updateTaskDetailsConfig = {
  description:
    'Update task fields (title, description, priority, owner, tags) without changing status.',
  inputSchema: {
    caseId: workspaceIdSchema,
    taskId: taskIdSchema,
    title: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    owner: z.enum(TASK_OWNERS).optional(),
    tags: z.array(z.string()).optional(),
  },
  outputSchema: toolCallbackResultSchemaFactory(taskSchema),
};

export const upsertDocumentSummaryCallback = async (input: {
  caseId: string;
  documentId: string;
  title?: string;
  date?: string;
  summary: string;
  relevance?: string[];
  status: 'draft' | 'reviewed' | 'needs_refresh';
  sourceSummaryId?: string;
  lastRefreshedAt?: string;
}) => {
  const record = await safeHandler(() =>
    upsertWorkspaceDocumentSummary(input.caseId, input),
  );
  return toolCallbackResultFactory(record);
};

export const upsertDocumentSummaryConfig = {
  description:
    'Create or update a document summary in the workspace with canonical document id linkage.',
  inputSchema: {
    caseId: workspaceIdSchema,
    documentId: documentIdSchema,
    title: z.string().optional(),
    date: z.string().optional(),
    summary: z.string(),
    relevance: z.array(z.string()).optional(),
    status: z.enum(['draft', 'reviewed', 'needs_refresh']),
    sourceSummaryId: z.string().optional(),
    lastRefreshedAt: z.string().optional(),
  },
  outputSchema: toolCallbackResultSchemaFactory(documentSummarySchema),
};

export const addOpenQuestionCallback = async (input: {
  caseId: string;
  question: string;
  type: 'factual' | 'legal' | 'evidentiary' | 'process';
  status?: 'open' | 'investigating' | 'resolved' | 'deferred';
  relatedDocumentIds?: string[];
  notes?: string;
}) => {
  const record = await safeHandler(() => addWorkspaceQuestion(input));
  return toolCallbackResultFactory(record);
};

export const addOpenQuestionConfig = {
  description: 'Add an open question to the case workspace.',
  inputSchema: {
    caseId: workspaceIdSchema,
    question: z.string(),
    type: z.enum(['factual', 'legal', 'evidentiary', 'process']),
    status: z.enum(['open', 'investigating', 'resolved', 'deferred']).optional(),
    relatedDocumentIds: z.array(z.string()).optional(),
    notes: z.string().optional(),
  },
  outputSchema: toolCallbackResultSchemaFactory(questionSchema),
};

export const updateOpenQuestionStatusCallback = async (input: {
  caseId: string;
  questionId: string;
  status: 'open' | 'investigating' | 'resolved' | 'deferred';
  notes?: string;
}) => {
  const record = await safeHandler(() =>
    updateWorkspaceQuestionStatus(input),
  );
  return toolCallbackResultFactory(record);
};

export const updateOpenQuestionStatusConfig = {
  description: 'Update status or notes for an open question.',
  inputSchema: {
    caseId: workspaceIdSchema,
    questionId: questionIdSchema,
    status: z.enum(['open', 'investigating', 'resolved', 'deferred']),
    notes: z.string().optional(),
  },
  outputSchema: toolCallbackResultSchemaFactory(questionSchema),
};

export const appendSessionLogCallback = async (input: {
  caseId: string;
  actor?: 'system' | 'model' | 'user';
  summary: string;
}) => {
  const entry = await safeHandler(() => appendWorkspaceSessionLog(input));
  return toolCallbackResultFactory(entry);
};

export const appendSessionLogConfig = {
  description:
    'Append a session log entry describing an action performed against the workspace.',
  inputSchema: {
    caseId: workspaceIdSchema,
    actor: z.enum(['system', 'model', 'user']).optional(),
    summary: z.string(),
  },
  outputSchema: toolCallbackResultSchemaFactory(sessionEntrySchema),
};

export const compactWorkspaceCallback = async ({
  caseId,
}: {
  caseId: string;
}) => {
  const summary = await safeHandler(() => compactWorkspace(caseId));
  return toolCallbackResultFactory(summary);
};

export const compactWorkspaceConfig = {
  description:
    'Compact workspace metadata and regenerate all markdown projections for the given case.',
  inputSchema: {
    caseId: workspaceIdSchema,
  },
  outputSchema: toolCallbackResultSchemaFactory(workspaceSummarySchema),
};
