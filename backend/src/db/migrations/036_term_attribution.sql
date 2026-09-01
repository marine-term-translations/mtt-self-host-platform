-- Migration 036: Add created_by_id to terms table for attribution
ALTER TABLE terms ADD COLUMN created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
