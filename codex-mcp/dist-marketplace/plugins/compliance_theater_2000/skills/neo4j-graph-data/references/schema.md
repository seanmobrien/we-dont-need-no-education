# Compliance Theater Neo4j Schema Reference

Snapshot date: 2026-05-27. A live `graph_schema` call should still be attempted first. This reference was refreshed from live Neo4j schema/count queries plus local graph sync artifacts in `casefile_graph_work/run-2026-05-23`.

## Design Rules

- Use snake_case labels, relationship types, and properties.
- Treat `(:case_file_document {case_file})` as the canonical evidence node. Emails, attachments, key points, calls to action, responsive actions, notes, and compliance records are all represented as case-file documents with different `document_type` values and optional detail labels.
- Treat type-specific IDs such as `attachment_id`, `action_id`, and `key_point_id` as aliases or metadata, not as separate primary IDs.
- Preserve provenance using `source`, `source_table`, `last_graph_processed_at`, `import_status`, `embedding_status`, and related fields.
- Use graph traversal to discover relevant evidence, then use case-file retrieval for full-fidelity text and quote work.

## Core Labels

### `case_file_document`

Canonical case-file evidence node.

Key properties:

- `case_file`: canonical case-file/document-unit ID; usually numeric stored as a string.
- `document_type`: known values include `email`, `attachment`, `key_point`, `cta`, `cta_response`, `note`, and `compliance`.
- `content`, `content_summary`, `content_excerpt`, `summary`, `subject_or_title`: text fields useful for search and display.
- `email_id`, `attachment_id`, `document_property_id`, `user_id`, `created_on`.
- `embedding`, `embedding_model`, `embedding_status`, `content_source`.
- Type-detail fields are prefixed by type: `email_*`, `attachment_*`, `key_point_*`, `cta_*`, `cta_response_*`, `compliance_*`.

Latest observed counts from sync artifacts:

- 1,808 total `case_file_document` nodes.
- 1,807 numeric PostgreSQL source documents.
- 1,788 documents with embeddings and `has_chunk` relationships.
- 19 documents marked `no_embedding_chunks_returned`.
- Detail-sync counts: 126 emails, 58 attachments, 737 key points, 285 calls to action, 143 responsive actions, 1 compliance document, and 457 notes labeled `note`.

### Detail Labels On `case_file_document`

These labels are attached to `case_file_document` nodes rather than separate node spaces:

- `email`: enriched from `emails`.
- `attachment`: enriched from `email_attachments`.
- `key_point`: enriched from `key_points_details`.
- `call_to_action`: enriched from `call_to_action_details`; source `document_type` is usually `cta`.
- `responsive_action`: enriched from `call_to_action_response_details`; source `document_type` is usually `cta_response`.
- `compliance`: enriched from `compliance_scores_details` when present.
- `note`: applied to `document_type = 'note'`.

### `case_file_chunk`

Embedding chunk node for a case-file document.

Common properties:

- `chunk_id` or similar stable chunk key.
- `case_file`, `document_type`, owner metadata denormalized from the document.
- `embedding`, `embedding_model`, `embedding_dimensions`, `embedding_status`.
- `start_pos`, `end_pos`, `token_start`, `token_end`.

Latest observed counts:

- 4,833 chunks.
- 4,833 chunks with embeddings.
- 2,316 chunks with `start_pos` / `end_pos`.
- 3,045 `next_chunk` adjacency relationships.
- 1,934 `has_subject` relationships.
- 1,464 `references_policy` relationships.

### `document_property`

Structured property node from PostgreSQL `document_property`.

Key properties:

- `property_id`
- `document_property_type_id`
- `property_name`
- `property_value`
- `policy_basis`
- `tags`
- `created_on`
- `source_table = 'document_property'`

Latest observed counts:

- 4,141 `document_property` nodes.
- 5,648 total `has_property` relationships after property-owner and document-unit-to-property reconciliation.

### `actor`

Person, contact, or user node.

Key properties:

- `name`
- `contact_id` or `user_id`
- `email`
- `role`
- `is_district_staff`
- `source_table`

Actors connect to documents through sender, recipient, and ownership edges.

### `email_thread`

Email thread context node.

Key properties:

- `thread_id`
- `subject`
- `external_id`

Thread pointer edges identify first, last, latest inbound, and latest outbound emails.

