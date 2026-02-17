-- Migration: Add notifications system and discussion status
-- This enables users to get notified when someone responds to their discussions
-- and tracks all participants in a discussion

-- Add 'discussion' status to translations table
-- Note: SQLite doesn't support ALTER TABLE ... ALTER COLUMN to modify CHECK constraints
-- So we need to create a new table and migrate data

-- First, create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            TEXT NOT NULL CHECK(type IN ('discussion_reply', 'translation_approved', 'translation_rejected')),
    translation_id  INTEGER NOT NULL REFERENCES translations(id) ON DELETE CASCADE,
    term_id         INTEGER REFERENCES terms(id) ON DELETE SET NULL,
    message         TEXT NOT NULL,
    link            TEXT,  -- URL or route to navigate to
    read            INTEGER DEFAULT 0 CHECK(read IN (0, 1)),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_id   INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Create discussion_participants table to track who's involved in each translation discussion
CREATE TABLE IF NOT EXISTS discussion_participants (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    translation_id  INTEGER NOT NULL REFERENCES translations(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(translation_id, user_id)
);

CREATE INDEX idx_discussion_participants_translation ON discussion_participants(translation_id);
CREATE INDEX idx_discussion_participants_user ON discussion_participants(user_id);
