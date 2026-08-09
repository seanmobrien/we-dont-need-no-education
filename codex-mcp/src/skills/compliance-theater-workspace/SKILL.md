---
name: compliance-theater-workspace
description: Use the local Compliance Theater evidence workspace rules from the active project/workspace root. Trigger when a user asks to add, update, retire, delete, navigate, reconcile, or index case theories, complaint workspaces, final sent complaints, report-like outputs, contacts, communication plans, evidence indexes, violation inventories, Neo4j case-theory anchors, or workspace provenance files.
---

# Compliance Theater Workspace

Use this skill when working in a Compliance Theater evidence-and-output workspace.

## Core Rules

1. Resolve the workspace root from the active project first. Use the current `cwd` or nearest ancestor that contains workspace markers such as `indexes/`, `case_theories.md`, `case_theories/`, `final-complaints/`, or `report_output/`. Use hardcoded paths only when the user explicitly gives one.
2. Treat the workspace as an evidence-and-output repository. Prefer durable evidence, current indexes, final PDFs, and final report outputs over draft markdown, temporary folders, or scripts.
3. Use concrete provenance for factual claims: source file, email thread, index row, exhibit, complaint PDF, report output, Gmail ID, or Neo4j case-file ID.
4. Treat case theories as investigative planning aids, not final legal conclusions.
5. Update the relevant index immediately when files are added, moved, removed, materially revised, or promoted to final output.
6. Read [workspace-rules.md](references/workspace-rules.md) when the task touches case theories, indexes, final complaints, report outputs, contacts, communications, workspace cleanup, or evidence hierarchy.

## Routing

- Case theories: start with `case_theories.md`, `case_theories/<slug>/theory.md`, `indexes/case_theories_index.xlsx`, and `case_theories/CASE_THEORY_ANCHORS.md`.
- Evidence review: start with `indexes/plsas_pst_master_index.xlsx`, `plsas_pst/attachments/`, and extracted `.txt` sidecars.
- Violation analysis: start with `indexes/Compliance_Theater_2000_Full_Violation_Instance_Inventory.csv` or `.html`, then relevant case theories and source evidence.
- Complaint work: start with `indexes/final_complaints_index.xlsx` and `final-complaints/`; use indexed working directories for drafts.
- Report work: start with `report_output/` and `indexes/report_outputs_index.xlsx`.
- Contacts: start with `contacts/README.md` and `contacts/<category>/<contact_slug>/CONTACT.md`; treat contact notes as research leads, not final proof.
- Communications planning: read `communications/AGENTS.md` before acting in `communications/`; use its scoped state surfaces for inbox status, graph state, plans, scheduled responses, and formal request drafts.

## Case Theory Shortcut

When the user asks to add a case theory:

1. Create `case_theories/<short-slug>/theory.md` from the required sections.
2. Add or update `indexes/case_theories_index.xlsx`; assign the next unused `CTH-###` for new theories.
3. Keep evidence citations concrete.
4. Add or update a durable Neo4j `case_theory` anchor when case-file documents support the theory.
5. Log index or cleanup actions in `INDEX_BUILD_LOG.md` when the change affects workspace provenance.

When the user asks to delete a case theory, prefer retirement over deletion unless they explicitly ask to remove files. See [workspace-rules.md](references/workspace-rules.md) for the full delete/retire checklist.

## Output Placement Shortcut

- Put final report-like outputs in `report_output/` and update `indexes/report_outputs_index.xlsx`.
- Put final sent complaint PDFs or packets in `final-complaints/` and update `indexes/final_complaints_index.xlsx`.
- Keep drafts, working folders, generated previews, caches, and scripts out of final-output status unless explicitly promoted and indexed.
