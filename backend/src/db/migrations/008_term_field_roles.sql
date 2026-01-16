-- Migration 008: Add field roles for flexible term structure
-- This migration adds support for configuring which fields serve as:
-- 1. Term label (for identifying the term)
-- 2. Reference metadata (to help translators)
-- 3. Translatable content (what needs translation)

-- Add configuration columns to sources table
ALTER TABLE sources ADD COLUMN label_field_uri TEXT;
ALTER TABLE sources ADD COLUMN reference_field_uris TEXT; -- JSON array of field URIs
ALTER TABLE sources ADD COLUMN translatable_field_uris TEXT; -- JSON array of field URIs

-- Add field_role column to term_fields table
ALTER TABLE term_fields ADD COLUMN field_role TEXT 
    CHECK(field_role IN ('label', 'reference', 'translatable'));

-- Create index for efficient field role lookups
CREATE INDEX IF NOT EXISTS idx_term_fields_role ON term_fields(field_role);

-- Note: Existing data will have NULL field_role
-- The application should handle NULL as 'translatable' for backward compatibility
