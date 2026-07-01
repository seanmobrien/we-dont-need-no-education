# Compliance Theater Workspace Rules

Workspace root: resolve from the active project/workspace root.

Do not assume a hardcoded absolute path. Start from the current `cwd` or user-provided path and use the nearest ancestor that looks like the Compliance Theater evidence workspace. Workspace markers include `indexes/`, `case_theories.md`, `case_theories/`, `final-complaints/`, `report_output/`, `INDEX_BUILD_LOG.md`, and scoped `AGENTS.md` instructions.

When the active project is a tooling repository rather than the evidence workspace, use the workspace path supplied by the user or repo instructions. If no evidence workspace can be found, ask for the workspace root before editing files.

## Authority Model

Use this order when facts conflict:

1. Raw evidence in `plsas_pst/` and `plsas_pst/attachments/`.
2. Extracted attachment `.txt` sidecars.
3. Current indexes under `indexes/`.
4. Exploratory theory-building in `case_theories.md` and `case_theories/<slug>/theory.md`.
5. Final agency-facing outputs in `final-complaints/` and final report outputs in `report_output/`.
6. Operational research notes in `contacts/` and communications planning state in `communications/`; use these as leads unless they cite underlying evidence.

If an index or theory note conflicts with raw evidence, trust the evidence, name the mismatch, and update the affected index or note when the user asks for a workspace change.

## Durable Workspace Surfaces

All paths below are relative to the resolved workspace root.

- `indexes/plsas_pst_master_index.xlsx`: PST-derived evidence, imported Gmail evidence tabs, attachment inventory, and sidecar status.
- `plsas_pst/attachments/`: attachment corpus and `.txt` sidecars.
- `indexes/Compliance_Theater_2000_Full_Violation_Instance_Inventory.csv` and `.html`: current violation-instance inventory.
- `indexes/final_complaints_index.xlsx`: final complaint PDFs/packets, sidecars, agency labels, status, and working-directory references.
- `indexes/report_outputs_index.xlsx`: files currently present under `report_output/`, including final report-like outputs and retained inventories.
- `case_theories.md`: lightweight navigation surface for active theories.
- `case_theories/<slug>/theory.md`: detailed theory scratchpads.
- `indexes/case_theories_index.xlsx`: active case-theory folders, theory files, supporting matrices, and stable `CTH-###` IDs.
- `case_theories/CASE_THEORY_ANCHORS.md`: Neo4j case-theory anchor convention and retrieval query.
- `case_theories/case_theory_anchor_manifest_2026-05-28.csv`: current graph anchor count/index file.
- `final-complaints/`: final PDF complaints and packets.
- `report_output/`: final report-like outputs.
- `contacts/`: contact research notes in `contacts/<category>/<contact_slug>/CONTACT.md`.
- `communications/`: communication planning, state, graph, request-drafting, and scheduled-response surfaces.
- `INDEX_BUILD_LOG.md`: provenance log for index rebuilds, cleanup passes, and notable workspace reconciliation.

## Case Theories

Case theories are investigative planning aids. They do not state final legal conclusions, and they should be checked against the underlying evidence before being used in any final complaint, report, or agency-facing communication. Detailed scratchpads live in `case_theories/<theory-slug>/theory.md`, with the active-theory workbook maintained at `indexes/case_theories_index.xlsx`.

### Required Theory Shape

Every `theory.md` should include at least:

- Title.
- Status/disposition.
- Stable theory ID, if assigned: `CTH-###`.
- Confidence rating from `-10` to `10`.
- Theory type.
- Primary legal frames.
- Related theories.
- Created and last-reviewed dates.
- Core theory.
- Two-sentence summary.
- Supporting evidence table or key source documents.
- Open questions or risks/counterarguments.
- Next action or next evidence steps.
- Requested cure/use when known.
- Neo4j case-theory key and anchor query when anchored.

Use the local template at `case_theories/_template/theory.md` as the starting shape.

### Adding A Theory

1. Choose a short slug using lowercase words and hyphens, for example `homs-redacted-reports-policy-103-routing`.
2. Create `case_theories/<short-slug>/theory.md`.
3. Include the required theory shape above.
4. Add or update the corresponding row in `indexes/case_theories_index.xlsx`.
5. Assign the next unused `CTH-###` ID for a new active theory. Do not renumber existing IDs.
6. Update `case_theories.md` if it should appear in the lightweight active-theory navigation table.
7. Keep evidence citations concrete: source file, email thread, index row, exhibit, complaint PDF, final report output, Gmail ID, or Neo4j case-file ID.
8. Treat draft notes as exploratory unless and until source evidence supports the conclusion.
9. Link related case-file documents together with a durable Neo4j anchor when graph support exists.
10. Log the index/provenance change in `INDEX_BUILD_LOG.md` when the addition materially changes workspace navigation or indexing.

