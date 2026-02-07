-- ============================================================================
-- RESET FOR DEPLOY - Wipe all data except admin account
-- Run before deploy: psql -U postgres -d dailydollar -f database/migrations/012_reset_for_deploy.sql
--
-- Keeps: Admin user (ollie.bryant08@icloud.com)
-- Removes: All other users, their wallets, tickets, transactions, lobbies, draws
-- Resets: Admin wallet balance to 0
-- Recreates: Today's draw (open, with provably fair seed)
-- ============================================================================

DO $$
DECLARE
  admin_email TEXT := 'ollie.bryant08@icloud.com';
  admin_id UUID;
  today_draw_id UUID;
  new_seed TEXT;
  new_commitment TEXT;
BEGIN
  -- Get admin user id
  SELECT id INTO admin_id FROM users WHERE email = admin_email;
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin user not found. Run migrations 003 and 008 first.';
  END IF;

  -- 1. Delete in FK-safe order (children before parents)
  DELETE FROM transactions;
  DELETE FROM tickets;
  DELETE FROM lobby_members;
  DELETE FROM lobbies;
  DELETE FROM refresh_tokens;
  DELETE FROM password_reset_tokens;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'idempotency_keys') THEN
    DELETE FROM idempotency_keys;
  END IF;
  DELETE FROM draws;

  -- 2. Delete all non-admin users (CASCADE removes their wallets)
  DELETE FROM users WHERE id != admin_id;

  -- 3. Reset admin wallet to 0
  UPDATE wallets SET balance = 0, pending_balance = 0 WHERE user_id = admin_id;

  -- 4. Recreate today's draw with provably fair seed
  new_seed := encode(gen_random_bytes(32), 'hex');
  new_commitment := encode(digest(new_seed, 'sha256'), 'hex');
  INSERT INTO draws (draw_date, prize_pool, total_entries, commitment_hash, seed, status)
  VALUES (CURRENT_DATE, 0, 0, new_commitment, new_seed, 'open');

  RAISE NOTICE 'Reset complete. Admin preserved. All other data cleared. Today''s draw recreated.';
END $$;
