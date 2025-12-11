-- Migration 004: Add FTS5 search tables, triggers, indexes, and views for fast search and faceted browsing
-- This migration adds:
-- 1. FTS5 virtual tables for full-text search on terms and translations
-- 2. Triggers to keep FTS tables in sync with source data
-- 3. Additional indexes for faceting and joins
-- 4. Denormalized view for efficient faceting

-- FTS5 Virtual Table for term fields (searchable term data)
CREATE VIRTUAL TABLE IF NOT EXISTS terms_fts USING fts5(
    field_term,
    original_value,
    content='term_fields',
    content_rowid='id',
    tokenize='porter'
);

-- FTS5 Virtual Table for translations  
CREATE VIRTUAL TABLE IF NOT EXISTS translations_fts USING fts5(
    value,
    language,
    content='translations',
    content_rowid='id',
    tokenize='porter'
);

-- Triggers to keep FTS tables in sync with source data

-- Trigger for term_fields inserts
CREATE TRIGGER IF NOT EXISTS term_fields_fts_insert AFTER INSERT ON term_fields
BEGIN
    INSERT INTO terms_fts(rowid, field_term, original_value) 
    VALUES (NEW.id, NEW.field_term, NEW.original_value);
END;

-- Trigger for term_fields updates
CREATE TRIGGER IF NOT EXISTS term_fields_fts_update AFTER UPDATE ON term_fields
BEGIN
    INSERT INTO terms_fts(terms_fts, rowid, field_term, original_value)
    VALUES('delete', OLD.id, NULL, NULL);
    INSERT INTO terms_fts(rowid, field_term, original_value) 
    VALUES (NEW.id, NEW.field_term, NEW.original_value);
END;

-- Trigger for term_fields deletion
CREATE TRIGGER IF NOT EXISTS term_fields_fts_delete AFTER DELETE ON term_fields
BEGIN
    INSERT INTO terms_fts(terms_fts, rowid, field_term, original_value)
    VALUES('delete', OLD.id, NULL, NULL);
END;

-- Triggers for translations
CREATE TRIGGER IF NOT EXISTS translations_fts_insert AFTER INSERT ON translations
BEGIN
    INSERT INTO translations_fts(rowid, value, language) 
    VALUES (NEW.id, NEW.value, NEW.language);
END;

CREATE TRIGGER IF NOT EXISTS translations_fts_update AFTER UPDATE ON translations
BEGIN
    INSERT INTO translations_fts(translations_fts, rowid, value, language)
    VALUES('delete', OLD.id, NULL, NULL);
    INSERT INTO translations_fts(rowid, value, language) 
    VALUES (NEW.id, NEW.value, NEW.language);
END;

CREATE TRIGGER IF NOT EXISTS translations_fts_delete AFTER DELETE ON translations
BEGIN
    INSERT INTO translations_fts(translations_fts, rowid, value, language)
    VALUES('delete', OLD.id, NULL, NULL);
END;

-- Populate FTS tables from existing data
INSERT INTO terms_fts(rowid, field_term, original_value)
SELECT id, field_term, original_value
FROM term_fields;

INSERT INTO translations_fts(rowid, value, language)
SELECT id, value, language
FROM translations;

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
