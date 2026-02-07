-- Ensure lobbies table uses host_id (align with lobby routes and admin)
-- If creator_id exists, rename to host_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lobbies' AND column_name = 'creator_id'
  ) THEN
    ALTER TABLE lobbies RENAME COLUMN creator_id TO host_id;
    DROP INDEX IF EXISTS idx_lobbies_creator_id;
    CREATE INDEX IF NOT EXISTS idx_lobbies_host_id ON lobbies(host_id);
  END IF;
END $$;
