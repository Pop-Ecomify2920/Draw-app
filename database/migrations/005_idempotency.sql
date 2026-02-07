-- Idempotency keys for webhook/deposit deduplication
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key VARCHAR(64) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  endpoint VARCHAR(100) NOT NULL,
  response_status INT,
  response_body JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_idempotency_user ON idempotency_keys(user_id);
