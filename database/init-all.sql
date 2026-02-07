-- ============================================================================
-- Daily Dollar Draw - Complete Database Setup
-- Run from project root: psql -U postgres -d dailydollar -f database/init-all.sql
-- Create DB first: createdb -U postgres dailydollar
-- ============================================================================

\ir migrations/001_schema.sql
\ir migrations/002_seed.sql
