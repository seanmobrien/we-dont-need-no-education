import {
  appendSessionEntry,
  generateDocumentSummary,
  generateQuestionId,
  generateTaskId,
  loadWorkspace,
  normalizeTaskId,
  readWorkspaceFile as readWorkspaceFileFromDisk,
  resolveWorkspacePaths,
  saveWorkspace,
  summarizeWorkspace,
  updateDocumentSummaries,
  updateQuestions,
  updateTasks,
} from './workspace-storage';
import {
  type TaskPriority,
  type TaskStatus,
  type WorkspaceDocumentSummary,
  type WorkspaceMetadata,
  type WorkspaceQuestion,
  type WorkspaceSessionEntry,
  type WorkspaceTask,
} from './types';

type WorkspaceFileKey =
  | 'overview'
  | 'tasks'
  | 'documentSummaries'
  | 'openQuestions'
  | 'timelineNotes'
  | 'sessionLog'
  | 'metadata';

const ensureWorkspace = async (caseId: string) => {
  const { metadata, paths } = await loadWorkspace(caseId);
  await saveWorkspace(metadata, paths);
  return { metadata, paths };
};

export const getCaseWorkspaceSummary = async (caseId: string) => {
  const { metadata } = await ensureWorkspace(caseId);
  return summarizeWorkspace(metadata);
};

export const readWorkspaceFile = async (
  caseId: string,
  file: WorkspaceFileKey,
): Promise<{ content: string; path: string }> => {
  const paths = resolveWorkspacePaths(caseId);
  await ensureWorkspace(caseId);
  const content = await readWorkspaceFileFromDisk(caseId, file);
  return { content, path: paths[file] };
};

const upsertTask = (
  metadata: WorkspaceMetadata,
  task: WorkspaceTask,
) => {
  const existingIndex = metadata.tasks.findIndex(
    (t) => normalizeTaskId(t.taskId) === normalizeTaskId(task.taskId),
  );
  if (existingIndex >= 0) {
    metadata.tasks[existingIndex] = task;
  } else {
    metadata.tasks.push(task);
  }
};

export const appendWorkspaceTask = async ({
  caseId,
  title,
  description,
  status = 'inbox',
  priority,
  owner,
  relatedDocumentIds,
  relatedQuestionIds,
  tags,
}: {
  caseId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  owner?: WorkspaceTask['owner'];
  relatedDocumentIds?: string[];
  relatedQuestionIds?: string[];
  tags?: string[];
}) => {
  const { metadata, paths } = await ensureWorkspace(caseId);
  const now = new Date().toISOString();
  const task: WorkspaceTask = {
    taskId: generateTaskId(),
    caseId,
    title,
    description,
    status,
    priority,
    owner,
    relatedDocumentIds,
    relatedQuestionIds,
    createdAt: now,
    updatedAt: now,
    tags,
  };
  upsertTask(metadata, task);
  appendSessionEntry(metadata, `Added task ${task.taskId}: ${title}`);
  await saveWorkspace(metadata, paths);
  return task;
};

export const updateWorkspaceTaskStatus = async ({
  caseId,
  taskId,
  status,
  blockedReason,
}: {
  caseId: string;
  taskId: string;
  status: TaskStatus;
  blockedReason?: string;
}) => {
  const { metadata, paths } = await ensureWorkspace(caseId);
  const targetId = normalizeTaskId(taskId);
  const task = metadata.tasks.find(
    (t) => normalizeTaskId(t.taskId) === targetId,
  );
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }
  task.status = status;
  task.blockedReason = status === 'blocked' ? blockedReason : undefined;
  const now = new Date().toISOString();
  if (status === 'done') {
    task.completedAt = now;
  }
  task.updatedAt = now;
  appendSessionEntry(metadata, `Updated task ${task.taskId} -> ${status}`);
  await saveWorkspace(metadata, paths);
  return task;
};

export const updateWorkspaceTaskDetails = async ({
  caseId,
  taskId,
  title,
  description,
  priority,
  owner,
  tags,
}: {
  caseId: string;
  taskId: string;
  title?: string;
  description?: string;
  priority?: TaskPriority;
  owner?: WorkspaceTask['owner'];
  tags?: string[];
}) => {
  const { metadata, paths } = await ensureWorkspace(caseId);
  const targetId = normalizeTaskId(taskId);
  const task = metadata.tasks.find(
    (t) => normalizeTaskId(t.taskId) === targetId,
  );
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }
  if (title) task.title = title;
  if (description !== undefined) task.description = description;
  if (priority) task.priority = priority;
  if (owner) task.owner = owner;
  if (tags) task.tags = tags;
  task.updatedAt = new Date().toISOString();
  appendSessionEntry(metadata, `Updated task ${task.taskId} details`);
  await saveWorkspace(metadata, paths);
  return task;
};

