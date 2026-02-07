-- Age verification for account creation (18+ required)
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
