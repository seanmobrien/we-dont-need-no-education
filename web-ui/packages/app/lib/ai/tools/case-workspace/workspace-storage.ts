import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  type TaskStatus,
  type WorkspaceDocumentSummary,
  type WorkspaceMetadata,
  type WorkspaceQuestion,
  type WorkspaceSessionEntry,
  type WorkspaceTask,
} from './types';
import { LoggedError, log } from '@compliance-theater/logger';

const DEFAULT_SCHEMA_VERSION = '2026-04-03';
const getWorkspaceRoot = () =>
  process.env.CASE_WORKSPACE_ROOT ?? path.join(process.cwd(), 'cases');

type WorkspacePaths = {
  baseDir: string;
  overview: string;
  tasks: string;
  documentSummaries: string;
  openQuestions: string;
  timelineNotes: string;
  sessionLog: string;
  metadata: string;
};
export type WorkspaceFileName = Exclude<keyof WorkspacePaths, 'baseDir'>;

const orderedTaskStatuses: TaskStatus[] = [
  'inbox',
  'ready',
  'in_progress',
  'blocked',
  'done',
  'deferred',
];

const sectionLabels: Record<TaskStatus, string> = {
  inbox: 'Inbox',
  ready: 'Ready',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  done: 'Done',
  deferred: 'Deferred',
};

const questionSections: Record<
  WorkspaceQuestion['type'],
  string
> = {
  factual: 'Factual',
  legal: 'Legal / Compliance',
  evidentiary: 'Missing Evidence',
  process: 'Process',
};

const cleanCaseId = (caseId: string): string =>
  caseId.replace(/[^A-Za-z0-9._-]/g, '_');

export const resolveWorkspacePaths = (caseId: string): WorkspacePaths => {
  const safeCaseId = cleanCaseId(caseId);
  const baseDir = path.join(
    getWorkspaceRoot(),
    'cases',
    safeCaseId,
    'workspace',
  );
  return {
    baseDir,
    overview: path.join(baseDir, 'overview.md'),
    tasks: path.join(baseDir, 'tasks.md'),
    documentSummaries: path.join(baseDir, 'document-summaries.md'),
    openQuestions: path.join(baseDir, 'open-questions.md'),
    timelineNotes: path.join(baseDir, 'timeline-notes.md'),
    sessionLog: path.join(baseDir, 'session-log.md'),
    metadata: path.join(baseDir, 'metadata.json'),
  };
};

const defaultMetadata = (
  caseId: string,
  paths: WorkspacePaths,
): WorkspaceMetadata => {
  const now = new Date().toISOString();
  return {
    schemaVersion: DEFAULT_SCHEMA_VERSION,
    caseId,
    lastUpdated: now,
    files: {
      overview: { path: paths.overview, updatedAt: now },
      tasks: { path: paths.tasks, updatedAt: now },
      documentSummaries: { path: paths.documentSummaries, updatedAt: now },
      openQuestions: { path: paths.openQuestions, updatedAt: now },
      timelineNotes: { path: paths.timelineNotes, updatedAt: now },
      sessionLog: { path: paths.sessionLog, updatedAt: now },
      metadata: { path: paths.metadata, updatedAt: now },
    },
    tasks: [],
    documentSummaries: [],
    questions: [],
    sessionLog: [],
  };
};

const checksum = (content: string): string =>
  crypto.createHash('sha1').update(content).digest('hex');

