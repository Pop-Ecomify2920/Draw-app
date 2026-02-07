-- Provably fair: add commitment_hash and seed to lobbies
-- Seed is generated at lobby creation, commitment published to members, seed revealed after draw
ALTER TABLE lobbies ADD COLUMN IF NOT EXISTS commitment_hash VARCHAR(64);
ALTER TABLE lobbies ADD COLUMN IF NOT EXISTS seed VARCHAR(64);
ALTER TABLE lobbies ADD COLUMN IF NOT EXISTS winning_position INTEGER;
