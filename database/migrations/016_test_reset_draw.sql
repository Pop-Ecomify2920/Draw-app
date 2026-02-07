-- ============================================================================
-- TEST RESET - Reset today's draw so you can test again with same accounts
-- Keeps: All users, their wallets
-- Clears: Today's draw and its tickets (refunds $1 per ticket)
-- Creates: New open draw for today
--
-- Run: psql -U postgres -d dailydollar -f database/migrations/016_test_reset_draw.sql
-- ============================================================================

DO $$
DECLARE
  today_draw_id UUID;
  ticket_rec RECORD;
  new_seed TEXT;
  new_commitment TEXT;
BEGIN
  -- 1. Get today's draw
  SELECT id INTO today_draw_id FROM draws WHERE draw_date = CURRENT_DATE LIMIT 1;

  IF today_draw_id IS NOT NULL THEN
    -- 2. Refund $1 to each user who bought a ticket for today's draw
    FOR ticket_rec IN
      SELECT DISTINCT user_id FROM tickets WHERE draw_id = today_draw_id
    LOOP
      UPDATE wallets SET balance = balance + 1 WHERE user_id = ticket_rec.user_id;
    END LOOP;

    -- 3. Delete tickets for today's draw
    DELETE FROM tickets WHERE draw_id = today_draw_id;

    -- 4. Delete today's draw
    DELETE FROM draws WHERE draw_date = CURRENT_DATE;
  END IF;

  -- 5. Create fresh open draw for today
  new_seed := encode(gen_random_bytes(32), 'hex');
  new_commitment := encode(digest(new_seed, 'sha256'), 'hex');
  INSERT INTO draws (draw_date, prize_pool, total_entries, commitment_hash, seed, status)
  VALUES (CURRENT_DATE, 0, 0, new_commitment, new_seed, 'open');

  RAISE NOTICE 'Test reset complete. Today''s draw recreated. All users preserved.';
END $$;
