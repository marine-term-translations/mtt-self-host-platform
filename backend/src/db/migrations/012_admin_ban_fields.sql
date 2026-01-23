-- Migration: Add superadmin and ban fields to users table
-- Created: 2026-01-21
-- Purpose: Support superadmin role and user banning functionality

BEGIN TRANSACTION;

-- ============================================================================
-- STEP 1: Update users table structure via extra field
-- ============================================================================
-- The 'extra' JSON field in users table will now support:
-- - is_admin: boolean (already exists)
-- - is_superadmin: boolean (new)
-- - is_banned: boolean (new)
-- - ban_reason: string (new)
-- - banned_at: ISO datetime string (new)

-- ============================================================================
-- STEP 2: Update the first user to be superadmin
-- ============================================================================
-- Set the first user (lowest ID) as superadmin
UPDATE users
SET extra = json_set(
    COALESCE(extra, '{}'),
    '$.is_superadmin', 
    CASE WHEN id = (SELECT MIN(id) FROM users) THEN 1 ELSE 0 END
)
WHERE id = (SELECT MIN(id) FROM users);

-- Ensure the first user is also admin
UPDATE users
SET extra = json_set(
    COALESCE(extra, '{}'),
    '$.is_admin', 
    1
)
WHERE id = (SELECT MIN(id) FROM users);

-- ============================================================================
-- STEP 3: Initialize ban fields for all users
-- ============================================================================
-- Set default values for all existing users
UPDATE users
SET extra = json_set(
    json_set(
        json_set(
            COALESCE(extra, '{}'),
            '$.is_banned',
            COALESCE(json_extract(extra, '$.is_banned'), 0)
        ),
        '$.ban_reason',
        COALESCE(json_extract(extra, '$.ban_reason'), '')
    ),
    '$.banned_at',
    COALESCE(json_extract(extra, '$.banned_at'), '')
);

COMMIT;

-- Migration complete
-- Users table now supports superadmin and ban functionality
