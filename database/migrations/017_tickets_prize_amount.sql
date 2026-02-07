-- ============================================================================
-- Add prize_amount and related columns to tickets if missing
-- Ensures won tickets display correct prize amounts on Profile
--
-- Run: psql -U postgres -d dailydollar -f database/migrations/017_tickets_prize_amount.sql
-- ============================================================================

-- Add prize_amount for winning tickets (99% of prize pool after admin fee)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS prize_amount DECIMAL(12,2);

-- Backfill: Set prize_amount for existing won tickets that have null
-- Uses draws.prize_pool * 0.99 as fallback
UPDATE tickets t
SET prize_amount = ROUND((d.prize_pool * 0.99)::numeric, 2)
FROM draws d
WHERE t.draw_id = d.id
  AND t.status = 'won'
  AND t.prize_amount IS NULL
  AND d.status = 'drawn';
