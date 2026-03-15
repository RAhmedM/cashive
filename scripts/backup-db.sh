#!/bin/bash
# cashive.gg — PostgreSQL Backup Script
# Run via crontab: 0 4 * * * /root/cashive/scripts/backup-db.sh >> /root/cashive/logs/backup.log 2>&1

set -euo pipefail

BACKUP_DIR="/root/cashive/backups"
DB_NAME="cashive"
RETENTION_DAYS=30
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup of database '${DB_NAME}'..."

# Dump and compress
pg_dump --no-owner --no-acl "$DB_NAME" | gzip > "$BACKUP_FILE"

# Get file size
FILESIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup created: ${BACKUP_FILE} (${FILESIZE})"

# Delete backups older than retention period
DELETED=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
    echo "[$(date)] Deleted ${DELETED} backup(s) older than ${RETENTION_DAYS} days"
fi

echo "[$(date)] Backup complete"
