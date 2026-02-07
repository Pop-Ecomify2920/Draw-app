-- ============================================================================
-- Daily Dollar Draw - Seed Data
-- Migration: 002_seed
-- Creates today's draw and any initial data
-- ============================================================================

-- Create today's draw (open for ticket sales)
-- Commitment hash is generated from a pre-commitment seed (run draw cron for real)
INSERT INTO draws (id, draw_date, prize_pool, total_entries, commitment_hash, status, winning_position)
SELECT
    gen_random_uuid(),
    CURRENT_DATE,
    0,
    0,
    encode(digest('DDL-DRAW-' || CURRENT_DATE::text || '-' || gen_random_uuid()::text, 'sha256'), 'hex'),
    'open',
    NULL
WHERE NOT EXISTS (
    SELECT 1 FROM draws WHERE draw_date = CURRENT_DATE
);
