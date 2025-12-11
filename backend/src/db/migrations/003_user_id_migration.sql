-- Migration: Convert users table from username TEXT PRIMARY KEY to id INTEGER PRIMARY KEY
-- + Add multi-provider auth support via auth_providers table
-- Created: 2025-12-11

-- This migration must be executed in a single transaction for data safety
BEGIN TRANSACTION;

-- ============================================================================
-- STEP 1: Create new users table with integer ID
-- ============================================================================

CREATE TABLE users_new (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT NOT NULL UNIQUE,
    reputation INTEGER DEFAULT 0,
    joined_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    extra      TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Migrate existing users data
INSERT INTO users_new (username, reputation, joined_at, extra, created_at, updated_at)
SELECT username, reputation, joined_at, extra, joined_at, joined_at
FROM users;

-- ============================================================================
-- STEP 2: Create auth_providers table for multi-provider authentication
-- ============================================================================

CREATE TABLE auth_providers (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL REFERENCES users_new(id) ON DELETE CASCADE,
    provider         TEXT    NOT NULL, -- 'orcid', 'github', 'google', 'email', etc.
    provider_id      TEXT    NOT NULL, -- Provider-specific user ID (e.g., ORCID iD)
    email            TEXT,
    name             TEXT,
    avatar_url       TEXT,
    access_token     TEXT,
    refresh_token    TEXT,
    token_expires_at DATETIME,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider),
    UNIQUE(provider, provider_id)
);

-- Populate auth_providers with existing ORCID data from users
-- Current users table stores ORCID in username field
-- NOTE: This migration assumes all existing users are ORCID users
-- If you have users from other providers, you may need to customize this section
INSERT INTO auth_providers (user_id, provider, provider_id, name, created_at)
SELECT u_new.id, 'orcid', u_old.username, 
       json_extract(u_old.extra, '$.name'),
       u_old.joined_at
FROM users u_old
JOIN users_new u_new ON u_old.username = u_new.username;

-- ============================================================================
-- STEP 3: Migrate translations table to use user_id
-- ============================================================================

CREATE TABLE translations_new (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    term_field_id  INTEGER NOT NULL REFERENCES term_fields(id) ON DELETE CASCADE,
    language       TEXT    NOT NULL CHECK(language IN ('nl','fr','de','es','it','pt')),
    value          TEXT    NOT NULL,
    status         TEXT    NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'review', 'approved', 'rejected', 'merged')),
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_id  INTEGER NOT NULL,
    modified_at    DATETIME,
    modified_by_id INTEGER,
    reviewed_by_id INTEGER,
    FOREIGN KEY(created_by_id)  REFERENCES users_new(id) ON DELETE RESTRICT,
    FOREIGN KEY(modified_by_id) REFERENCES users_new(id) ON DELETE SET NULL,
    FOREIGN KEY(reviewed_by_id) REFERENCES users_new(id) ON DELETE SET NULL,
    UNIQUE(term_field_id, language)
);

-- Migrate translations data
INSERT INTO translations_new (
    id, term_field_id, language, value, status, 
    created_at, updated_at, created_by_id, 
    modified_at, modified_by_id, reviewed_by_id
)
SELECT 
    t.id, t.term_field_id, t.language, t.value, t.status,
    t.created_at, t.updated_at,
    u_created.id,
    t.modified_at,
    u_modified.id,
    u_reviewed.id
FROM translations t
JOIN users_new u_created ON t.created_by = u_created.username
LEFT JOIN users_new u_modified ON t.modified_by = u_modified.username
LEFT JOIN users_new u_reviewed ON t.reviewed_by = u_reviewed.username;

-- ============================================================================
-- STEP 4: Migrate appeals table to use user_id
-- ============================================================================

CREATE TABLE appeals_new (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    translation_id  INTEGER NOT NULL REFERENCES translations_new(id) ON DELETE CASCADE,
    opened_by_id    INTEGER NOT NULL,
    opened_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at       DATETIME,
    status          TEXT    NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed', 'resolved')),
    resolution      TEXT,
    FOREIGN KEY(opened_by_id) REFERENCES users_new(id) ON DELETE RESTRICT,
    UNIQUE(translation_id, status)
);

-- Migrate appeals data
INSERT INTO appeals_new (
    id, translation_id, opened_by_id, 
    opened_at, closed_at, status, resolution
)
SELECT 
    a.id, a.translation_id, u.id,
    a.opened_at, a.closed_at, a.status, a.resolution
