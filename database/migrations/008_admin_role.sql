-- Admin role and admin user
-- Run: psql -U postgres -d dailydollar -f database/migrations/008_admin_role.sql

-- Add is_admin column if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = true;

-- Admin user: ollie.bryant08@icloud.com / DailyDollarlotto1234!
-- Username: admin (display name for admin account)
INSERT INTO users (email, username, password_hash, is_active, is_admin, date_of_birth)
VALUES (
  'ollie.bryant08@icloud.com',
  'admin_ollie',
  '$2b$10$yrtBMni25Pp23xvwWT0NC.Fhhku8PB2D3l6zY1320YINEngO9M602',
  true,
  true,
  '1990-01-01'
)
ON CONFLICT (email) DO UPDATE SET
  username = EXCLUDED.username,
  password_hash = EXCLUDED.password_hash,
  is_active = true,
  is_admin = true,
  date_of_birth = COALESCE(users.date_of_birth, EXCLUDED.date_of_birth);