export const upsertWorkspaceDocumentSummary = async (
  caseId: string,
  summary: Omit<WorkspaceDocumentSummary, 'caseId' | 'lastRefreshedAt' | 'updatedAt'> & {
    lastRefreshedAt?: string;
  },
) => {
  const { metadata, paths } = await ensureWorkspace(caseId);
  const now = new Date().toISOString();
  const existingIndex = metadata.documentSummaries.findIndex(
    (d) => d.documentId === summary.documentId,
  );
  const record: WorkspaceDocumentSummary = {
    ...generateDocumentSummary(summary.documentId, caseId),
    ...summary,
    caseId,
    lastRefreshedAt: summary.lastRefreshedAt ?? now,
    updatedAt: now,
  };
  if (existingIndex >= 0) {
    metadata.documentSummaries[existingIndex] = record;
  } else {
    metadata.documentSummaries.push(record);
  }
  appendSessionEntry(
    metadata,
    `Updated document summary for ${summary.documentId}`,
  );
  await saveWorkspace(metadata, paths);
  return record;
};

export const addWorkspaceQuestion = async ({
  caseId,
  question,
  type,
  status = 'open',
  relatedDocumentIds,
  notes,
}: {
  caseId: string;
  question: string;
  type: WorkspaceQuestion['type'];
  status?: WorkspaceQuestion['status'];
  relatedDocumentIds?: string[];
  notes?: string;
}) => {
  const { metadata, paths } = await ensureWorkspace(caseId);
  const now = new Date().toISOString();
  const questionRecord: WorkspaceQuestion = {
    questionId: generateQuestionId(),
    caseId,
    question,
    type,
    status,
    relatedDocumentIds,
    notes,
    createdAt: now,
    updatedAt: now,
  };
  metadata.questions.push(questionRecord);
  appendSessionEntry(metadata, `Added question ${questionRecord.questionId}`);
  await saveWorkspace(metadata, paths);
  return questionRecord;
};

export const updateWorkspaceQuestionStatus = async ({
  caseId,
  questionId,
  status,
  notes,
}: {
  caseId: string;
  questionId: string;
  status: WorkspaceQuestion['status'];
  notes?: string;
}) => {
  const { metadata, paths } = await ensureWorkspace(caseId);
  const target = metadata.questions.find((q) => q.questionId === questionId);
  if (!target) {
    throw new Error(`Question not found: ${questionId}`);
  }
  target.status = status;
  target.notes = notes ?? target.notes;
  const now = new Date().toISOString();
  target.updatedAt = now;
  if (status === 'resolved') {
    target.resolvedAt = now;
  }
  appendSessionEntry(metadata, `Updated question ${questionId} -> ${status}`);
  await saveWorkspace(metadata, paths);
  return target;
};

export const appendWorkspaceSessionLog = async ({
  caseId,
  actor = 'model',
  summary,
}: {
  caseId: string;
  actor?: WorkspaceSessionEntry['actor'];
  summary: string;
}) => {
  const { metadata, paths } = await ensureWorkspace(caseId);
  const entry = appendSessionEntry(metadata, summary, actor);
  await saveWorkspace(metadata, paths);
  return entry;
};

export const compactWorkspace = async (caseId: string) => {
  const { metadata, paths } = await ensureWorkspace(caseId);
  const uniqueTasks = dedupeById(metadata.tasks, (t) =>
    normalizeTaskId(t.taskId),
  );
  const uniqueQuestions = dedupeById(metadata.questions, (q) => q.questionId);
  const uniqueDocs = dedupeById(
    metadata.documentSummaries,
    (d) => d.documentId,
  );
  updateTasks(metadata, uniqueTasks);
  updateQuestions(metadata, uniqueQuestions);
  updateDocumentSummaries(metadata, uniqueDocs);
  appendSessionEntry(metadata, 'Compacted workspace metadata', 'system');
  metadata.lastCompacted = new Date().toISOString();
  await saveWorkspace(metadata, paths);
  return summarizeWorkspace(metadata);
};

const dedupeById = <T>(items: T[], getId: (item: T) => string): T[] => {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const id = getId(item);
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(item);
  }
  return result;
};
