-- Migration 020: User-managed Communities Feature
-- Adds support for user-created communities alongside language-based communities

-- Communities table
CREATE TABLE IF NOT EXISTS communities (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT NOT NULL,
    description         TEXT,
    type                TEXT NOT NULL CHECK(type IN ('language', 'user_created')),
    access_type         TEXT NOT NULL DEFAULT 'open' CHECK(access_type IN ('open', 'invite_only')),
    language_code       TEXT,  -- For language communities, references languages(code)
    owner_id            INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- NULL for language communities
    member_count        INTEGER DEFAULT 0,  -- Cached member count
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(language_code) REFERENCES languages(code) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_communities_type ON communities(type);
CREATE INDEX IF NOT EXISTS idx_communities_owner ON communities(owner_id);
CREATE INDEX IF NOT EXISTS idx_communities_language ON communities(language_code);

-- Community members table
CREATE TABLE IF NOT EXISTS community_members (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    community_id        INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role                TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('creator', 'moderator', 'member')),
    joined_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(community_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_members_community ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_role ON community_members(community_id, role);

-- Community invitations table
CREATE TABLE IF NOT EXISTS community_invitations (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    community_id        INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_by_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status              TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined')),
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at        DATETIME,
    UNIQUE(community_id, user_id, status)
);

CREATE INDEX IF NOT EXISTS idx_community_invitations_user ON community_invitations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_community_invitations_community ON community_invitations(community_id, status);

-- Link community goals to communities
-- Add community_id column to existing community_goals table
ALTER TABLE community_goals ADD COLUMN community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_community_goals_community ON community_goals(community_id);

-- Insert language-based communities for primary languages
-- Note: Additional language communities are created automatically by the dbInit service
-- at startup for all languages in the languages table. This migration only creates
-- communities for the most commonly used languages (fr, nl, en, de, es, pt, it, ru, zh, ja)
-- as mentioned in the original issue.
INSERT INTO communities (name, description, type, access_type, language_code, owner_id)
SELECT 
    name || ' Community' as name,
    'Community for ' || name || ' language translators' as description,
    'language' as type,
    'open' as access_type,
    code as language_code,
    NULL as owner_id
FROM languages
WHERE code IN ('en', 'fr', 'nl', 'de', 'es', 'pt', 'it', 'ru', 'zh', 'ja')
ON CONFLICT DO NOTHING;

-- Auto-assign users to language communities based on their preferences
-- This will be handled by application logic in the community service, not in migration
