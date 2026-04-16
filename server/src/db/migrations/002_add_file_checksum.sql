ALTER TABLE contract_analyses ADD COLUMN file_name TEXT NOT NULL DEFAULT '';
ALTER TABLE contract_analyses ADD COLUMN checksum TEXT NOT NULL DEFAULT '';

CREATE INDEX idx_file_checksum ON contract_analyses(file_name, checksum);
