-- Migration 024: Fix Community Invitations Constraint
-- Fixes the UNIQUE constraint issue that prevents re-inviting users who have declined

-- SQLite doesn't support dropping constraints directly, so we need to:
-- 1. Create a new table with the correct constraint
-- 2. Copy data from the old table
-- 3. Drop the old table
-- 4. Rename the new table

-- Create new table with corrected constraint
CREATE TABLE IF NOT EXISTS community_invitations_new (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    community_id        INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_by_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status              TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined')),
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at        DATETIME
);

-- Copy existing data from old table
INSERT INTO community_invitations_new (id, community_id, user_id, invited_by_id, status, created_at, responded_at)
SELECT id, community_id, user_id, invited_by_id, status, created_at, responded_at
FROM community_invitations;

-- Drop old table
DROP TABLE community_invitations;

-- Rename new table to original name
ALTER TABLE community_invitations_new RENAME TO community_invitations;

-- Create indexes on the new table
CREATE INDEX IF NOT EXISTS idx_community_invitations_user ON community_invitations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_community_invitations_community ON community_invitations(community_id, status);

-- Create a unique index for pending invitations only
-- This prevents multiple pending invitations for the same user in the same community
-- but allows re-invitation after decline
CREATE UNIQUE INDEX IF NOT EXISTS idx_community_invitations_unique_pending 
ON community_invitations(community_id, user_id) 
WHERE status = 'pending';
