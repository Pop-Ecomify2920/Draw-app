-- ============================================================================
-- Daily Dollar Draw - Complete Database Setup
-- Run from project root: psql -U postgres -d dailydollar -f database/init-all.sql
-- Create DB first: createdb -U postgres dailydollar
-- ============================================================================

\ir migrations/001_schema.sql
\ir migrations/002_seed.sql
\ir migrations/003_admin_and_fee.sql
\ir migrations/004_responsible_play.sql
\ir migrations/005_idempotency.sql
\ir migrations/006_lobby_model_a.sql
\ir migrations/007_age_verification.sql
\ir migrations/008_admin_role.sql
\ir migrations/009_ensure_admin.sql
\ir migrations/010_lobby_host_id.sql
\ir migrations/011_provably_fair_lobby.sql
\ir migrations/012_reset_for_deploy.sql
\ir migrations/013_password_reset_token_column.sql
\ir migrations/014_password_reset_align_schema.sql
\ir migrations/015_password_reset_used_column.sql
\ir migrations/016_test_reset_draw.sql
\ir migrations/017_tickets_prize_amount.sql
