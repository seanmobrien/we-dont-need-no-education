-- Add model lineage and vector payload support for document embeddings.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE document_unit_embeddings
  ADD COLUMN IF NOT EXISTS embedding_model varchar(255);

UPDATE document_unit_embeddings due
SET embedding_model = du.embedding_model
FROM document_units du
WHERE du.unit_id = due.document_id
  AND due.embedding_model IS NULL;

UPDATE document_unit_embeddings
SET embedding_model = 'text-embedding-3-large'
WHERE embedding_model IS NULL;

ALTER TABLE document_unit_embeddings
  ALTER COLUMN embedding_model SET NOT NULL;

ALTER TABLE document_unit_embeddings
  ADD COLUMN IF NOT EXISTS vector vector;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM document_unit_embeddings
    GROUP BY document_id, embedding_model, "index"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot apply document_unit_embeddings PK migration: duplicate (document_id, embedding_model, index) rows found.';
  END IF;
END $$;

ALTER TABLE document_unit_embeddings
  DROP CONSTRAINT IF EXISTS document_unit_vector_store_pkey;

ALTER TABLE document_unit_embeddings
  ADD CONSTRAINT document_unit_vector_store_pkey
  PRIMARY KEY (document_id, embedding_model, "index");

CREATE INDEX IF NOT EXISTS idx_document_units_content_fts
  ON document_units
  USING GIN (to_tsvector('english', COALESCE(content, '')));

CREATE INDEX IF NOT EXISTS idx_document_units_document_type
  ON document_units (document_type);

CREATE INDEX IF NOT EXISTS idx_document_unit_embeddings_model_document
  ON document_unit_embeddings (embedding_model, document_id);

CREATE INDEX IF NOT EXISTS idx_document_unit_embeddings_vector_cosine
  ON document_unit_embeddings
  USING ivfflat (vector vector_cosine_ops)
  WITH (lists = 100);
