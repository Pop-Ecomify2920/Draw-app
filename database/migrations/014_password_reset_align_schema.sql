-- ============================================================================
-- Align password_reset_tokens with backend: use token, not token_hash
-- Error: null value in column "token_hash" violates not-null constraint
-- ============================================================================

-- Ensure token column exists
ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS token VARCHAR(64);

-- Make token_hash nullable if it exists (backend uses token for 6-char code)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' AND column_name = 'token_hash'
  ) THEN
    ALTER TABLE password_reset_tokens ALTER COLUMN token_hash DROP NOT NULL;
  END IF;
END $$;
