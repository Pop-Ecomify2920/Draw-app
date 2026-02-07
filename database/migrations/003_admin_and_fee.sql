-- Admin user for fee collection
-- Run: psql -U postgres -d dailydollar -f database/migrations/003_admin_and_fee.sql

-- Create admin user if not exists (password: AdminChangeMe123!)
-- Uses email conflict - wallet is auto-created by trigger on user insert
INSERT INTO users (email, username, password_hash, is_active)
VALUES (
  'ollie.bryant08@icloud.com',
  'DailyDollarlotto1234!',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  true
)
ON CONFLICT (email) DO NOTHING;

-- Add admin_fee to transaction types if constraint exists (some DBs may have different constraints)
-- ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
-- ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
--   CHECK (type IN ('deposit', 'withdrawal', 'ticket_purchase', 'prize_win', 'admin_fee'));
