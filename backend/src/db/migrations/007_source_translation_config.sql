-- Migration 007: Add translation configuration to sources table
-- Created: 2026-01-15
-- This migration adds support for storing RDF type and predicate path configurations

-- Add translation_config column to store JSON configuration
-- This will contain: selected RDF types, predicate paths, and nested configurations
ALTER TABLE sources ADD COLUMN translation_config TEXT;

-- Create index for faster queries on sources with configurations
CREATE INDEX IF NOT EXISTS idx_sources_has_config ON sources(source_id) WHERE translation_config IS NOT NULL;
