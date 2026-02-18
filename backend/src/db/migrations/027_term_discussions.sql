-- Migration: Add term-level discussion system
-- This enables users to have general discussions about terms (not just appeal disputes)

-- Create term_discussions table
CREATE TABLE IF NOT EXISTS term_discussions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    term_id         INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    started_by_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed')),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_term_discussions_term ON term_discussions(term_id);
CREATE INDEX IF NOT EXISTS idx_term_discussions_status ON term_discussions(status);

-- Create term_discussion_messages table
CREATE TABLE IF NOT EXISTS term_discussion_messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    discussion_id   INTEGER NOT NULL REFERENCES term_discussions(id) ON DELETE CASCADE,
    author_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message         TEXT NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_term_discussion_messages_discussion ON term_discussion_messages(discussion_id);
CREATE INDEX IF NOT EXISTS idx_term_discussion_messages_created ON term_discussion_messages(created_at DESC);

-- Create term_discussion_participants table
CREATE TABLE IF NOT EXISTS term_discussion_participants (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    discussion_id       INTEGER NOT NULL REFERENCES term_discussions(id) ON DELETE CASCADE,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_message_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_message_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(discussion_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_term_discussion_participants_discussion ON term_discussion_participants(discussion_id);
CREATE INDEX IF NOT EXISTS idx_term_discussion_participants_user ON term_discussion_participants(user_id);

-- Create message_reports table for term discussions (if not already exists for appeals)
-- Extend existing message_reports to work with both appeal_messages and term_discussion_messages
-- The existing message_reports table uses message_id which can reference either type
