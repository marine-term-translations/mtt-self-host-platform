-- Migration: 030_global_email_settings
-- Add system_settings table and default global email disable flag

CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

INSERT OR IGNORE INTO system_settings (key, value) VALUES ('disable_all_emails', 'false');
