# User ID Migration Guide

## Overview

This migration converts the `users` table from using `username TEXT PRIMARY KEY` to `id INTEGER PRIMARY KEY`, introducing support for:
- Multiple authentication providers (ORCID, GitHub, Google, etc.)
- Username changes without breaking references
- Account merging capabilities
- Stable user identifiers for APIs and sessions

## Migration Details

### Database Changes

#### New Schema

**users table:**
```sql
CREATE TABLE users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT NOT NULL UNIQUE,
    reputation INTEGER DEFAULT 0,
    joined_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    extra      TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**auth_providers table (NEW):**
```sql
CREATE TABLE auth_providers (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider         TEXT    NOT NULL,
    provider_id      TEXT    NOT NULL,
    email            TEXT,
    name             TEXT,
    avatar_url       TEXT,
    access_token     TEXT,
    refresh_token    TEXT,
    token_expires_at DATETIME,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider),
    UNIQUE(provider, provider_id)
);
```

#### Tables Updated

All tables with username-based foreign keys have been migrated to use `user_id INTEGER`:

- ✅ `translations` - `created_by` → `created_by_id`, `modified_by` → `modified_by_id`, `reviewed_by` → `reviewed_by_id`
- ✅ `appeals` - `opened_by` → `opened_by_id`
- ✅ `appeal_messages` - `author` → `author_id`
- ✅ `user_activity` - `user` → `user_id`
- ✅ `reputation_events` - `user` → `user_id`
- ✅ `user_stats` - `user_id` now references `users(id)` instead of `users(username)`
- ✅ `daily_challenges` - `user_id` now references `users(id)` instead of `users(username)`
- ✅ `flow_sessions` - `user_id` now references `users(id)` instead of `users(username)`

### Code Changes

#### Backend

1. **Authentication (auth.routes.js)**
   - Session now stores `user_id` (integer) instead of just `orcid`
   - Creates/updates `auth_providers` entry on login
   - Maintains backward compatibility by including both `id` and `username` in session

2. **Services**
   - `reputation.service.js` - All functions now accept both `user_id` (preferred) or `username` (backward compat)
   - `gamification.service.js` - All functions now accept both `user_id` or `username`
   - Helper function `resolveUserIdentifier()` added for flexible user lookups

3. **Routes**
   - `user.routes.js` - Uses `user_id` from session for lookups
   - `terms.routes.js` - Updated to use `user_id` for translations and activity logging
   - `appeals.routes.js` - Updated to use `user_id` for appeals
   - `flow.controller.js` - Uses `user_id` from session

4. **Database Helpers (database.js)**
   - Added `resolveUsernameToId(username)` - Convert username to user_id
   - Added `getUserById(userId)` - Get user by integer ID
   - Added `getUserByUsername(username)` - Get user by username

#### Frontend

1. **Types (types.ts)**
   - Added `id` and `user_id` fields to `User` interface
   - Updated `ApiTranslation`, `ApiUserActivity`, `ApiAppeal`, `ApiAppealMessage` interfaces
   - Added new `ApiAuthProvider` interface

### Backward Compatibility

The migration maintains backward compatibility:

1. **Username still unique** - Usernames remain unique identifiers but are no longer primary keys
2. **Dual acceptance** - All services accept both `user_id` (preferred) and `username`
3. **Session includes both** - Session contains both `id` and `username` for compatibility
4. **Resolution layer** - `resolveUserIdentifier()` seamlessly handles both formats

### Migration Execution

The migration runs automatically via the existing migration system:

1. **Automatic on startup** - Migration `003_user_id_migration.sql` runs when the backend starts
2. **Single transaction** - All changes executed atomically for data safety
3. **Zero data loss** - 100% of existing data is preserved
4. **Idempotent** - Safe to run multiple times (checks `migrations_applied` table)

### Testing

Migration has been tested with:
- ✅ Sample database with users, translations, appeals, and activity
- ✅ Foreign key integrity verification
- ✅ Data preservation confirmation
- ✅ Index recreation validation

### Deployment Checklist

Before deploying:

1. ✅ Backup production database
2. ✅ Review migration script (`003_user_id_migration.sql`)
3. ✅ Test on copy of production data
4. ⚠️  Plan for session invalidation (all users will need to re-login)
5. ⚠️  Coordinate frontend + backend deployment
6. ⚠️  Monitor logs during first startup

### Rollback Plan

**If migration fails mid-way:**

The migration uses a single transaction, so any failure will automatically rollback all changes.

**If you need to rollback after successful migration:**

1. Stop the backend service
2. Restore database from backup taken before migration
3. Revert to previous code version
4. Restart services

**Note:** Rolling back after users have created new data will cause that data to be lost.

### Post-Migration

After successful migration:

1. **Session invalidation** - All existing sessions will be invalid (users must re-login)
2. **New user flow** - New users will automatically get entries in `auth_providers` table
3. **Multiple providers** - Ready to add GitHub, Google, email authentication
4. **Username changes** - System can now support username changes safely

### Future Enhancements

With this migration complete, the system is ready for:

1. **Multiple auth providers** - Users can link GitHub, Google, etc.
2. **Account merging** - Merge multiple provider accounts into one user
3. **Username changes** - Change username without breaking references
4. **OAuth improvements** - Store and refresh access tokens properly

### API Changes

**Breaking Changes:**

- None - All endpoints maintain backward compatibility

**New Fields in Responses:**

- User objects now include `id` field
- Translation objects now include `created_by_id`, `modified_by_id`, `reviewed_by_id`
- Appeal objects now include `opened_by_id`
- All activity objects now include `user_id`

**Deprecations:**

- `created_by`, `modified_by`, `reviewed_by` (string fields) are maintained for now but should be migrated to use ID fields
- APIs still accept usernames in place of IDs, but IDs are preferred

### Support

For issues or questions:
1. Check migration logs in backend console
2. Verify `migrations_applied` table has entry for `003_user_id_migration`
3. Check database schema matches expected structure
4. Review any error messages during startup

### Technical Notes

**Why Integer IDs?**

- **Performance** - Integer joins are faster than text joins
- **Stability** - IDs never change, even if usernames do
- **Flexibility** - Enables multiple providers per user
- **Standard practice** - Industry best practice for user management

**Why auth_providers Table?**

- **Multi-provider** - Support ORCID, GitHub, Google, email, etc.
- **Token management** - Store access/refresh tokens per provider
- **Account linking** - One user can have multiple authentication methods
- **Clean separation** - User identity separate from authentication methods

**Foreign Key Strategy:**

- `created_by_id` - Uses `ON DELETE RESTRICT` (can't delete user who created content)
- `modified_by_id` - Uses `ON DELETE SET NULL` (preserve content if modifier deleted)
- `user_id` in activity tables - Uses `ON DELETE CASCADE` (delete activity with user)
