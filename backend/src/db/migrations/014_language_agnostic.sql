-- Migration 014: Language-agnostic translation system
-- This migration converts the translation system from English-centric to truly language-agnostic.
-- It introduces the concept of "original" labels from ingestion sources and user language preferences.

-- Step 1: Drop views and triggers that depend on the translations table
DROP VIEW IF EXISTS term_summary;
DROP TRIGGER IF EXISTS translations_fts_insert;
DROP TRIGGER IF EXISTS translations_fts_update;
DROP TRIGGER IF EXISTS translations_fts_delete;

-- Step 2: Remove language constraint and allow all ISO 639-1/3 codes and 'und' (undetermined)
-- We need to recreate the translations table without the CHECK constraint

-- Create new translations table without language constraint
CREATE TABLE translations_new (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    term_field_id  INTEGER NOT NULL REFERENCES term_fields(id) ON DELETE CASCADE,
    language       TEXT    NOT NULL DEFAULT 'und',
    value          TEXT    NOT NULL,
    status         TEXT    NOT NULL DEFAULT 'translated' CHECK(status IN ('original', 'translated', 'merged')),
    source         TEXT,  -- e.g. 'rdf-ingest', 'user:123', 'ai:claude-3.5', 'merged'
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    modified_at    DATETIME,
    modified_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(term_field_id, language, status)
);

-- Copy existing data, setting status to 'translated' and source to 'user'
-- Old status values (draft, review, approved, rejected, merged) are preserved in a new column
INSERT INTO translations_new (
    id, term_field_id, language, value, status, source,
    created_at, updated_at, created_by_id, modified_at, modified_by_id, reviewed_by_id
)
SELECT 
    id, 
    term_field_id, 
    language, 
    value,
    CASE 
        WHEN status = 'merged' THEN 'merged'
        ELSE 'translated'
    END as status,
    'user' as source,
    created_at, 
    updated_at, 
    created_by_id, 
    modified_at, 
    modified_by_id, 
    reviewed_by_id
FROM translations;

-- Store old workflow status in a separate table for backward compatibility
CREATE TABLE translation_workflow_status (
    translation_id INTEGER PRIMARY KEY REFERENCES translations_new(id) ON DELETE CASCADE,
    workflow_status TEXT NOT NULL DEFAULT 'draft' CHECK(workflow_status IN ('draft', 'review', 'approved', 'rejected')),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy workflow status for existing translations
INSERT INTO translation_workflow_status (translation_id, workflow_status)
SELECT id, status 
FROM translations
WHERE status IN ('draft', 'review', 'approved', 'rejected');

-- Drop old table and rename new one
DROP TABLE translations;
ALTER TABLE translations_new RENAME TO translations;

-- Recreate indexes
CREATE INDEX idx_translations_status ON translations(status);
CREATE INDEX idx_translations_lang ON translations(language);
CREATE INDEX idx_translations_concept_status_lang ON translations(term_field_id, status, language);
CREATE INDEX idx_translations_source ON translations(source);

-- Step 2: Create user_preferences table for language settings
CREATE TABLE user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferred_languages TEXT NOT NULL DEFAULT '["en"]',  -- JSON array of language codes
    visible_extra_languages TEXT NOT NULL DEFAULT '[]',  -- JSON array of additional languages to show
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_preferences_updated ON user_preferences(updated_at);

-- Step 3: Update FTS5 triggers to handle new status column
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
    tr.source,
    COALESCE(tws.workflow_status, 'approved') as workflow_status
FROM terms t
LEFT JOIN term_fields tf ON t.id = tf.term_id
LEFT JOIN translations tr ON tf.id = tr.term_field_id
LEFT JOIN translation_workflow_status tws ON tr.id = tws.translation_id;

-- Step 7: Add a view to make it easier to query translations with workflow status
CREATE VIEW translations_with_workflow AS
SELECT 
    t.*,
    COALESCE(tws.workflow_status, 'approved') as workflow_status
FROM translations t
LEFT JOIN translation_workflow_status tws ON t.id = tws.translation_id;
