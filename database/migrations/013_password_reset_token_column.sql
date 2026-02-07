-- ============================================================================
-- Fix password_reset_tokens: ensure token column exists
-- Run: psql -U postgres -d dailydollar -f database/migrations/013_password_reset_token_column.sql
-- Error fixed: column "token" of relation "password_reset_tokens" does not exist
-- ============================================================================

-- Add token column if it was missing (DBs created before password reset was added)
ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS token VARCHAR(64);
