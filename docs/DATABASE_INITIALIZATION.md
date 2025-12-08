# Database Initialization

This document explains how the automatic database initialization works in the Marine Term Translations platform.

## Overview

The application automatically checks for and creates the SQLite database on startup. If the database doesn't exist or hasn't been initialized with the schema, it will be created automatically.

## How It Works

### 1. Startup Process

When the backend server starts (`src/server.js`), it calls `dbInit.bootstrap()` which:

1. **Checks if database directory exists** - Creates it if needed
2. **Checks if database file exists** - Creates it if needed
3. **Checks if schema is applied** - Applies schema from `migrations/schema.sql` if needed
4. **Logs the initialization status** - Reports what actions were taken

### 2. Database Location

The database location is configured via the `SQLITE_DB_PATH` environment variable:

```env
# Default location
SQLITE_DB_PATH=backend/data/translations.db
```

The database directory (`backend/data/`) is automatically created if it doesn't exist.

### 3. Schema Application

The database schema is defined in `backend/src/db/migrations/schema.sql` and includes:

**Tables:**
- `terms` - Marine terms/concepts
- `term_fields` - Fields for each term (labels, definitions, etc.)
- `translations` - Translations of term fields
- `appeals` - Appeals for rejected/disputed translations
- `appeal_messages` - Messages within an appeal
- `users` - User accounts and reputation
- `user_activity` - Activity log
- `reputation_events` - Reputation change history

**Indexes:** Performance indexes on commonly queried fields

## Configuration

### Environment Variables

```env
# Required: Path to SQLite database file
SQLITE_DB_PATH=backend/data/translations.db
```

### Docker Deployment

In Docker, you can persist the database using a volume:

```yaml
services:
  backend:
    volumes:
      - ./backend/data:/app/backend/data
```

This ensures the database persists across container restarts.

## Startup Logs

When the application starts, you'll see one of these log messages:

### First-time startup (database created):
```
[DB Init] Starting database initialization...
[DB Init] Created database directory: backend/data
[DB Init] Database file not found at backend/data/translations.db
[DB Init] Creating new database...
[DB Init] Database schema not initialized
[DB Init] Applying schema from migrations/schema.sql...
[DB Init] ✓ Database schema applied successfully
[DB Init] Database ready
Server listening on port 5000
```

### Subsequent startups (database exists):
```
[DB Init] Starting database initialization...
[DB Init] ✓ Database already initialized
[DB Init] Database ready
Server listening on port 5000
```

## Manual Database Operations

### Reset Database

To reset the database (⚠️ WARNING: deletes all data):

```bash
rm backend/data/translations.db
# Restart the server - database will be recreated
```

### Backup Database

```bash
# Create backup
cp backend/data/translations.db backups/translations-$(date +%Y%m%d-%H%M%S).db

# Restore from backup
cp backups/translations-YYYYMMDD-HHMMSS.db backend/data/translations.db
```

### Inspect Database

Use SQLite CLI to inspect:

```bash
sqlite3 backend/data/translations.db

# List tables
.tables

# View schema
.schema terms

# Query data
SELECT * FROM users;

# Exit
.quit
```

## Troubleshooting

### Database initialization fails

**Error:** `SQLITE_DB_PATH environment variable is not set`

**Solution:** Set the `SQLITE_DB_PATH` environment variable in your `.env` file

```env
SQLITE_DB_PATH=backend/data/translations.db
```

---

**Error:** `EACCES: permission denied, mkdir 'backend/data'`

**Solution:** Ensure the backend process has write permissions to create the directory

```bash
# Give write permissions
chmod 755 backend

# Or create directory manually
mkdir -p backend/data
```

---

**Error:** `SQLITE_CANTOPEN: unable to open database file`

**Solution:** The directory doesn't exist or isn't writable

```bash
# Create directory
mkdir -p backend/data

# Ensure it's writable
chmod 755 backend/data
```

### Database locked errors

**Error:** `SQLITE_BUSY: database is locked`

**Solution:** Multiple processes are trying to access the database

- Ensure only one backend instance is running
- Check for orphaned processes: `ps aux | grep node`
- Kill orphaned processes if needed

### Schema migration

When the schema changes in `migrations/schema.sql`, you have two options:

**Option 1: Reset database (⚠️ loses all data)**
```bash
rm backend/data/translations.db
# Restart server
```

**Option 2: Manual migration (preserves data)**
```bash
# Create backup first
cp backend/data/translations.db backups/before-migration.db

# Apply new schema changes manually
sqlite3 backend/data/translations.db < backend/src/db/migrations/new-changes.sql
```

## Files

- **`backend/src/db/database.js`** - Database connection and schema utilities
- **`backend/src/db/migrations/schema.sql`** - Complete database schema
- **`backend/src/services/dbInit.service.js`** - Initialization logic
- **`backend/src/server.js`** - Calls bootstrap on startup
- **`backend/src/config/index.js`** - Configuration including database path

## Security

- Database is stored locally, not exposed via HTTP
- Database file is in `.gitignore` to prevent accidental commits
- Use environment variables to configure paths (never hardcode)
- In production, consider:
  - Regular backups
  - Read-only replicas for analytics
  - Encrypted storage volumes

## Performance

The SQLite database is suitable for:
- ✅ Single-server deployments
- ✅ Moderate traffic (< 10,000 requests/day)
- ✅ Development and testing
- ✅ Small to medium datasets (< 1GB)

For larger deployments, consider:
- PostgreSQL or MySQL for multi-server setups
- Redis for session storage
- Separate read replicas for analytics
