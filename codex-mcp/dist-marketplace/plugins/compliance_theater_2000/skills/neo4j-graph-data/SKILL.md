---
name: neo4j-graph-data
description: Use the Compliance Theater Neo4j graph for case-file, policy, evidence, correction workspace overlays, complaint/correction drafting state, case-theory anchors, email-thread, actor, attachment, subject-matter, embedding, and relationship traversal questions. Trigger when a user asks what graph data exists, how to query Neo4j, how to migrate or persist correction workspace state, how case-file documents connect to policy or people, how to query a named theory such as improper records supporting correction denial, how to traverse evidence relationships, or how to use graph_read, graph_schema, graph_write, graph_embed, or Cypher against Compliance Theater data.
---

# Neo4j Graph Data

Use this skill to reason over the Compliance Theater Neo4j graph: case-file documents, document properties, correction workspace overlays, case-theory anchors, email context, actors, policy references, subject-matter concepts, embeddings, and graph-maintenance runs.

## Workflow

1. Prefer `compliance_theater_search.graph_schema` before writing nontrivial Cypher. Use the schema snapshot in [schema.md](references/schema.md) as the working model when the live schema tool is unavailable.
2. Use `compliance_theater_search.graph_read` for exploration and analysis. Use `compliance_theater_search.graph_write` when the user explicitly asks to create, update, embed, reconcile, migrate, or persist graph data, including durable correction-request or complaint drafting overlays.
3. Use snake_case labels, relationship types, and properties. The canonical case-file document ID is `case_file` on `case_file_document`.
4. For source text, retrieve exact documents through `compliance_theater_case_files.get` or `read_case_file` when quote fidelity matters. Graph nodes are excellent for discovery and traversal, but case-file retrieval remains the source-of-truth read path.
5. For email-thread status, prefer the thread rollup pointers (`initial_email`, `last_email`, `latest_inbound_email`, `latest_outbound_email`) when the user needs first/last/current state; reconstruct the full thread with `in_thread` when sequence or full context matters.
6. When the user asks to query a named theory, normalize the phrase into the corresponding `case_theory.theory_key` and use the case-theory anchor query pattern below.
7. For vector work, use `vectorParams` or inline `{ "$embed": "...", "modelSize": "small" }` parameters rather than pasting vectors. Default to `small` for the 1536-dimension `text-embedding-3-small` graph embeddings.
8. Cite graph tool use and important IDs in the answer: case-file IDs, theory keys, policy keys, actor names, thread IDs, or relationship types.

## Correction Workspace Overlays

Use a quarantined workspace overlay when migrating correction workspaces or preserving draft correction-request/complaint state. The overlay keeps draft theories, evidence use, caveats, tasks, and proposed cures queryable without promoting them into established facts.

Preserve three layers:

1. Source evidence layer: existing emails, attachments, policies, case files, source notes, graph key points, and source documents.
2. Workspace overlay layer: draft correction points, target statements, evidence-use rows, proposed cures, caveats, research tasks, exhibit candidates, and case-theory cross-links.
3. Established finding layer: facts or findings explicitly promoted after review.

Core rule: do not merge draft correction conclusions into established evidence, violation, or final-finding nodes. Draft overlay nodes may point to source evidence; they must not claim that the source proves, establishes, or violates anything by relationship name.

Use these overlay labels as canonical. Older mixed-case overlay labels may remain on existing nodes as compatibility aliases during migration, but new overlay writes should use snake_case.

- `correction_workspace`
- `correction_point_draft`
- `target_statement_draft`
- `evidence_use_draft`
- `proposed_cure_draft`
- `research_task_draft`
- `caveat_draft`
- `exhibit_candidate_draft`
- `case_theory_draft`

Every overlay node and overlay relationship should carry:

- `workspace_key`
- `assertion_status`
- `source_path` when derived from a local file
- `created_from`
- `updated_at` on nodes

Typical `assertion_status` values are `draft`, `candidate`, `enriched`, `correction_ready_with_caveat`, `research_required`, `dropped`, and `promoted`. For evidence-use nodes, `draft_evidence_use` is acceptable. For source-reference relationships, use `draft_reference`.

