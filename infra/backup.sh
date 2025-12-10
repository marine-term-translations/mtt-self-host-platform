#!/bin/bash
# Backup script for marine-term-translations platform SQLite database

# Create backup directory if it doesn't exist
mkdir -p backups

# Backup database with timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DB_PATH="backend/data/translations.db"

if [ -f "$DB_PATH" ]; then
  cp "$DB_PATH" "backups/translations-${TIMESTAMP}.db"
  echo "✓ Database backed up to: backups/translations-${TIMESTAMP}.db"
else
  echo "⚠️  Database file not found at: $DB_PATH"
  exit 1
fi