const renderTasksMarkdown = (tasks: WorkspaceTask[]): string => {
  const byStatus: Record<TaskStatus, WorkspaceTask[]> = {
    inbox: [],
    ready: [],
    in_progress: [],
    blocked: [],
    done: [],
    deferred: [],
  };
  for (const task of tasks) {
    byStatus[task.status]?.push(task);
  }
  return [
    '# Tasks',
    ...orderedTaskStatuses.map((status) => {
      const rows = byStatus[status] ?? [];
      const lines = rows.map((task) => {
        const checkbox = task.status === 'done' ? '[x]' : '[ ]';
        const header = `- ${checkbox} ${task.taskId} | ${task.title}`;
        const detailLines: string[] = [];
        if (task.description) {
          detailLines.push(`  - Description: ${task.description}`);
        }
        if (task.priority) {
          detailLines.push(`  - Priority: ${task.priority}`);
        }
        if (task.owner) {
          detailLines.push(`  - Owner: ${task.owner}`);
        }
        if (task.blockedReason && task.status === 'blocked') {
          detailLines.push(`  - Blocked reason: ${task.blockedReason}`);
        }
        if (task.tags?.length) {
          detailLines.push(`  - Tags: ${task.tags.join(', ')}`);
        }
        return [header, ...detailLines].join('\n');
      });
      return [`\n## ${sectionLabels[status]}`, lines.join('\n') || '- [ ]'].join(
        '\n',
      );
    }),
    '',
  ].join('\n');
};

const renderDocumentSummariesMarkdown = (
  summaries: WorkspaceDocumentSummary[],
): string => {
  if (!summaries.length) {
    return ['# Document Summaries', '\n_No document summaries yet._\n'].join(
      '\n',
    );
  }
  const blocks = summaries.map((summary) => {
    const title = summary.title ? ` — ${summary.title}` : '';
    const date = summary.date ? ` — ${summary.date}` : '';
    const header = `## ${summary.documentId}${title}${date}`;
    const relevance =
      summary.relevance && summary.relevance.length
        ? `\n\nPotential relevance:\n- ${summary.relevance.join('\n- ')}`
        : '';
    return [
      header,
      `Status: ${summary.status}`,
      `Last refreshed: ${summary.lastRefreshedAt}`,
      summary.sourceSummaryId
        ? `Canonical summary id: ${summary.sourceSummaryId}`
        : undefined,
      '',
      'Summary:',
      `- ${summary.summary}`,
      relevance,
    ]
      .filter(Boolean)
      .join('\n');
  });
  return ['# Document Summaries', '', blocks.join('\n\n'), ''].join('\n');
};

const renderOpenQuestionsMarkdown = (
  questions: WorkspaceQuestion[],
): string => {
  const grouped: Record<WorkspaceQuestion['type'], WorkspaceQuestion[]> = {
    factual: [],
    legal: [],
    evidentiary: [],
    process: [],
  };
  for (const q of questions) {
    grouped[q.type]?.push(q);
  }
  const blocks = (Object.keys(grouped) as Array<WorkspaceQuestion['type']>).map(
    (type) => {
      const entries = grouped[type];
      const sectionName = questionSections[type];
      if (!entries.length) {
        return `## ${sectionName}\n- None`;
      }
      const lines = entries.map((q) => {
        const needed =
          q.notes && q.notes.trim().length
            ? `  - Notes: ${q.notes}`
            : undefined;
        return [`- ${q.questionId}: ${q.question}`, `  - Status: ${q.status}`, needed]
          .filter(Boolean)
          .join('\n');
      });
      return [`## ${sectionName}`, ...lines].join('\n');
    },
  );
  return ['# Open Questions', '', blocks.join('\n\n'), ''].join('\n');
};

const renderSessionLogMarkdown = (entries: WorkspaceSessionEntry[]): string => {
  const lines = entries.map(
    (entry) => `- ${entry.timestamp} | ${entry.actor} | ${entry.summary}`,
  );
  return ['# Session Log', '', lines.join('\n') || '- None yet', ''].join('\n');
};

