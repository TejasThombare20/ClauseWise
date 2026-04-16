CREATE TABLE contract_analyses (
  id            UUID PRIMARY KEY,
  contract_name TEXT NOT NULL,
  key_name      TEXT NOT NULL,
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(contract_name, key_name)
);

CREATE INDEX idx_contract_name ON contract_analyses(contract_name);
