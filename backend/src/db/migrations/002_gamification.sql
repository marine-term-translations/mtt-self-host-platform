-- Migration: Add gamification tables for Translation Flow feature
-- Created: 2025-12-10

-- User statistics table for gamification
CREATE TABLE IF NOT EXISTS user_stats (
    user_id         TEXT PRIMARY KEY,
    points          INTEGER DEFAULT 0,
    daily_streak    INTEGER DEFAULT 0,
    longest_streak  INTEGER DEFAULT 0,
    last_active_date DATE,
    translations_count INTEGER DEFAULT 0,
    reviews_count   INTEGER DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(username) ON DELETE CASCADE
);

-- Daily challenges tracking
CREATE TABLE IF NOT EXISTS daily_challenges (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         TEXT NOT NULL,
    challenge_date  DATE NOT NULL,
    challenge_type  TEXT NOT NULL CHECK(challenge_type IN ('translate_5', 'review_10', 'daily_login', 'streak_maintain')),
    target_count    INTEGER NOT NULL,
    current_count   INTEGER DEFAULT 0,
    completed       INTEGER DEFAULT 0 CHECK(completed IN (0, 1)),
    points_reward   INTEGER DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at    DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(username) ON DELETE CASCADE,
    UNIQUE(user_id, challenge_date, challenge_type)
);

-- Flow session tracking for analytics
CREATE TABLE IF NOT EXISTS flow_sessions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         TEXT NOT NULL,
    started_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at        DATETIME,
    translations_completed INTEGER DEFAULT 0,
    reviews_completed INTEGER DEFAULT 0,
    points_earned   INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(username) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_stats_points ON user_stats(points DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_streak ON user_stats(daily_streak DESC);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_user ON daily_challenges(user_id, challenge_date);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON daily_challenges(challenge_date);
CREATE INDEX IF NOT EXISTS idx_flow_sessions_user ON flow_sessions(user_id, started_at DESC);
