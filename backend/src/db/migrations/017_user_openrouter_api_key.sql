-- Add openrouter_api_key field to user_preferences table
-- This allows users to bring their own OpenRouter API key
ALTER TABLE user_preferences ADD COLUMN openrouter_api_key TEXT DEFAULT NULL;
