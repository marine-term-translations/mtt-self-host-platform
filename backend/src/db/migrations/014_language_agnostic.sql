-- Migration 014: Language-agnostic translation system
-- This migration is integrated into schema.sql
-- The database will be wiped for this PR, so this migration file is a placeholder.
-- All changes have been incorporated into the base schema.sql file.

-- Key changes in schema.sql:
-- 1. term_fields: Removed field_term and field_role columns
-- 2. term_fields: Changed UNIQUE constraint to (term_id, field_uri)
-- 3. translations: Removed language CHECK constraint, now accepts any ISO 639 code or 'undefined'
-- 4. translations: Added 'original' to status CHECK constraint
-- 5. translations: Added source column
-- 6. translations: Changed UNIQUE constraint to (term_field_id, language, status)
-- 7. Created user_preferences table
-- 8. Added indexes for performance

SELECT 'Migration 014 integrated into schema.sql - database will be reset' as message;
