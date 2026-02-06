-- Community Goals Feature
-- Allows admins to create and manage community-wide translation goals

CREATE TABLE community_goals (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT NOT NULL,
    description     TEXT,
    goal_type       TEXT NOT NULL CHECK(goal_type IN ('translation_count', 'collection')),
    target_count    INTEGER,  -- Number of translations or terms to complete
    target_language TEXT,  -- Language code for translations (e.g., 'fr', 'nl')
    collection_id   INTEGER REFERENCES sources(source_id) ON DELETE CASCADE,  -- If goal is for a specific collection/source
    is_recurring    INTEGER DEFAULT 0 CHECK(is_recurring IN (0, 1)),  -- Is this a recurring goal?
    recurrence_type TEXT CHECK(recurrence_type IN ('daily', 'weekly', 'monthly') OR recurrence_type IS NULL),  -- Type of recurrence
    start_date      DATETIME NOT NULL,
    end_date        DATETIME,  -- NULL for infinite recurring goals
    is_active       INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_by_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_community_goals_active ON community_goals(is_active);
CREATE INDEX idx_community_goals_language ON community_goals(target_language);
CREATE INDEX idx_community_goals_dates ON community_goals(start_date, end_date);

-- Track user dismissals of goal widgets
CREATE TABLE community_goal_dismissals (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id         INTEGER NOT NULL REFERENCES community_goals(id) ON DELETE CASCADE,
    dismissed_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, goal_id)
);

CREATE INDEX idx_community_goal_dismissals_user ON community_goal_dismissals(user_id);
