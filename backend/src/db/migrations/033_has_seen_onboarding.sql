-- Migration 033: Add has_seen_onboarding to user_preferences
ALTER TABLE user_preferences ADD COLUMN has_seen_onboarding INTEGER DEFAULT 0;
