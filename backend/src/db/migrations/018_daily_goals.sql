-- Migration: Add daily goals for users
-- Description: Add a personal daily goal for each user (5 translations or reviews)
--              that resets daily and rewards 5 reputation upon completion

-- Daily goals tracking table
CREATE TABLE IF NOT EXISTS user_daily_goals (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    goal_date       DATE NOT NULL,
    target_count    INTEGER NOT NULL DEFAULT 5,
    current_count   INTEGER DEFAULT 0,
    completed       INTEGER DEFAULT 0 CHECK(completed IN (0, 1)),
    rewarded        INTEGER DEFAULT 0 CHECK(rewarded IN (0, 1)),
    completed_at    DATETIME,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, goal_date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_goals_user ON user_daily_goals(user_id, goal_date);
CREATE INDEX IF NOT EXISTS idx_user_daily_goals_date ON user_daily_goals(goal_date);
