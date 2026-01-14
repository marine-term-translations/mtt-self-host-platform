-- Migration 006: Add source_type column to sources table
-- Created: 2026-01-14
-- This migration adds source_type to distinguish between LDES feeds and static file imports

-- Add source_type column to sources table
ALTER TABLE sources ADD COLUMN source_type TEXT CHECK(source_type IN ('LDES', 'Static_file')) DEFAULT 'Static_file';

-- Create index for source_type for efficient filtering
CREATE INDEX IF NOT EXISTS idx_sources_type ON sources(source_type);
