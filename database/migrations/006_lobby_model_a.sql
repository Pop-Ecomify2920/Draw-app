-- Lobby Model A: Host-seeded rooms with invite code
ALTER TABLE lobbies ADD COLUMN IF NOT EXISTS code VARCHAR(8) UNIQUE;
ALTER TABLE lobbies ADD COLUMN IF NOT EXISTS prize_pool DECIMAL(12,2) DEFAULT 0;

-- Lobby tickets for room draws (optional - Model A can be host-seeded pot, no per-user tickets)
-- For simplicity: room draw uses lobby_members; winner selected from members who have "entered"
ALTER TABLE lobby_members ADD COLUMN IF NOT EXISTS has_ticket BOOLEAN DEFAULT false;
ALTER TABLE lobby_members ADD COLUMN IF NOT EXISTS ticket_position INTEGER;
ALTER TABLE lobby_members ADD COLUMN IF NOT EXISTS ticket_hash VARCHAR(64);
