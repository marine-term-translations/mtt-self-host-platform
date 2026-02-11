-- Migration: Add rejection_reason field to translations table
-- This allows reviewers to provide a reason when rejecting a translation

ALTER TABLE translations ADD COLUMN rejection_reason TEXT;