const renderOverviewMarkdown = (
  metadata: WorkspaceMetadata,
): string => {
  const now = new Date().toISOString();
  const recentChange =
    metadata.sessionLog.at(-1)?.timestamp ?? metadata.lastUpdated;
  const statusLine = `- Overall status: active`;
  const phaseLine = `- Current phase: investigation`;
  const lastUpdatedLine = `- Last updated: ${recentChange}`;
  const objective =
    metadata.tasks.find((t) => t.status === 'in_progress')?.title ??
    'Stabilize current case workspace';
  return [
    '# Case Overview',
    '',
    '## Status',
    statusLine,
    phaseLine,
    lastUpdatedLine,
    '',
    '## Current Objectives',
    `- ${objective}`,
    '',
    '## Key Risks / Blockers',
    metadata.tasks.some((t) => t.status === 'blocked')
      ? metadata.tasks
        .filter((t) => t.status === 'blocked')
        .map((t) => `- ${t.taskId}: ${t.blockedReason ?? t.title}`)
        .join('\n')
      : '- None recorded',
    '',
    '## Recent Changes',
    `- ${now.split('T')[0]}: Workspace refreshed`,
    '',
    '## Next Recommended Action',
    '- Review tasks and document summaries',
    '',
  ].join('\n');
};

const renderTimelineNotesMarkdown = (): string =>
  ['# Timeline Notes', '', '- Add noteworthy timeline entries here.', ''].join(
    '\n',
  );

const writeFileWithMetadata = async (
  filePath: string,
  content: string,
  metadata: WorkspaceMetadata,
  key: keyof WorkspaceMetadata['files'],
) => {
  await fs.writeFile(filePath, content, 'utf-8');
  metadata.files[key].updatedAt = new Date().toISOString();
  metadata.files[key].checksum = checksum(content);
};

export const persistWorkspace = async (
  metadata: WorkspaceMetadata,
  paths: WorkspacePaths,
): Promise<WorkspaceMetadata> => {
  const updatedTimestamp = new Date().toISOString();
  metadata.lastUpdated = updatedTimestamp;
  await fs.mkdir(paths.baseDir, { recursive: true });
  await writeFileWithMetadata(
    paths.tasks,
    renderTasksMarkdown(metadata.tasks),
    metadata,
    'tasks',
  );
  await writeFileWithMetadata(
    paths.documentSummaries,
    renderDocumentSummariesMarkdown(metadata.documentSummaries),
    metadata,
    'documentSummaries',
  );
  await writeFileWithMetadata(
    paths.openQuestions,
    renderOpenQuestionsMarkdown(metadata.questions),
    metadata,
    'openQuestions',
  );
  await writeFileWithMetadata(
    paths.sessionLog,
    renderSessionLogMarkdown(metadata.sessionLog),
    metadata,
    'sessionLog',
  );
  await writeFileWithMetadata(
    paths.overview,
    renderOverviewMarkdown(metadata),
    metadata,
    'overview',
  );
  if (!(await fileExists(paths.timelineNotes))) {
    await writeFileWithMetadata(
      paths.timelineNotes,
      renderTimelineNotesMarkdown(),
      metadata,
      'timelineNotes',
    );
  }
  metadata.files.metadata = {
    ...metadata.files.metadata,
    path: paths.metadata,
    updatedAt: updatedTimestamp,
  };
  const metaBodyForChecksum = JSON.stringify(metadata, null, 2);
  metadata.files.metadata.checksum = crypto
    .createHash('sha256')
    .update(metaBodyForChecksum)
    .digest('hex');
  const finalMetaBody = JSON.stringify(metadata, null, 2);
  await fs.writeFile(paths.metadata, finalMetaBody, 'utf-8');
  return metadata;
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

export const loadWorkspace = async (
  caseId: string,
): Promise<{ metadata: WorkspaceMetadata; paths: WorkspacePaths }> => {
  const paths = resolveWorkspacePaths(caseId);
  await fs.mkdir(paths.baseDir, { recursive: true });
  let metadata = defaultMetadata(caseId, paths);
  if (await fileExists(paths.metadata)) {
    try {
      const raw = await fs.readFile(paths.metadata, 'utf-8');
      metadata = { ...metadata, ...JSON.parse(raw) };
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        source: 'case-workspace:load',
        log: true,
        data: { caseId },
      });
    }
  }
  // Ensure file map paths stay accurate even if metadata existed
  metadata.files = {
    overview: metadata.files?.overview ?? { path: paths.overview },
    tasks: metadata.files?.tasks ?? { path: paths.tasks },
    documentSummaries:
      metadata.files?.documentSummaries ?? { path: paths.documentSummaries },
    openQuestions:
      metadata.files?.openQuestions ?? { path: paths.openQuestions },
    timelineNotes:
      metadata.files?.timelineNotes ?? { path: paths.timelineNotes },
    sessionLog: metadata.files?.sessionLog ?? { path: paths.sessionLog },
    metadata: metadata.files?.metadata ?? { path: paths.metadata },
  };
  return { metadata, paths };
};

