-- Migration 034: Add admin_notes column to message_reports table if missing
ALTER TABLE message_reports ADD COLUMN admin_notes TEXT;
