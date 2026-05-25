-- Backfill inferred chunk positions for document_unit_embeddings.
--
-- Chunk sizes verified from web-ui/packages/app/lib/api/document-unit/embeddings.ts:
--   large => 1000
--   small => 512
--
-- Position semantics:
--   start_pos = chunk_size * (index - 1)
--   end_pos   = min(start_pos + chunk_size, char_length(document_units.content))

WITH inferred_positions AS (
  SELECT
    due.document_id,
    due.embedding_model,
    due."index",
    CASE
      WHEN due.embedding_model ILIKE '%small%' THEN 512
      ELSE 1000
    END AS chunk_size,
    COALESCE(char_length(du.content), 0) AS content_length
  FROM document_unit_embeddings due
  INNER JOIN document_units du
    ON du.unit_id = due.document_id
)
UPDATE document_unit_embeddings due
SET
  start_pos = (ip."index" - 1) * ip.chunk_size,
  end_pos = LEAST(((ip."index" - 1) * ip.chunk_size) + ip.chunk_size, ip.content_length)
FROM inferred_positions ip
WHERE due.document_id = ip.document_id
  AND due.embedding_model = ip.embedding_model
  AND due."index" = ip."index";