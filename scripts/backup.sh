#!/usr/bin/env bash
# Daily backup (TZ 17): PostgreSQL dump + uploaded files (the app's files volume).
#   ./scripts/backup.sh                       # from the project directory
#   cron: 17 3 * * * cd /opt/journal && ./scripts/backup.sh >> /var/log/journal-backup.log 2>&1
# Env: BACKUP_DIR (default /var/backups/journal), BACKUP_KEEP_DAYS (default 14).
set -euo pipefail

DIR="${BACKUP_DIR:-/var/backups/journal}"
KEEP="${BACKUP_KEEP_DAYS:-14}"
COMPOSE="${COMPOSE:-docker compose -f docker-compose.yml -f docker-compose.prod.yml}"
TS="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$DIR"
echo "[$TS] database…"
$COMPOSE exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner' \
  > "$DIR/db-$TS.dump.part"
mv "$DIR/db-$TS.dump.part" "$DIR/db-$TS.dump"

echo "[$TS] files…"
$COMPOSE exec -T app sh -c 'tar -C /app/.data -cf - .' | gzip > "$DIR/files-$TS.tar.gz.part"
mv "$DIR/files-$TS.tar.gz.part" "$DIR/files-$TS.tar.gz"

find "$DIR" -maxdepth 1 \( -name 'db-*.dump' -o -name 'files-*.tar.gz' \) -mtime +"$KEEP" -delete
echo "[$TS] done: $(du -sh "$DIR/db-$TS.dump" | cut -f1) database, $(du -sh "$DIR/files-$TS.tar.gz" | cut -f1) files"
