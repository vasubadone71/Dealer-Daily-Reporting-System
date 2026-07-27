#!/bin/bash
# Backup SQLite database
# Usage: ./backup.sh

BACKUP_DIR="/app/data/backups"
DB_FILE="/app/data/database.sqlite"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/backup-$DATE.sqlite"

mkdir -p "$BACKUP_DIR"

if [ -f "$DB_FILE" ]; then
    sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'"
    echo "Backup created successfully at: $BACKUP_FILE"
    
    # Keep only the last 7 days of backups
    find "$BACKUP_DIR" -type f -name "*.sqlite" -mtime +7 -exec rm {} \;
    echo "Old backups cleaned up."
else
    echo "Error: Database file not found at $DB_FILE"
    exit 1
fi
