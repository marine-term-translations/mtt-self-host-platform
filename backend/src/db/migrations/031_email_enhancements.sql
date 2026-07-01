-- Migration: 031_email_enhancements
-- Add last_login_at and inactive email tracking to users
ALTER TABLE users ADD COLUMN last_login_at DATETIME;
ALTER TABLE users ADD COLUMN last_inactive_email_sent_type TEXT DEFAULT 'none' CHECK(last_inactive_email_sent_type IN ('none', '7_day', '14_day'));
ALTER TABLE users ADD COLUMN last_inactive_email_sent_at DATETIME;

-- Add email_tone and last_digest_sent_at to user_preferences
ALTER TABLE user_preferences ADD COLUMN email_tone TEXT DEFAULT 'casual' CHECK(email_tone IN ('professional', 'casual', 'enthusiastic'));
ALTER TABLE user_preferences ADD COLUMN last_digest_sent_at DATETIME;
