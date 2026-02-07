-- Responsible play: self-exclusion and spending limits
-- Run: psql -U postgres -d dailydollar -f database/migrations/004_responsible_play.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS self_excluded_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS spending_limit_daily DECIMAL(12,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS spending_limit_monthly DECIMAL(12,2);
