---
name: record-investigation
description: Investigate records, case-file evidence, graph relationships, and source documents for correction requests, record disputes, and misleading or false statements made on the record. Trigger when the user asks to research whether an official statement is false, misleading, unsupported, contradicted by maintained records, suitable for a corrections request, or needs enriched evidence from Compliance Theater case files, Neo4j, local sidecars, emails, attachments, policy records, or correction workspaces such as RC-* folders.
---

# Record Investigation

Use this skill to investigate what the maintained record actually shows, especially when preparing or strengthening a correction request. Treat the job as evidence enrichment: discover source records, verify exact text, separate direct proof from similar-pattern evidence, preserve uncertainty, and leave a durable audit trail. For correction requests and complaints, use Neo4j as durable analytical storage when the user asks to draft, migrate, preserve, query, or reuse correction work across sessions.

## Workflow Menu

- **Misleading or false statements on record**: use the correction-evidence workflow below.
- **General record investigation**: identify source systems, search Compliance Theater case files and local evidence, retrieve exact records, then summarize findings with provenance.
- **Correction workspace enrichment**: when working in an `RC-*` folder, read [correction-evidence-enrichment.md](references/correction-evidence-enrichment.md) before editing files.
- **Correction or complaint drafting with durable state**: create or update a Neo4j workspace overlay before drafting when the work has multiple correction points, caveats, evidence rows, research tasks, or exhibit candidates.

## Misleading Statement Research

Use this workflow when the user asks whether an official statement is false, misleading, incomplete, or useful for a correction request.

1. Capture the challenged statement exactly, including speaker/author, date, record location, and any surrounding qualifiers.
2. Define the correction theory in neutral terms: what the statement asserts, what record fact would contradict it, and what corrected wording would be supportable.
3. Identify source-of-truth record classes: Compliance Theater case-file IDs, email/thread IDs, attachments, local `.txt` sidecars, PDFs, policy documents, index rows, and relevant case-theory anchors.
4. Search narrow first: known case-file IDs, exact phrases, subjects, dates, senders, Gmail IDs, attachment names, and quoted statutory/legal terms.
5. Expand with semantic and graph search only after direct probes: use Neo4j vector search for similar records, relationship traversal for thread/context, and policy search for legal framing.
6. Pull exact text from source documents before relying on graph snippets. Use graph snippets for discovery unless no better source is available.
7. Classify each evidence item:
   - `primary`: directly contradicts, confirms omission, or proves the maintained-record fact.
   - `supporting`: materially supports the correction theory but needs another record for the core point.
   - `similar-pattern`: shows recurring wording or conduct, not proof of the challenged statement by itself.
   - `context`: explains timing, roles, procedure, or legal significance.
8. Score warrant conservatively:
   - `9-10`: direct contradiction or direct omission established from maintained records.
   - `7-8`: strong misleading characterization with source evidence but an open proof task.
   - `5-6`: contextual support or mostly inference.
   - `1-4`: weak or exploratory.
   - `0`: not enough evidence either way.
   - Negative: source evidence tends to undermine the correction theory.
9. Preserve uncertainty as follow-up actions instead of converting it into a conclusion.
10. Store durable correction state in Neo4j when the investigation will support a correction request, complaint, exhibit packet, or later promotion review. Use draft overlay labels and relationships, not established-finding labels.
11. Report with source citations: case-file IDs, document paths, thread/Gmail IDs, PDF pages, line locators, graph labels, and tool names used.

## Durable Neo4j Overlay Storage

When drafting correction requests or complaints, use Neo4j as the durable analytical store for workspace state. The local files remain source/provenance, but the graph should hold reusable draft structure so later agents can ask which points are active, which evidence supports a point, which caveats remain, and what research tasks are unresolved.

Create a quarantined overlay instead of mutating established evidence:

- `:CorrectionWorkspace`
- `:CorrectionPointDraft`
- `:TargetStatementDraft`
- `:EvidenceUseDraft`
- `:ProposedCureDraft`
- `:ResearchTaskDraft`
- `:CaveatDraft`
- `:ExhibitCandidateDraft`
- `:CaseTheoryDraft`

All overlay nodes and overlay relationships must carry:

- `workspace_key`
- `assertion_status`
- `source_path` when derived from a local file
- `created_from`