FROM appeals a
JOIN users_new u ON a.opened_by = u.username;

-- ============================================================================
-- STEP 5: Migrate appeal_messages table to use user_id
-- ============================================================================

CREATE TABLE appeal_messages_new (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    appeal_id   INTEGER NOT NULL REFERENCES appeals_new(id) ON DELETE CASCADE,
    author_id   INTEGER NOT NULL,
    message     TEXT    NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(author_id) REFERENCES users_new(id) ON DELETE RESTRICT
);

-- Migrate appeal_messages data
INSERT INTO appeal_messages_new (
    id, appeal_id, author_id, message, created_at
)
SELECT 
    am.id, am.appeal_id, u.id, am.message, am.created_at
FROM appeal_messages am
JOIN users_new u ON am.author = u.username;

-- ============================================================================
-- STEP 6: Migrate user_activity table to use user_id
-- ============================================================================

CREATE TABLE user_activity_new (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id           INTEGER NOT NULL,
    action            TEXT    NOT NULL,
    term_id           INTEGER,
    term_field_id     INTEGER,
    translation_id    INTEGER,
    appeal_id         INTEGER,
    appeal_message_id INTEGER,
    extra             TEXT,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id)           REFERENCES users_new(id)           ON DELETE CASCADE,
    FOREIGN KEY(term_id)           REFERENCES terms(id)               ON DELETE SET NULL,
    FOREIGN KEY(term_field_id)     REFERENCES term_fields(id)         ON DELETE SET NULL,
    FOREIGN KEY(translation_id)    REFERENCES translations_new(id)    ON DELETE SET NULL,
    FOREIGN KEY(appeal_id)         REFERENCES appeals_new(id)         ON DELETE SET NULL,
    FOREIGN KEY(appeal_message_id) REFERENCES appeal_messages_new(id) ON DELETE SET NULL
);

-- Migrate user_activity data
INSERT INTO user_activity_new (
    id, user_id, action, term_id, term_field_id, 
    translation_id, appeal_id, appeal_message_id, extra, created_at
)
SELECT 
    ua.id, u.id, ua.action, ua.term_id, ua.term_field_id,
    ua.translation_id, ua.appeal_id, ua.appeal_message_id, ua.extra, ua.created_at
FROM user_activity ua
JOIN users_new u ON ua.user = u.username;

CREATE INDEX idx_user_activity_user_new      ON user_activity_new(user_id);
CREATE INDEX idx_user_activity_created_new   ON user_activity_new(created_at DESC);
CREATE INDEX idx_user_activity_action_new    ON user_activity_new(action);
CREATE INDEX idx_user_activity_user_created_new ON user_activity_new(user_id, created_at DESC);

-- ============================================================================
-- STEP 7: Migrate reputation_events table to use user_id
-- ============================================================================

CREATE TABLE reputation_events_new (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             INTEGER NOT NULL,
    delta               INTEGER NOT NULL,
    reason              TEXT    NOT NULL,
    related_activity_id INTEGER,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id)             REFERENCES users_new(id)           ON DELETE CASCADE,
    FOREIGN KEY(related_activity_id) REFERENCES user_activity_new(id)   ON DELETE SET NULL
);

-- Migrate reputation_events data
INSERT INTO reputation_events_new (
    id, user_id, delta, reason, related_activity_id, created_at
)
SELECT 
    re.id, u.id, re.delta, re.reason, re.related_activity_id, re.created_at
FROM reputation_events re
JOIN users_new u ON re.user = u.username;

CREATE INDEX idx_reputation_user_new ON reputation_events_new(user_id, created_at DESC);

-- ============================================================================
-- STEP 8: Migrate gamification tables (user_stats, daily_challenges, flow_sessions)
-- ============================================================================

-- Migrate user_stats
CREATE TABLE user_stats_new (
    user_id         INTEGER PRIMARY KEY,
    points          INTEGER DEFAULT 0,
    daily_streak    INTEGER DEFAULT 0,
    longest_streak  INTEGER DEFAULT 0,
    last_active_date DATE,
    translations_count INTEGER DEFAULT 0,
    reviews_count   INTEGER DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users_new(id) ON DELETE CASCADE
);