Latest observed email-thread state:

- 44 `email_thread` nodes.
- 315 `in_thread` membership relationships.
- 44 `initial_email` and 44 `last_email` rollup relationships.
- 31 `latest_inbound_email` and 31 `latest_outbound_email` convenience rollup relationships.
- `latest_inbound_email` currently means `contacts.is_district_staff = true`; `latest_outbound_email` currently means `contacts.is_district_staff = false`. Check the relationship `direction_basis` before treating those as agency/non-agency semantics.

### `policy_reference`

Policy, legal, ethical, or practice reference used to ground compliance analysis.

Key properties:

- `policy_key`
- `canonical_policy_key`
- `name`
- `alias_names`
- `chapter`, `section`, `description`
- `content`
- `embedding`
- `policy_id`

Known constraints/indexes:

- `policy_reference_policy_key_unique`
- `policy_reference_embedding` vector index

### `subject_matter`

Concept node for stable subject-matter categories, evidence cues, or compliance concepts.

Key properties:

- `subject_key`
- `subject_id`
- `name`
- `content`
- `embedding`

Known constraints/indexes:

- `subject_matter_subject_key_unique`
- `subject_matter_embedding` vector index

### `graph_run`

Operational node recording graph maintenance and embedding jobs.

Common properties:

- `run_id`
- `workflow`
- `source`
- `embedding_method`
- `schema_revision`
- `status`
- `updated_at`
- `last_successful_at`
- `note`

## Relationships

Relationship types are lowercase snake_case. Key relationships:

- `has_chunk`: `case_file_document -> case_file_chunk`.
- `next_chunk`: `case_file_chunk -> case_file_chunk` adjacency.
- `has_property`: `case_file_document -> document_property`.
- `related_to`: document-to-document relationship from PostgreSQL `document_relationship`; relationship rows may also materialize normalized dynamic relationship types based on source descriptions.
- `attached_to`: usually `email case_file_document -> attachment case_file_document`.
- `source_email`: document/attachment/property-derived unit -> source email document.
- `source_attachment`: document/property-derived unit -> source attachment document.
- `derived_from`: derived document/property node -> owner/source document.
- `contains_action`: owner document -> CTA/action document.
- `has_key_point`: owner document -> key-point document.
- `has_note`: owner document -> note document.
- `has_subject`: document -> subject-matter concept.
- `references_policy`: document or attachment -> policy reference.
- `in_thread`: email document -> email thread.
- `initial_email`, `last_email`, `latest_inbound_email`, `latest_outbound_email`: email thread -> selected email document.
- `in_reply_to`: reply email document -> parent email document.
- `replied_to_by`: parent email document -> reply email document.
- `sent`: actor -> email document.
- `sent_to`: email document -> actor.
- `owned_by`: document -> actor/user.
- `migrated_embedding_from`: normalized document -> legacy embedding source.

Latest observed relationship sync counts:

- 669 PostgreSQL `document_relationship` source rows materialized across normalized dynamic relationship types.
- 348 actor-to-email `sent` edges and 586 email-to-actor `sent_to` edges.
- 93 `in_reply_to` and 104 `replied_to_by` parent/reply email links.
- 91 `attached_to` relationships.
- 1,807 document-user ownership links.
- Current direct-owner counts: `contains_action` 428, `has_key_point` 738, `has_note` 459.

## Query Patterns

### Discover Current Schema

```cypher
CALL db.labels() YIELD label
CALL {
  WITH label
  MATCH (n)
  WHERE label IN labels(n)
  RETURN count(n) AS count
}
RETURN label, count
ORDER BY count DESC, label
```

```cypher
CALL db.relationshipTypes() YIELD relationshipType
CALL {
  WITH relationshipType
  MATCH ()-[r]->()
  WHERE type(r) = relationshipType
  RETURN count(r) AS count
}
RETURN relationshipType, count
ORDER BY count DESC, relationshipType
LIMIT 100
```

```cypher
MATCH (n)
WITH labels(n) AS labels, keys(n) AS keys
UNWIND labels AS label
UNWIND keys AS key
RETURN label, collect(DISTINCT key)[0..200] AS propertyKeys
ORDER BY label
```

### Evidence By Case File ID

