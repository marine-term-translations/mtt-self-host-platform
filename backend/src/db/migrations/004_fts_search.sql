-- Migration 004: Add FTS5 search tables, triggers, indexes, and views for fast search and faceted browsing
-- This migration adds:
-- 1. FTS5 virtual tables for full-text search on terms and translations
-- 2. Triggers to keep FTS tables in sync with source data
-- 3. Additional indexes for faceting and joins
-- 4. Denormalized view for efficient faceting

-- FTS5 Virtual Table for core term data
CREATE VIRTUAL TABLE IF NOT EXISTS terms_fts USING fts5(
    uri,
    field_term,
    original_value,
    content='',
    tokenize='porter'
);

-- Initial population of terms_fts from existing data
INSERT INTO terms_fts (rowid, uri, field_term, original_value)
SELECT t.id, t.uri, tf.field_term, tf.original_value
FROM terms t
LEFT JOIN term_fields tf ON t.id = tf.term_id;

-- FTS5 Virtual Table for translations
CREATE VIRTUAL TABLE IF NOT EXISTS translations_fts USING fts5(
    value,
    language,
    term_field_id UNINDEXED,
    content='',
    tokenize='porter'
);

-- Initial population of translations_fts from existing data
INSERT INTO translations_fts (rowid, value, language, term_field_id)
SELECT tr.id, tr.value, tr.language, tr.term_field_id
FROM translations tr;

-- Triggers to keep FTS tables in sync with source data

-- Trigger for new terms
CREATE TRIGGER IF NOT EXISTS terms_insert_trigger AFTER INSERT ON terms
BEGIN
    INSERT INTO terms_fts (rowid, uri, field_term, original_value) 
    VALUES (NEW.id, NEW.uri, NULL, NULL);
END;

-- Trigger for term deletion
CREATE TRIGGER IF NOT EXISTS terms_delete_trigger AFTER DELETE ON terms
BEGIN
    DELETE FROM terms_fts WHERE rowid = OLD.id;
END;

-- Trigger for term updates
CREATE TRIGGER IF NOT EXISTS terms_update_trigger AFTER UPDATE ON terms
BEGIN
    UPDATE terms_fts SET uri = NEW.uri WHERE rowid = NEW.id;
END;

-- Trigger for term_fields inserts
CREATE TRIGGER IF NOT EXISTS term_fields_insert_trigger AFTER INSERT ON term_fields
BEGIN
    -- Update the terms_fts entry with field data (using the term's id as rowid)
    UPDATE terms_fts 
    SET field_term = NEW.field_term, 
        original_value = NEW.original_value
    WHERE rowid = NEW.term_id;
END;

-- Trigger for term_fields updates
CREATE TRIGGER IF NOT EXISTS term_fields_update_trigger AFTER UPDATE ON term_fields
BEGIN
    UPDATE terms_fts 
    SET field_term = NEW.field_term, 
        original_value = NEW.original_value
    WHERE rowid = NEW.term_id;
END;

-- Trigger for term_fields deletion
CREATE TRIGGER IF NOT EXISTS term_fields_delete_trigger AFTER DELETE ON term_fields
BEGIN
    -- Reset fields for this term's FTS entry
    UPDATE terms_fts 
    SET field_term = NULL, 
        original_value = NULL
    WHERE rowid = OLD.term_id;
END;

-- Trigger for translations inserts
CREATE TRIGGER IF NOT EXISTS translations_insert_trigger AFTER INSERT ON translations
BEGIN
    INSERT INTO translations_fts (rowid, value, language, term_field_id) 
    VALUES (NEW.id, NEW.value, NEW.language, NEW.term_field_id);
END;

-- Trigger for translations updates
CREATE TRIGGER IF NOT EXISTS translations_update_trigger AFTER UPDATE ON translations
BEGIN
    UPDATE translations_fts 
    SET value = NEW.value, 
        language = NEW.language,
        term_field_id = NEW.term_field_id
    WHERE rowid = NEW.id;
END;

-- Trigger for translations deletion
CREATE TRIGGER IF NOT EXISTS translations_delete_trigger AFTER DELETE ON translations
BEGIN
    DELETE FROM translations_fts WHERE rowid = OLD.id;
END;

-- Additional indexes for faceting and joins
CREATE INDEX IF NOT EXISTS idx_terms_uri ON terms(uri);
CREATE INDEX IF NOT EXISTS idx_translations_term_field_id ON translations(term_field_id);
CREATE INDEX IF NOT EXISTS idx_translations_lang_status ON translations(language, status);
CREATE INDEX IF NOT EXISTS idx_term_fields_field_uri ON term_fields(field_uri);

-- Denormalized view for efficient faceting and browsing
CREATE VIEW IF NOT EXISTS term_summary AS
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
    tr.value as translation_value
FROM terms t
LEFT JOIN term_fields tf ON t.id = tf.term_id
LEFT JOIN translations tr ON tf.id = tr.term_field_id;

-- Optimize the database
VACUUM;
ANALYZE;
