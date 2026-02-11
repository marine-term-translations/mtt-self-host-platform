# Infrastructure Scripts

This directory contains utility scripts for managing the Marine Term Translations platform.

## Available Scripts

### backup.sh

Backs up the SQLite database to the `backups/` directory with a timestamp.

```bash
sh infra/backup.sh
```

Creates a backup file like: `backups/translations-20231210-120000.db`

### restore.sh

Restores the database from a backup file. Automatically backs up the current database before restoring.

```bash
sh infra/restore.sh backups/translations-20231210-120000.db
```

After restoring, restart the backend:
```bash
docker compose restart backend
```

### rebuild.sh

Rebuilds and restarts all containers. Optionally wipes the database.

```bash
# Normal rebuild (keeps data)
sh infra/rebuild.sh

# Rebuild and wipe database (⚠️ deletes all data)
sh infra/rebuild.sh --wipe
```