### Neo4j Case-Theory Anchors

Use this pattern for graph-backed theory sets:

```cypher
(d:case_file_document)-[:case_theory {theory_key: "..."}]->(t:case_theory)
```

Relationship metadata may include:

- `theory_key`
- `sequence`
- `role`
- `note`
- `updated_by`
- `anchor_match_methods`
- `anchor_search_terms`
- `anchor_max_score`
- `workspace_path`
- `attribute`

Use this query to retrieve a theory-specific responsive set:

```cypher
MATCH (d:case_file_document)-[r:case_theory {theory_key:$theory_key}]->(t:case_theory)
RETURN d.case_file AS case_file,
       d.email_id AS email_id,
       d.thread_id AS thread_id,
       d.subject_or_title AS title,
       d.email_sender_name AS sender,
       coalesce(d.sent_timestamp,d.email_sent_timestamp,d.created_on) AS sent_at,
       r.anchor_match_methods AS match_methods,
       r.anchor_search_terms AS match_terms,
       r.anchor_max_score AS match_score,
       r.sequence AS sequence,
       r.role AS role,
       r.note AS note
ORDER BY coalesce(r.sequence, 999999), sent_at, toInteger(d.case_file)
```

Theory-key convention:

- Convert slug hyphens to underscores for `theory_key`, unless an existing theory file or manifest already defines a different key.
- Treat human shorthand such as `case_theory(homs-redacted-reports-policy-103-routing)` as referring to the workspace slug.
- Example: `homs-redacted-reports-policy-103-routing` currently resolves to canonical Neo4j `theory_key` `homs_redacted_reports_policy_103_routing`.
- Preserve existing keys exactly, for example `improper_records_supporting_correction_denial`.

### Deleting Or Retiring A Theory

Prefer retiring over deleting. Theory folders are provenance, and active conclusions may later need an audit trail.

When retiring:

1. Set disposition to `Retired`, `Superseded`, or `Paused` in `case_theories/<slug>/theory.md`.
2. Add a short retirement note: why it was retired, what supersedes it, and what evidence changed.
3. Update `indexes/case_theories_index.xlsx` so the disposition/status matches the file.
4. Remove or demote the theory from the active table in `case_theories.md`.
5. Preserve the `CTH-###` ID. Do not reuse retired IDs.
6. Leave Neo4j anchors intact unless they are wrong or the user explicitly asks to remove them. Add anchor notes or replacement relationships when needed.
7. Record meaningful retirements in `INDEX_BUILD_LOG.md`.

When deleting files is explicitly requested:

1. Confirm the target slug and files are the intended theory artifacts, especially if the folder contains supporting matrices or source analyses.
2. Prefer moving to an archive location or marking cleanup candidates before permanent deletion.
3. Update `case_theories_index.xlsx`, `case_theories.md`, anchor manifests, and any cross-references.
4. If Neo4j anchors are stale because of the deletion, either leave them with a retired/superseded note or remove them only with explicit user approval.
5. Log the deletion/cleanup in `INDEX_BUILD_LOG.md`.

## Complaint Drafting

When drafting a complaint:

1. Check `indexes/final_complaints_index.xlsx` first for an existing final complaint record and working directory.
2. Use the indexed working directory if one exists.
3. If none exists, create a dedicated transitory working folder and update the workbook `Working Directory` column.
4. Draft in markdown while under review.
5. Render to PDF and merge exhibits only after approval.
6. Move final PDFs or final packets into `final-complaints/` only after approval.
7. Update `final_complaints_index.xlsx` when title, agency, current status, sidecar, final file path, or working directory changes.

Do not describe intermediate markdown or work folders as final when a final PDF exists.

## Final Complaints

Use `final-complaints/` only for final, sent, filed, or otherwise approved PDF-based complaints and packets. Prefer these files over earlier markdown drafts when describing what was sent or filed.

Rules:

- Check `indexes/final_complaints_index.xlsx` before relying on a complaint artifact.
- Track final PDFs, final packets, `.txt` sidecars, agency labels, status/disposition, and complaint-specific working directories in the index.
- Move a complaint PDF or packet into `final-complaints/` only after approval or after confirming it is already the sent/filed copy.
- Keep drafts, exhibit assembly folders, redaction work, and other complaint-building materials in indexed working directories until promoted.
- When title, agency, status, sidecar path, final file path, or working directory changes, update `indexes/final_complaints_index.xlsx`.

## Report Outputs

Use `report_output/` as the final destination for report-like runs: narrative reports, board/governance packets, generated inventories intended as deliverables, rendered PDFs, final HTML reports, and retained report sidecars.

Rules:

