-- Migration 023: Link admin goals to language communities
-- Creates a many-to-many relationship between goals and communities
-- so that goals without a specific language can be in all language communities

-- Create a linking table for many-to-many relationship
CREATE TABLE IF NOT EXISTS community_goal_links (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id         INTEGER NOT NULL REFERENCES community_goals(id) ON DELETE CASCADE,
    community_id    INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(goal_id, community_id)
);

CREATE INDEX IF NOT EXISTS idx_community_goal_links_goal ON community_goal_links(goal_id);
CREATE INDEX IF NOT EXISTS idx_community_goal_links_community ON community_goal_links(community_id);

-- Migrate existing community_goals with community_id to the new linking table
INSERT INTO community_goal_links (goal_id, community_id, created_at)
SELECT id, community_id, created_at
FROM community_goals
WHERE community_id IS NOT NULL;
