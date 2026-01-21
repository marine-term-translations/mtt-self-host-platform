-- Migration 011: Add description field to sources table
-- Created: 2026-01-21
-- This migration adds a description field to the sources table to provide user-friendly descriptions

-- Add description column to sources table
ALTER TABLE sources ADD COLUMN description TEXT;
