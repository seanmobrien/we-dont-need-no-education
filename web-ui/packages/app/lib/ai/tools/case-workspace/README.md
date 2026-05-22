# Case Workspace MCP Tools

This module provides a semi-persistent case workspace for operational state that is exposed through MCP tools. Workspace data is stored as curated markdown files with structured backing metadata.

## Storage Model

- Base path: `CASE_WORKSPACE_ROOT` env var (defaults to `<repo>/cases`)
- Layout: `<CASE_WORKSPACE_ROOT>/{caseId}/workspace/{overview,tasks,document-summaries,open-questions,timeline-notes,session-log,metadata.json}`
- Markdown files are regenerated from `metadata.json` on each write to keep projections consistent.

## Available Tools

- `getCaseWorkspace` — summary of file status, task counts, and last update
- `readWorkspaceFile` — read any workspace markdown or metadata file
- `appendWorkspaceTask`, `updateWorkspaceTaskStatus`, `updateWorkspaceTaskDetails`
- `upsertWorkspaceDocumentSummary`
- `addOpenQuestion`, `updateOpenQuestionStatus`
- `appendWorkspaceSessionLog`
- `compactWorkspace`

## Notes

- Task IDs are generated with a `TASK-` prefix for stability.
- Session log entries are appended automatically on write operations.
- Tests set `CASE_WORKSPACE_ROOT` to `/tmp/case-workspace-tests` to avoid polluting the repo.