```cypher
MATCH (d:case_file_document {case_file: $caseFile})
RETURN d.case_file AS caseFile,
       d.document_type AS type,
       coalesce(d.subject_or_title, d.email_subject, d.file_name, d.property_name) AS title,
       left(coalesce(d.content, d.content_summary, d.summary, ''), 1200) AS snippet,
       properties(d) AS properties
```

### Email Thread Reconstruction

```cypher
MATCH (:case_file_document {case_file: $caseFile})-[:in_thread]->(thread:email_thread)
OPTIONAL MATCH (thread)-[:initial_email]->(initial:case_file_document)
OPTIONAL MATCH (thread)-[:last_email]->(last:case_file_document)
OPTIONAL MATCH (thread)-[:latest_inbound_email]->(latestInbound:case_file_document)
OPTIONAL MATCH (thread)-[:latest_outbound_email]->(latestOutbound:case_file_document)
MATCH (email:case_file_document)-[:in_thread]->(thread)
OPTIONAL MATCH (sender:actor)-[:sent]->(email)
OPTIONAL MATCH (email)-[recipientRel:sent_to]->(recipient:actor)
RETURN thread.thread_id AS threadId,
       thread.subject AS threadSubject,
       initial.case_file AS initialCaseFile,
       last.case_file AS lastCaseFile,
       latestInbound.case_file AS latestInboundCaseFile,
       latestOutbound.case_file AS latestOutboundCaseFile,
       email.case_file AS caseFile,
       email.email_sent_timestamp AS sentAt,
       coalesce(sender.name, email.email_sender_name) AS sender,
       collect(DISTINCT {name: recipient.name, type: recipientRel.recipient_type}) AS recipients,
       coalesce(email.subject_or_title, email.email_subject) AS subject,
       left(coalesce(email.content, ''), 700) AS snippet
ORDER BY sentAt, toInteger(email.case_file)
```

### Policy Grounding

```cypher
MATCH (d:case_file_document)-[:references_policy]->(p:policy_reference)
WHERE toLower(coalesce(p.name, p.description, p.content, '')) CONTAINS toLower($topic)
   OR toLower(coalesce(d.content, d.content_summary, d.summary, '')) CONTAINS toLower($topic)
RETURN p.policy_key AS policyKey,
       p.name AS policyName,
       collect(DISTINCT d.case_file)[0..25] AS supportingCaseFiles,
       left(coalesce(p.content, p.description, ''), 1000) AS policyText
ORDER BY policyName
```

### Subject-Matter Exploration

```cypher
MATCH (s:subject_matter)<-[:has_subject]-(d:case_file_document)
WHERE toLower(coalesce(s.name, s.content, '')) CONTAINS toLower($topic)
RETURN coalesce(s.subject_key, s.subject_id) AS subjectKey,
       s.name AS subject,
       count(DISTINCT d) AS documentCount,
       collect(DISTINCT d.case_file)[0..25] AS examples,
       left(coalesce(s.content, ''), 1000) AS definition
ORDER BY documentCount DESC, subject
```

### Vector Search

Use `vectorParams` to provide `$queryVector`.

```cypher
CALL db.index.vector.queryNodes('case_file_document_embedding', 20, $queryVector)
YIELD node, score
RETURN node.case_file AS caseFile,
       node.document_type AS type,
       coalesce(node.subject_or_title, node.email_subject, node.file_name, node.property_name) AS title,
       left(coalesce(node.content, node.content_summary, node.summary, ''), 1000) AS snippet,
       score
ORDER BY score DESC
```

Other likely vector indexes:

- `case_file_document_embedding`
- `policy_reference_embedding`
- `subject_matter_embedding`

Confirm with:

```cypher
SHOW INDEXES YIELD name, type, entityType, labelsOrTypes, properties, options
WHERE type = 'VECTOR' OR any(p IN properties WHERE p = 'embedding')
RETURN name, type, entityType, labelsOrTypes, properties, options
ORDER BY name
```

## Tool Use Notes

- Use `graph_read` for Cypher. It returns structured MCP content; summarize the rows and cite IDs.
- Use `graph_write` only after explicit user intent to mutate the graph.
- Use `graph_embed` to update `content`/`embedding` for one node or an intentional batch. It verifies single-node matches unless `updateMultiple` is true.
- Use `textColumnName: "content"`, `vectorColumnName: "embedding"`, and `size: "small"` unless the target schema says otherwise.
- Do not paste large embedding arrays into chat.