Use these overlay relationship types:

- `has_correction_point_draft`
- `targets_statement_draft`
- `uses_evidence_draft`
- `references_source`
- `has_caveat_draft`
- `has_proposed_cure_draft`
- `needs_research_draft`
- `cross_links_correction_draft`
- `has_exhibit_candidate_draft`

Do not create `Violation`, `EstablishedFinding`, `PROVES`, `ESTABLISHES`, or `VIOLATES` during overlay migration or ordinary correction drafting.

### Correction-Pressure Fork Drafts

Use correction-pressure fork nodes when denial of a record-correction request would force the District to defend, unwind, qualify, or correct another statement it has already placed on the record. A production-universe fork is one subtype; a statement-rollback fork is another.

Fork types:

- production_universe_absence: a requested record category is absent from a supposedly complete production universe.
- statement_rollback: the correction request is supported by evidence that contradicts a maintained District statement; denial requires the District to correct or identify the source basis for that statement.
- inconsistent_district_positions: two District statements cannot both be maintained without qualification.
- source_record_contradiction: source records directly contradict a target statement or its premise.

Draft labels:

- `correction_pressure_fork_draft`
- `correction_request_claim_draft`
- `district_statement_draft`
- `contradiction_basis_draft`
- `rollback_demand_draft`
- `production_universe_fork_draft`
- `request_scope_draft`
- `missing_record_category_draft`
- `production_finality_statement_draft`
- `presented_universe_draft`

Draft relationships:

- `(correction_point_draft)-[:uses_correction_pressure_fork_draft]->(correction_pressure_fork_draft)`
- `(correction_pressure_fork_draft)-[:has_correction_request_claim_draft]->(correction_request_claim_draft)`
- `(correction_pressure_fork_draft)-[:conflicts_with_district_statement_draft]->(district_statement_draft)`
- `(correction_pressure_fork_draft)-[:supported_by_contradiction_basis_draft]->(contradiction_basis_draft)`
- `(correction_pressure_fork_draft)-[:requires_rollback_or_correction_draft]->(rollback_demand_draft)`
- `(correction_point_draft)-[:uses_production_universe_fork_draft]->(production_universe_fork_draft)`

Do not use PROVES, ESTABLISHES, or VIOLATES from draft fork nodes. A fork is a correction-pressure structure until a later promotion pass establishes a final finding.
Minimum `correction_point_draft` properties:

- `correction_id`
- `folder`
- `target_area`
- `short_description`
- `status`
- `priority`
- `correction_warrant_score`
- `evidence_posture`
- `proposed_correction_theory`
- `source_path`
- `workspace_key`
- `assertion_status`
- `created_from`
- `updated_at`

Minimum `evidence_use_draft` properties:

- `evidence_use_id`
- `correction_id`
- `evidence_rank`
- `discovery_method`
- `neo4j_case_file_id`
- `neo4j_node_labels`
- `neo4j_score`
- `email_id`
- `thread_id`
- `sender`
- `date`
- `subject`
- `source_file`
- `source_line_or_locator`
- `quoted_or_paraphrased_statement`
- `evidence_description`
- `why_it_supports_correction`
- `followup_needed`
- `workspace_key`
- `assertion_status`

Link evidence-use nodes to existing source evidence only by reference:

```cypher
MATCH (p:correction_point_draft {workspace_key: $workspaceKey, correction_id: $correctionId})
MERGE (eu:evidence_use_draft {workspace_key: $workspaceKey, evidence_use_id: $evidenceUseId})
SET eu += $properties,
    eu.updated_at = datetime()
MERGE (p)-[:uses_evidence_draft {
  workspace_key: $workspaceKey,
  assertion_status: 'draft'
}]->(eu)
WITH eu
MATCH (src:case_file_document {case_file: $caseFile})
MERGE (eu)-[:references_source {
  workspace_key: $workspaceKey,
  assertion_status: 'draft_reference'
}]->(src)
```

