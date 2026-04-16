-- Create documents table to store file metadata and content
CREATE TABLE documents (
  id            UUID PRIMARY KEY,
  file_name     TEXT NOT NULL,
  file_type     TEXT NOT NULL,
  markdown_content TEXT NOT NULL,
  checksum      TEXT NOT NULL,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_file_name ON documents(file_name);
CREATE INDEX idx_documents_checksum ON documents(checksum);

-- Delete existing data from contract_analyses
DELETE FROM contract_analyses;

-- Drop old columns and indexes that are moving to documents table
DROP INDEX IF EXISTS idx_file_checksum;
ALTER TABLE contract_analyses DROP COLUMN IF EXISTS file_name;
ALTER TABLE contract_analyses DROP COLUMN IF EXISTS checksum;

-- Drop the old unique constraint and primary key approach
ALTER TABLE contract_analyses DROP CONSTRAINT IF EXISTS contract_analyses_contract_name_key_name_key;

-- Add file_id foreign key referencing documents
ALTER TABLE contract_analyses ADD COLUMN file_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE;

-- Re-add unique constraint with file_id instead of just contract_name + key_name
ALTER TABLE contract_analyses ADD CONSTRAINT uq_contract_file_key UNIQUE(file_id, contract_name, key_name);

CREATE INDEX idx_contract_analyses_file_id ON contract_analyses(file_id);
