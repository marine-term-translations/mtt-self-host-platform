-- Migration: Add configurable reputation rules
-- Description: Add reputation_rules table to store configurable reputation system parameters

-- Reputation rules - configurable reputation system parameters
CREATE TABLE IF NOT EXISTS reputation_rules (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_name   TEXT NOT NULL UNIQUE,
    rule_value  INTEGER NOT NULL,
    description TEXT,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default reputation rules (only if they don't already exist)
INSERT OR IGNORE INTO reputation_rules (rule_name, rule_value, description) VALUES
('TRANSLATION_APPROVED', 5, 'Reward when translation is approved'),
('TRANSLATION_MERGED', 10, 'Reward when translation is merged (final acceptance)'),
('TRANSLATION_CREATED', 1, 'Small reward for creating a new translation'),
('BASE_REJECTION_PENALTY', -5, 'Base penalty for rejected translations'),
('BASE_FALSE_REJECTION_PENALTY', -10, 'Base penalty for false rejections'),
('REJECTION_LOOKBACK_DAYS', 14, 'Days to look back for cascading rejection penalty'),
('REPUTATION_TIER_VETERAN', 1000, 'Reputation threshold for veteran tier'),
('REPUTATION_TIER_TRUSTED', 500, 'Reputation threshold for trusted tier'),
('REPUTATION_TIER_REGULAR', 100, 'Reputation threshold for regular tier');
