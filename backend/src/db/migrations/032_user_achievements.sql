CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS achievement_tiers (
  achievement_id TEXT NOT NULL,
  tier INTEGER NOT NULL,
  target_value INTEGER NOT NULL,
  reward_points INTEGER NOT NULL,
  PRIMARY KEY (achievement_id, tier),
  FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  achievement_id TEXT NOT NULL,
  tier INTEGER NOT NULL,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id, tier) REFERENCES achievement_tiers(achievement_id, tier),
  UNIQUE(user_id, achievement_id, tier)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