- Start report review or report generation tasks with `report_output/` and `indexes/report_outputs_index.xlsx`.
- Update `indexes/report_outputs_index.xlsx` when report outputs are added, moved, removed, renamed, or cleanup candidates are deleted.
- Keep intermediate render previews, page images, temporary analysis folders, and generation scripts out of final-output status unless the task explicitly retains them as QA/provenance artifacts.
- When a report is generated from evidence, include concrete provenance in the report or an adjacent retained sidecar when practical.
- Log material report-output promotions, index rebuilds, or cleanup passes in `INDEX_BUILD_LOG.md`.

## Contacts

Use `contacts/` for operational research notes about people, offices, agencies, systems, and recurring senders/recipients.

Expected structure:

```text
contacts/<category>/<contact_slug>/CONTACT.md
```

Common categories include `district`, `external`, `family`, `school_board`, `state`, and `system`, but use the categories present in the active workspace.

Rules:

- Read `contacts/README.md` first when present.
- Treat `CONTACT.md` files as operational research notes and lead sheets, not final factual findings.
- Before using a contact note in a complaint, report, or agency-facing communication, re-check the cited workbook row, Gmail thread, public source, source message, or sidecar.
- Preserve role/title uncertainty. If a note says a role is public, inferred, historical, or still open to confirmation, carry that qualification forward.
- Update or add a contact note when a task materially changes a person's role, contact details, issue lanes, evidence pointers, or open records targets.

## Communications

Read `communications/AGENTS.md` before editing or relying on communication-state files. Use communication lanes as the planning parent concept; a complaint lane is one lane type, not the only lane type.

Typical state surfaces:

- `communications/inbox-summary.md`: compact view of tracked lanes, disposition, and next-action timing.
- `communications/graph-detailed.md`: evidence-backed communication graph, timelines, relationships, deadline flags, uncertainty notes, and provenance.
- `communications/scheduled-responses.md`: ledger for communications with usable copy plus a send trigger or intended send date.
- `communications/plans/index.md`: index of lane-specific planning scratchpads.
- `communications/work_request/index.csv`: temporary request-building workspaces.
- `communications/communication-general-index.csv`: finalized communication artifacts that do not belong only in a scheduled-response ledger.
- `communications/daily-run-state.md`: operational state for periodic Gmail refreshes and scheduled-response reconciliation.

Rules:

- Keep contemplated or developing communications in `communications/plans/`; do not let plans become a shadow graph.
- Promote a communication to `scheduled-responses.md` only when it has a concrete recipient, usable copy, and a send trigger or intended send time.
- Keep sent, cancelled, superseded, and still-planned scheduled-response state in `scheduled-responses.md`.
- Keep in-progress formal request drafts in `communications/work_request/` and approved request PDFs in `communications/request/` when that structure exists.
- Check Gmail and the communication graph immediately before recommending, scheduling, or sending a due response.
- Ask before sending unless the user has explicitly authorized a different send policy for the current run.
- After confirmed send, scheduling, cancellation, or supersession, update every affected state surface: scheduled ledger, graph, inbox summary, plan, request index, or run state.

## Index Handling

- Update indexes immediately when files are added, moved, removed, materially revised, final PDFs are added, statuses change, sidecars are created, or working directories change.
- `case_theories_index.xlsx` owns active theory folders, theory files, supporting matrices, and stable `CTH-###` IDs.
- `final_complaints_index.xlsx` owns final complaint PDFs/packets, sidecars, agency labels, status, and working-directory references.
- `report_outputs_index.xlsx` owns files currently present under `report_output/`, including final report-like outputs and retained inventories.
- `plsas_pst_master_index.xlsx` owns PST-derived evidence, imported Gmail evidence tabs, attachment inventory, attachment locations, and sidecar status.
- `Compliance_Theater_2000_Full_Violation_Instance_Inventory.csv` and `.html` own the current violation-instance inventory.
- `known_pii.md`, when present, is the PII scan surface and known sensitive-term inventory.
- Indexes may mark cleanup candidates, but remove files only during explicit cleanup passes.
- After cleanup, regenerate the affected index and record the action in `INDEX_BUILD_LOG.md`.

## Final Vs Transitory

- Final: `final-complaints/`, `report_output/`, raw PST evidence, attachment text sidecars, durable indexes.
- Exploratory: `case_theories.md`, `case_theories/<slug>/theory.md`, contact notes, communication plans, draft complaint markdown, working folders.
- Transitory: folders with `work` in the name, caches, OCR page renders, generated preview images, `.pyc`, `__pycache__`, intermediate analysis images, and most scripts unless explicitly tied to retained provenance or final QA.

## Gmail Use

If local evidence, indexes, and sidecars do not provide enough context, use Gmail as supplemental source context. Preserve exact message dates, subjects, senders, Gmail thread IDs, and message IDs when using Gmail evidence.
