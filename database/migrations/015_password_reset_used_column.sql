-- ============================================================================
-- Add used column to password_reset_tokens
-- Error fixed: column prt.used does not exist
-- ============================================================================

ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS used BOOLEAN NOT NULL DEFAULT false;
