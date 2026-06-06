# Correction Evidence Enrichment

Source workflow: `D:/repos/no-ed.codex/agency_complaints_work/rob-may26/rob-may26-response/correction_evidence_enrichment_workflow.md`.

Use this reference when enriching correction workspaces or researching misleading/false statements on record for a corrections request.

## Inputs

- Parent index: `agency_complaints_work/rob-may26/rob-may26-response/index.csv`
- Correction folders: `agency_complaints_work/rob-may26/rob-may26-response/RC-*/`
- Correction memo in each folder: `CORRECTION.md`
- Graph source: Compliance Theater Neo4j graph
- Source-of-truth text: local sidecars under `plsas_pst/attachments/`, case-theory files, and case-file/local source documents

## Outputs

Each `RC-*` folder should receive:

- `source_evidence.csv`
- optional `source_evidence_notes.md` when quotes need explanation
- updated `CORRECTION.md`

Refresh the parent `index.csv` fields:

- `correction_warrant_score`
- `primary_sources`
- `related_theory_refs`
- `next_step`

Refresh root `followup_actions.md` when the pass identifies new actions.

## Evidence CSV Header

Use this header exactly:

```csv
correction_id,evidence_rank,discovery_method,neo4j_case_file_id,neo4j_node_labels,neo4j_score,email_id,thread_id,sender,date,subject,source_file,source_line_or_locator,quoted_or_paraphrased_statement,evidence_description,why_it_supports_correction,followup_needed
```

Allowed `evidence_rank` values:

- `primary`
- `supporting`
- `similar-pattern`
- `context`

Typical `discovery_method` values:

- `named-source`
- `keyword`
- `vector-neighbor`
- `local-rg`
- `pdf-anchor`

Use `neo4j_case_file_id` for the graph `case_file`, not the Gmail ID. Keep exact quotes short; paraphrase longer passages. Use local line number, case-file ID, PDF page, Gmail ID, or thread ID as `source_line_or_locator`.

## Per-Correction Procedure

1. Read the correction's row from `index.csv`.
2. Open `<folder>/CORRECTION.md`.
3. Extract named source files, Gmail IDs, known case-file IDs, dates, senders, exact legal/statutory terms, and high-signal phrases from the target statement and requested correction.
4. Apply the May 26 non-data-classification baseline when the response says the request was not a data request, was merely a request for information, would require creating data, asks what the District contends, or uses equivalent framing.
5. Normalize search probes:
   - Convert Gmail IDs to graph lookups only when the graph contains them.
   - Prefer case-file IDs for graph lookups.
   - Build 3-6 keyword probes and 2-4 semantic probes.
6. Run direct graph searches by case file, email ID, subject/title, and exact phrase in `content`, `summary`, `content_summary`, or `content_excerpt`.
7. Run vector searches:
   - Seed from named source case files when they have embeddings.
   - Query `case_file_document_embedding` with semantic probes when no seed exists.
   - Query `key_point_embedding` for issue summaries or extracted findings.
   - Use `case_file_chunk_embedding` only when document-level results are too broad.
8. Pull exact source text from local sidecars or case-file source documents. Treat graph snippets as discovery unless no local source exists.
9. Write `<folder>/source_evidence.csv`.
10. Update `<folder>/CORRECTION.md` with `## Enriched Evidence`, strongest source facts, and similar-pattern evidence kept distinct from primary evidence.
11. Re-rank the correction:
   - `9-10`: direct contradiction or direct omission established from District-maintained records.
   - `7-8`: strong pattern or materially misleading characterization with source evidence but some open proof task.
   - `5-6`: contextual support, formulaic/ambiguous record, or mostly inference.
   - `1-4`: weak or exploratory.
   - `0`: not enough evidence either way.
   - Negative: evidence tends to undermine the correction theory.
12. Update parent `index.csv` with the new score and source CSV path.
13. Update `correction_evidence_enrichment_status.csv`.
14. Re-read the updated correction memo, source evidence CSV, index row, and enrichment status row. Preserve durable follow-up actions in root `followup_actions.md`.

## May 26 Baseline Rule

When Rob's May 26 response classifies a request as something other than a data request, load the underlying request before scoring. Evaluate whether the request is legally operative as a data request using these working criteria:

- directed to the District, responsible-authority channel, or District designee
- seeks government data, education records, records, or metadata in District possession or control
- identifies records or record categories with reasonable specificity
- made by the data subject/parent or another person entitled to request the data