export const summarizeWorkspace = (
  metadata: WorkspaceMetadata,
) => {
  const counts: Record<TaskStatus, number> = {
    inbox: 0,
    ready: 0,
    in_progress: 0,
    blocked: 0,
    done: 0,
    deferred: 0,
  };
  for (const task of metadata.tasks) {
    counts[task.status] += 1;
  }
  return {
    caseId: metadata.caseId,
    files: Object.entries(metadata.files).map(([name, info]) => ({
      name,
      path: info.path,
      updatedAt: info.updatedAt,
      exists: Boolean(info.path),
      checksum: info.checksum,
    })),
    taskCounts: counts,
    documentSummaries: metadata.documentSummaries.length,
    openQuestions: metadata.questions.length,
    lastUpdated: metadata.lastUpdated,
  };
};

export const saveWorkspace = async (
  metadata: WorkspaceMetadata,
  paths: WorkspacePaths,
): Promise<WorkspaceMetadata> => persistWorkspace(metadata, paths);

export const appendSessionEntry = (
  metadata: WorkspaceMetadata,
  summary: string,
  actor: WorkspaceSessionEntry['actor'] = 'model',
) => {
  const entry: WorkspaceSessionEntry = {
    timestamp: new Date().toISOString(),
    actor,
    summary,
  };
  metadata.sessionLog.push(entry);
  return entry;
};

export const updateTasks = (
  metadata: WorkspaceMetadata,
  tasks: WorkspaceTask[],
) => {
  metadata.tasks = tasks;
};

export const updateDocumentSummaries = (
  metadata: WorkspaceMetadata,
  summaries: WorkspaceDocumentSummary[],
) => {
  metadata.documentSummaries = summaries;
};

export const updateQuestions = (
  metadata: WorkspaceMetadata,
  questions: WorkspaceQuestion[],
) => {
  metadata.questions = questions;
};

export const normalizeTaskId = (taskId: string): string => {
  if (taskId.toUpperCase().startsWith('TASK-')) {
    return taskId.toUpperCase();
  }
  return `TASK-${taskId.toUpperCase()}`;
};

export const generateTaskId = (): string =>
  `TASK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

export const generateQuestionId = (): string =>
  `Q-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

export const generateDocumentSummary = (
  documentId: string,
  caseId: string,
): WorkspaceDocumentSummary => {
  const now = new Date().toISOString();
  return {
    caseId,
    documentId,
    summary: 'Pending summary',
    status: 'draft',
    lastRefreshedAt: now,
    updatedAt: now,
  };
};

export const readWorkspaceFile = async (
  caseId: string,
  file: WorkspaceFileName,
): Promise<string> => {
  const { paths } = await loadWorkspace(caseId);
  const target = paths[file];
  const exists = await fileExists(target);
  if (!exists) {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, '', 'utf-8');
  }
  return fs.readFile(target, 'utf-8');
};

export const logWorkspaceError = (error: unknown, source: string) => {
  LoggedError.isTurtlesAllTheWayDownBaby(error, {
    source,
    log: true,
  });
  log((l) =>
    l.error('case-workspace error', {
      source,
      error,
    }),
  );
};
