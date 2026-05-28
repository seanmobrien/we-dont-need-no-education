---
name: neo4j-graph-data
description: Use the Compliance Theater Neo4j graph for case-file, policy, evidence, case-theory anchors, email-thread, actor, attachment, subject-matter, embedding, and relationship traversal questions. Trigger when a user asks what graph data exists, how to query Neo4j, how case-file documents connect to policy or people, how to query a named theory such as improper records supporting correction denial, how to traverse evidence relationships, or how to use graph_read, graph_schema, graph_embed, or Cypher against Compliance Theater data.
---

# Neo4j Graph Data

Use this skill to reason over the Compliance Theater Neo4j graph: case-file documents, document properties, case-theory anchors, email context, actors, policy references, subject-matter concepts, embeddings, and graph-maintenance runs.

## Workflow

1. Prefer `compliance_theater_search.graph_schema` before writing nontrivial Cypher. Use the schema snapshot in [schema.md](references/schema.md) as the working model when the live schema tool is unavailable.
2. Use `compliance_theater_search.graph_read` for exploration and analysis. Keep queries read-only unless the user explicitly asks to create, update, embed, or reconcile graph data.
3. Use snake_case labels, relationship types, and properties. The canonical case-file document ID is `case_file` on `case_file_document`.
4. For source text, retrieve exact documents through `compliance_theater_case_files.get` or `read_case_file` when quote fidelity matters. Graph nodes are excellent for discovery and traversal, but case-file retrieval remains the source-of-truth read path.
5. For email-thread status, prefer the thread rollup pointers (`initial_email`, `last_email`, `latest_inbound_email`, `latest_outbound_email`) when the user needs first/last/current state; reconstruct the full thread with `in_thread` when sequence or full context matters.
6. When the user asks to query a named theory, normalize the phrase into the corresponding `case_theory.theory_key` and use the case-theory anchor query pattern below.
7. For vector work, use `vectorParams` or inline `{ "$embed": "...", "modelSize": "small" }` parameters rather than pasting vectors. Default to `small` for the 1536-dimension `text-embedding-3-small` graph embeddings.
8. Cite graph tool use and important IDs in the answer: case-file IDs, theory keys, policy keys, actor names, thread IDs, or relationship types.

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