Allowed draft assertion statuses include `draft`, `candidate`, `enriched`, `correction_ready_with_caveat`, `research_required`, `dropped`, and `promoted`. Evidence-use nodes may use `draft_evidence_use`; source-reference relationships may use `draft_reference`.

Use overlay-specific relationships:

- `(w)-[:HAS_CORRECTION_POINT_DRAFT]->(p)`
- `(p)-[:TARGETS_STATEMENT_DRAFT]->(s)`
- `(p)-[:USES_EVIDENCE_DRAFT]->(evidenceUse)`
- `(evidenceUse)-[:REFERENCES_SOURCE]->(sourceEvidenceNode)`
- `(p)-[:HAS_CAVEAT_DRAFT]->(c)`
- `(p)-[:HAS_PROPOSED_CURE_DRAFT]->(cure)`
- `(p)-[:NEEDS_RESEARCH_DRAFT]->(task)`
- `(p)-[:CROSS_LINKS_CORRECTION_DRAFT]->(otherPointOrTheory)`
- `(p)-[:HAS_EXHIBIT_CANDIDATE_DRAFT]->(exhibit)`

Never create `:Violation`, `:EstablishedFinding`, `PROVES`, `ESTABLISHES`, or `VIOLATES` from draft correction work unless the user explicitly asks for a promotion pass and the promotion criteria are met. Draft overlays point back to source evidence; they do not convert theories into facts.

For each correction point, preserve at least:

- `correction_id`
- `folder`
- `target_area`
- `short_description`
- `status`
- `priority`
- `correction_warrant_score`
- `evidence_posture`
- `proposed_correction_theory`
- `workspace_key`
- `assertion_status`
- `source_path`

For each evidence CSV row, create an `EvidenceUseDraft` node and link it to the existing `case_file_document` with `REFERENCES_SOURCE` when `neo4j_case_file_id` resolves. If no source node resolves, keep the local path/locator and set `source_resolution_status` to `local_only_pending_graph_link` or `graph_case_file_not_found`.

Before drafting final correction or complaint text from an overlay, query the graph for active points, primary evidence, caveats, proposed cures, and research tasks. Preserve unresolved caveats in the draft instead of smoothing them away.

## May 26 Correction Baseline

When investigating Rob's May 26 response or a similar official response that classifies a request as something other than a data request, apply this baseline before scoring:

1. Load the underlying request, not just the response.
2. Treat the request as potentially operative when it is directed to the District or a District designee, seeks government data, education records, records, or metadata in District possession/control, identifies records with reasonable specificity, and is made by a data subject/parent or another entitled requester.
3. If the baseline is met, include the request text as evidence. Note that whether the District located or maintained responsive records does not control whether the request was valid; the District still had to produce responsive data, state none exists, or cite a specific withholding basis.
4. Treat the response classification as an official District compliance position when the responder is acting as the District data compliance officer/responding authority.
5. Mark qualifying misclassification evidence as part of the running MGDPA/FERPA response-violation analysis when a violation inventory row exists.

## Correction Workspace Output

When the user asks to enrich or update an `RC-*` correction folder, follow the durable procedure in [correction-evidence-enrichment.md](references/correction-evidence-enrichment.md). The expected outputs are:

- `<RC-folder>/source_evidence.csv`
- optional `<RC-folder>/source_evidence_notes.md`
- updated `<RC-folder>/CORRECTION.md`
- refreshed parent `index.csv` fields
- updated `correction_evidence_enrichment_status.csv`
- reviewed root `followup_actions.md`

Use the exact CSV header from the reference file.

## Tool Guidance

- Use Compliance Theater MCP tools before raw PST/Gmail/local searching when the task mentions case files, policy basis, key points, calls to action, responsive actions, case notes, workspaces, or graph evidence.
- Use `compliance_theater_search.graph_schema` before nontrivial Cypher when the live tool is available.
- Use `compliance_theater_search.graph_read` for Neo4j exploration; write only when explicitly asked.
- Use `compliance_theater_search.graph_write` to persist correction-request or complaint drafting overlays when the user asks to draft, migrate, save, preserve, or reuse workspace state.
- Use `vectorParams` or inline `{ "$embed": "...", "modelSize": "small" }` for vector queries.
- Use `compliance_theater_case_files.get` or local sidecars for quote fidelity.
- Use local `rg` over sidecars and workspace files for exact phrase confirmation and line locators.
- Cite tool names and durable IDs in findings.