If no graph source node exists, store the local path and locator on the `evidence_use_draft` node and set `source_resolution_status` to `local_only_pending_graph_link` or `graph_case_file_not_found`.

Analytical queries over the main graph should exclude draft overlays unless the user asks for them:

```cypher
MATCH (n)
WHERE coalesce(n.workspace_key, '') = ''
   OR coalesce(n.assertion_status, '') IN ['promoted', 'established']
RETURN n
```

Workspace-specific queries should opt in by `workspace_key`:

```cypher
MATCH (w:correction_workspace {workspace_key: $workspaceKey})
MATCH (w)-[:has_correction_point_draft]->(p)
RETURN p.correction_id, p.status, p.correction_warrant_score, p.assertion_status
ORDER BY p.correction_id
```

Promotion requires a separate promotion pass. Only promote when primary source evidence is linked, caveats are resolved or explicitly retained, the draft point is marked ready for promotion review, and the promotion note identifies the exact claim promoted, source records used, caveats retained, and claims not promoted. Promotion updates the draft node; it does not delete it.

## Common Queries

Find a document and its immediate context:

```cypher
MATCH (d:case_file_document {case_file: $caseFile})
OPTIONAL MATCH (d)-[out]->(target)
OPTIONAL MATCH (source)-[in]->(d)
RETURN d, collect(DISTINCT {type: type(out), target: labels(target), props: properties(target)}) AS outgoing,
       collect(DISTINCT {type: type(in), source: labels(source), props: properties(source)}) AS incoming
```

Trace email thread context:

```cypher
MATCH (d:case_file_document {case_file: $caseFile})-[:in_thread]->(t:email_thread)
OPTIONAL MATCH (t)-[:initial_email]->(initial:case_file_document)
OPTIONAL MATCH (t)-[:last_email]->(last:case_file_document)
OPTIONAL MATCH (t)-[:latest_inbound_email]->(latestInbound:case_file_document)
OPTIONAL MATCH (t)-[:latest_outbound_email]->(latestOutbound:case_file_document)
OPTIONAL MATCH (email:case_file_document)-[:in_thread]->(t)
RETURN t.thread_id AS threadId, t.subject AS subject,
       initial.case_file AS initialCaseFile,
       last.case_file AS lastCaseFile,
       latestInbound.case_file AS latestInboundCaseFile,
       latestOutbound.case_file AS latestOutboundCaseFile,
       email.case_file AS caseFile, email.email_sent_timestamp AS sentAt,
       email.email_sender_name AS sender, email.subject_or_title AS title
ORDER BY sentAt, toInteger(email.case_file)
```

Query a named case theory:

```cypher
MATCH (d:case_file_document)-[r:case_theory {theory_key: $theoryKey}]->(t:case_theory)
RETURN r.sequence AS sequence,
       r.role AS role,
       d.case_file AS caseFile,
       d.subject_or_title AS title,
       d.email_sender_name AS sender,
       coalesce(d.sent_timestamp, d.email_sent_timestamp, d.created_on) AS sentAt,
       r.note AS note
ORDER BY r.sequence
```

Known natural-language alias:

```json
{
  "improper records supporting correction denial": "improper_records_supporting_correction_denial"
}
```

Search embedded graph nodes by meaning:

```cypher
CALL db.index.vector.queryNodes($indexName, 10, $queryVector)
YIELD node, score
RETURN labels(node) AS labels,
       coalesce(node.case_file, node.policy_key, node.subject_key, node.subject_id, elementId(node)) AS id,
       coalesce(node.subject_or_title, node.name, node.file_name, node.document_type) AS title,
       left(coalesce(node.content, node.content_summary, node.summary, ''), 700) AS snippet,
       score
ORDER BY score DESC
```

Pass the vector as:

```json
{
  "query": "...",
  "vectorParams": {
    "queryVector": {
      "text": "privacy disclosure logs attorney access",
      "modelSize": "small"
    }
  },
  "params": {
    "indexName": "case_file_document_embedding"
  }
}
```

## Read More

Read [schema.md](references/schema.md) for labels, properties, relationship meanings, counts from the latest observed sync, and query patterns by task.
