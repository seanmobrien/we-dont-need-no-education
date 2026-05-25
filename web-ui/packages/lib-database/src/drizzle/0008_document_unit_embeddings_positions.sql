ALTER TABLE document_unit_embeddings
  ADD COLUMN IF NOT EXISTS start_pos integer;--> statement-breakpoint

ALTER TABLE document_unit_embeddings
  ADD COLUMN IF NOT EXISTS end_pos integer;