INSERT INTO user_stats_new (
    user_id, points, daily_streak, longest_streak, last_active_date,
    translations_count, reviews_count, created_at, updated_at
)
SELECT 
    u.id, us.points, us.daily_streak, us.longest_streak, us.last_active_date,
    us.translations_count, us.reviews_count, us.created_at, us.updated_at
FROM user_stats us
JOIN users_new u ON us.user_id = u.username;

CREATE INDEX idx_user_stats_points_new ON user_stats_new(points DESC);
CREATE INDEX idx_user_stats_streak_new ON user_stats_new(daily_streak DESC);

-- Migrate daily_challenges
CREATE TABLE daily_challenges_new (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    challenge_date  DATE NOT NULL,
    challenge_type  TEXT NOT NULL CHECK(challenge_type IN ('translate_5', 'review_10', 'daily_login', 'streak_maintain')),
    target_count    INTEGER NOT NULL,
    current_count   INTEGER DEFAULT 0,
    completed       INTEGER DEFAULT 0 CHECK(completed IN (0, 1)),
    points_reward   INTEGER DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at    DATETIME,
    FOREIGN KEY(user_id) REFERENCES users_new(id) ON DELETE CASCADE,
    UNIQUE(user_id, challenge_date, challenge_type)
);

INSERT INTO daily_challenges_new (
    id, user_id, challenge_date, challenge_type, target_count,
    current_count, completed, points_reward, created_at, completed_at
)
SELECT 
    dc.id, u.id, dc.challenge_date, dc.challenge_type, dc.target_count,
    dc.current_count, dc.completed, dc.points_reward, dc.created_at, dc.completed_at
FROM daily_challenges dc
JOIN users_new u ON dc.user_id = u.username;

CREATE INDEX idx_daily_challenges_user_new ON daily_challenges_new(user_id, challenge_date);
CREATE INDEX idx_daily_challenges_date_new ON daily_challenges_new(challenge_date);

-- Migrate flow_sessions
CREATE TABLE flow_sessions_new (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id                 INTEGER NOT NULL,
    started_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at                DATETIME,
    translations_completed  INTEGER DEFAULT 0,
    reviews_completed       INTEGER DEFAULT 0,
    points_earned           INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users_new(id) ON DELETE CASCADE
);

INSERT INTO flow_sessions_new (
    id, user_id, started_at, ended_at, translations_completed,
    reviews_completed, points_earned
)
SELECT 
    fs.id, u.id, fs.started_at, fs.ended_at, fs.translations_completed,
    fs.reviews_completed, fs.points_earned
FROM flow_sessions fs
JOIN users_new u ON fs.user_id = u.username;

CREATE INDEX idx_flow_sessions_user_new ON flow_sessions_new(user_id, started_at DESC);

-- ============================================================================
-- STEP 9: Drop old tables and rename new tables
-- ============================================================================

-- Drop old tables (this will cascade delete all related data, but we've already migrated)
DROP TABLE IF EXISTS flow_sessions;
DROP TABLE IF EXISTS daily_challenges;
DROP TABLE IF EXISTS user_stats;
DROP TABLE IF EXISTS reputation_events;
DROP TABLE IF EXISTS user_activity;
DROP TABLE IF EXISTS appeal_messages;
DROP TABLE IF EXISTS appeals;
DROP TABLE IF EXISTS translations;
DROP TABLE IF EXISTS users;

-- Rename new tables to original names
ALTER TABLE users_new RENAME TO users;
ALTER TABLE translations_new RENAME TO translations;
ALTER TABLE appeals_new RENAME TO appeals;
ALTER TABLE appeal_messages_new RENAME TO appeal_messages;
ALTER TABLE user_activity_new RENAME TO user_activity;
ALTER TABLE reputation_events_new RENAME TO reputation_events;
ALTER TABLE user_stats_new RENAME TO user_stats;
ALTER TABLE daily_challenges_new RENAME TO daily_challenges;
ALTER TABLE flow_sessions_new RENAME TO flow_sessions;

-- ============================================================================
-- STEP 10: Recreate indexes for translations table
-- ============================================================================

CREATE INDEX idx_translations_status ON translations(status);
CREATE INDEX idx_translations_lang   ON translations(language);
CREATE INDEX idx_appeals_status     ON appeals(status);

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- Migration complete
-- Users now have integer IDs, and all foreign keys have been updated
-- auth_providers table created for multi-provider authentication support
