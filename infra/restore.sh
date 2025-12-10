#!/bin/bash
# Restore script for marine-term-translations platform database backups

if [ -z "$1" ]; then
  echo "Usage: $0 <backup-file>"
  echo "Example: $0 backups/translations-20231210-120000.db"
  exit 1
fi

BACKUP_FILE="$1"
DB_PATH="backend/data/translations.db"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "⚠️  Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Create backup of current database before restoring
if [ -f "$DB_PATH" ]; then
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  cp "$DB_PATH" "backups/before-restore-${TIMESTAMP}.db"
  echo "✓ Current database backed up to: backups/before-restore-${TIMESTAMP}.db"
fi

# Restore from backup
cp "$BACKUP_FILE" "$DB_PATH"
echo "✓ Database restored from: $BACKUP_FILE"
echo ""
echo "Please restart the backend container:"
echo "  docker compose restart backend"