If the request meets that baseline, add the request text as correction evidence. The note should state that whether the District actually made, maintained, or located responsive records does not control whether the request was valid. The District still had to produce responsive data, state no responsive data exists, or cite a specific withholding basis.

Treat the May 26 classification as an official District compliance position when the responder is the District data compliance officer/responding authority. Mark each qualifying misclassification as an instance in the running total of MGDPA/FERPA response violations, cross-referencing tracked violation rows such as `VI-258` when applicable.

## Cypher Templates

Direct case-file read:

```cypher
MATCH (n:case_file_document {case_file: $caseFile})
RETURN labels(n) AS labels,
       n.case_file AS case_file,
       n.email_id AS email_id,
       n.thread_id AS thread_id,
       n.sent_timestamp AS sent_timestamp,
       n.email_sender_name AS sender,
       n.subject_or_title AS subject,
       left(coalesce(n.content,n.content_summary,n.summary,n.content_excerpt,''), 1800) AS text
```

Exact/keyword search:

```cypher
MATCH (n)
WHERE any(lbl IN labels(n) WHERE lbl IN ['email','case_file_document','attachment','key_point','responsive_action','call_to_action','case_file_chunk'])
  AND (
    toLower(coalesce(n.content,'')) CONTAINS toLower($phrase)
    OR toLower(coalesce(n.content_summary,'')) CONTAINS toLower($phrase)
    OR toLower(coalesce(n.summary,'')) CONTAINS toLower($phrase)
    OR toLower(coalesce(n.content_excerpt,'')) CONTAINS toLower($phrase)
    OR toLower(coalesce(n.subject_or_title,'')) CONTAINS toLower($phrase)
  )
RETURN labels(n) AS labels,
       n.case_file AS case_file,
       n.email_id AS email_id,
       n.thread_id AS thread_id,
       n.sent_timestamp AS sent_timestamp,
       n.email_sender_name AS sender,
       n.subject_or_title AS subject,
       left(coalesce(n.content,n.content_summary,n.summary,n.content_excerpt,''), 1200) AS text
LIMIT 50
```

Vector search from a known source document:

```cypher
MATCH (seed:case_file_document {case_file: $seedCaseFile})
WHERE seed.embedding IS NOT NULL
CALL db.index.vector.queryNodes('case_file_document_embedding', 25, seed.embedding)
YIELD node, score
WHERE node <> seed
RETURN score,
       labels(node) AS labels,
       node.case_file AS case_file,
       node.email_id AS email_id,
       node.thread_id AS thread_id,
       node.sent_timestamp AS sent_timestamp,
       node.email_sender_name AS sender,
       node.subject_or_title AS subject,
       left(coalesce(node.content,node.content_summary,node.summary,node.content_excerpt,''), 1200) AS text
ORDER BY score DESC
LIMIT 25
```

Vector search from semantic probe text:

```cypher
CALL db.index.vector.queryNodes('case_file_document_embedding', 25, $queryVector)
YIELD node, score
RETURN score,
       labels(node) AS labels,
       node.case_file AS case_file,
       node.email_id AS email_id,
       node.thread_id AS thread_id,
       node.sent_timestamp AS sent_timestamp,
       node.email_sender_name AS sender,
       node.subject_or_title AS subject,
       left(coalesce(node.content,node.content_summary,node.summary,node.content_excerpt,''), 1200) AS text
ORDER BY score DESC
LIMIT 25
```

Materialize `$queryVector` through the Compliance Theater graph tool with `vectorParams` or inline `$embed`.

## Semantic Probe Fallbacks

Use the correction's own language first. Fall back to probes such as:

- `district says no responsive data exists but identifies prior responsive records`
- `district says request was not a data request despite explicit request language`
- `district says all outstanding requests answered despite omitted pending request`
- `district says it will only respond as required by law and will not engage in debate`
- `district final response no further correspondence or debate external authorities`
- `district treats request for existing records as request to create data`
- `appeal rights notice missing deadline procedure permissible bases`
- `chief attorney section 13.39 authority records general counsel substitution`

## Completion Criteria

The correction pass is complete when:

- `source_evidence.csv` exists and imports cleanly.
- `CORRECTION.md` includes `## Enriched Evidence`.
- The parent index score and source fields are updated.
- `correction_evidence_enrichment_status.csv` is updated.
- `followup_actions.md` has been reviewed and updated when needed.
- Uncertainty is preserved as a follow-up action rather than converted into a conclusion.
