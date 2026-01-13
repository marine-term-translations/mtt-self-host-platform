-- Migration 005: Add sources table and source tracking to terms and term_fields
-- Created: 2026-01-13
-- This migration adds support for source management, LDES integration, and file-based imports

-- Create the new 'sources' table
CREATE TABLE IF NOT EXISTS sources (
    source_id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
    graph_name TEXT
);

-- Add source_id to the 'terms' table
-- Note: SQLite ALTER TABLE does not support adding foreign key constraints
-- The column is added without constraints due to SQLite limitations
ALTER TABLE terms ADD COLUMN source_id INTEGER;

-- Add source_id to the 'term_fields' table
-- Note: SQLite ALTER TABLE does not support adding foreign key constraints
-- The column is added without constraints due to SQLite limitations
ALTER TABLE term_fields ADD COLUMN source_id INTEGER;

-- Create indexes for performance on source_id columns
CREATE INDEX IF NOT EXISTS idx_terms_source_id ON terms(source_id);
CREATE INDEX IF NOT EXISTS idx_term_fields_source_id ON term_fields(source_id);
CREATE INDEX IF NOT EXISTS idx_sources_path ON sources(source_path);
CREATE INDEX IF NOT EXISTS idx_sources_graph ON sources(graph_name);
