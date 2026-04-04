/**
 * @jest-environment node
 */

import path from 'path';
import { promises as fs } from 'fs';
import {
  appendWorkspaceSessionLog,
  appendWorkspaceTask,
  getCaseWorkspaceSummary,
  readWorkspaceFile,
  addWorkspaceQuestion,
  updateWorkspaceQuestionStatus,
  updateWorkspaceTaskStatus,
  upsertWorkspaceDocumentSummary,
} from '../../../../../lib/ai/tools/case-workspace/workspace-service';
import { resolveWorkspacePaths } from '../../../../../lib/ai/tools/case-workspace/workspace-storage';

describe('case workspace service', () => {
  const workspaceRoot = path.join('/tmp', 'case-workspace-tests');

  beforeEach(async () => {
    process.env.CASE_WORKSPACE_ROOT = workspaceRoot;
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  });

  afterAll(async () => {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  });

  it('initializes workspace and returns summary', async () => {
    const summary = await getCaseWorkspaceSummary('CASE-001');
    expect(summary.caseId).toBe('CASE-001');
    expect(summary.taskCounts.inbox).toBe(0);
    const paths = resolveWorkspacePaths('CASE-001');
    await expect(fs.access(paths.tasks)).resolves.not.toThrow();
    const tasksFile = await readWorkspaceFile('CASE-001', 'tasks');
    expect(tasksFile.content).toContain('# Tasks');
  });

  it('adds a task and updates status', async () => {
    const task = await appendWorkspaceTask({
      caseId: 'CASE-002',
      title: 'Review therapist email',
      status: 'ready',
    });
    expect(task.taskId).toMatch(/^TASK-/);

    const summaryAfterAdd = await getCaseWorkspaceSummary('CASE-002');
    expect(summaryAfterAdd.taskCounts.ready).toBe(1);

    await updateWorkspaceTaskStatus({
      caseId: 'CASE-002',
      taskId: task.taskId,
      status: 'done',
    });
    const summaryAfterStatus = await getCaseWorkspaceSummary('CASE-002');
    expect(summaryAfterStatus.taskCounts.done).toBe(1);

    const tasksFile = await readWorkspaceFile('CASE-002', 'tasks');
    expect(tasksFile.content).toContain(task.taskId);
  });

  it('upserts document summaries and questions', async () => {
    const summary = await upsertWorkspaceDocumentSummary('CASE-003', {
      caseId: 'CASE-003',
      documentId: 'DOC-0143',
      title: 'Therapist Email',
      summary: 'Provider acknowledged changes.',
      status: 'reviewed',
    });
    expect(summary.documentId).toBe('DOC-0143');

    const question = await addWorkspaceQuestion({
      caseId: 'CASE-003',
      question: 'What exactly was stated during the session?',
      type: 'factual',
    });
    expect(question.questionId).toMatch(/^Q-/);

    const updatedQuestion = await updateWorkspaceQuestionStatus({
      caseId: 'CASE-003',
      questionId: question.questionId,
      status: 'investigating',
    });
    expect(updatedQuestion.status).toBe('investigating');

    const docFile = await readWorkspaceFile('CASE-003', 'documentSummaries');
    expect(docFile.content).toContain('DOC-0143');
    const questionsFile = await readWorkspaceFile('CASE-003', 'openQuestions');
    expect(questionsFile.content).toContain(question.questionId);
  });

  it('appends session log entries', async () => {
    await appendWorkspaceSessionLog({
      caseId: 'CASE-004',
      actor: 'model',
      summary: 'Initialized workspace',
    });
    const logFile = await readWorkspaceFile('CASE-004', 'sessionLog');
    expect(logFile.content).toContain('Initialized workspace');
  });
});
