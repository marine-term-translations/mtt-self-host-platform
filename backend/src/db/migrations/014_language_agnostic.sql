-- Migration 014: Language-agnostic translation system
-- This migration converts the translation system from English-centric to truly language-agnostic.
-- It introduces the concept of "original" labels from ingestion sources and user language preferences.

-- Step 1: Drop views and triggers that depend on the translations table
DROP VIEW IF EXISTS term_summary;
DROP TRIGGER IF EXISTS translations_fts_insert;
DROP TRIGGER IF EXISTS translations_fts_update;
DROP TRIGGER IF EXISTS translations_fts_delete;

-- Step 2: Remove language constraint and allow all ISO 639-1/3 codes and 'undefined' (for terms without language tags)
-- Add 'original' to the existing status values to preserve workflow statuses
-- We need to recreate the translations table

-- Create new translations table with extended status constraint
CREATE TABLE translations_new (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    term_field_id  INTEGER NOT NULL REFERENCES term_fields(id) ON DELETE CASCADE,
    language       TEXT    NOT NULL DEFAULT 'undefined',
    value          TEXT    NOT NULL,
    status         TEXT    NOT NULL DEFAULT 'draft' CHECK(status IN ('original', 'draft', 'review', 'approved', 'rejected', 'merged')),
    source         TEXT,  -- e.g. 'rdf-ingest', 'user:123', 'ai:claude-3.5', 'merged'
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    modified_at    DATETIME,
    modified_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(term_field_id, language, status)
);

-- Copy existing data, preserving all original status values
INSERT INTO translations_new (
    id, term_field_id, language, value, status, source,
    created_at, updated_at, created_by_id, modified_at, modified_by_id, reviewed_by_id
)
SELECT 
    id, 
    term_field_id, 
    language, 
    value,
    status,  -- Preserve original status (draft, review, approved, rejected, merged)
    'user' as source,
    created_at, 
    updated_at, 
    created_by_id, 
    modified_at, 
    modified_by_id, 
    reviewed_by_id
FROM translations;

-- Drop old table and rename new one
DROP TABLE translations;
ALTER TABLE translations_new RENAME TO translations;

-- Recreate indexes
CREATE INDEX idx_translations_status ON translations(status);
CREATE INDEX idx_translations_lang ON translations(language);
CREATE INDEX idx_translations_concept_status_lang ON translations(term_field_id, status, language);
CREATE INDEX idx_translations_source ON translations(source);

-- Step 3: Create user_preferences table for language settings
CREATE TABLE user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferred_languages TEXT NOT NULL DEFAULT '["en"]',  -- JSON array of language codes
    visible_extra_languages TEXT NOT NULL DEFAULT '[]',  -- JSON array of additional languages to show
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_preferences_updated ON user_preferences(updated_at);

-- Step 4: Update FTS5 triggers to handle new status column
-- Drop old triggers
DROP TRIGGER IF EXISTS translations_fts_insert;
DROP TRIGGER IF EXISTS translations_fts_update;
DROP TRIGGER IF EXISTS translations_fts_delete;

-- Recreate triggers with new schema
CREATE TRIGGER translations_fts_insert AFTER INSERT ON translations BEGIN
    INSERT INTO translations_fts(rowid, value, language)
    VALUES (new.id, new.value, new.language);
END;

CREATE TRIGGER translations_fts_update AFTER UPDATE ON translations BEGIN
    UPDATE translations_fts
    SET value = new.value, language = new.language
    WHERE rowid = new.id;
END;

CREATE TRIGGER translations_fts_delete AFTER DELETE ON translations BEGIN
    DELETE FROM translations_fts WHERE rowid = old.id;
END;

-- Step 5: Rebuild FTS index to include existing translations
DELETE FROM translations_fts;
INSERT INTO translations_fts(rowid, value, language)
SELECT id, value, language FROM translations;

-- Step 6: Recreate the term_summary view to work with the new schema
CREATE VIEW term_summary AS
SELECT 
    t.id as term_id,
    t.uri,
    tf.id as term_field_id,
    tf.field_uri,
    tf.field_term,
    tf.original_value,
    tr.id as translation_id,
    tr.language,
    tr.status,
    tr.value as translation_value,
    tr.source
FROM terms t
LEFT JOIN term_fields tf ON t.id = tf.term_id
LEFT JOIN translations tr ON tf.id = tr.term_field_id;
