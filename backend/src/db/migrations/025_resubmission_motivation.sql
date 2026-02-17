-- Migration: Add resubmission_motivation field to translations table
-- This allows users to provide their own motivation/argument when resubmitting a rejected translation
-- This enables negotiation and dispute of rejection reasons

ALTER TABLE translations ADD COLUMN resubmission_motivation TEXT;
