#!/usr/bin/env bash
# Nightly backup (TZ 17), run by journal-backup.timer (deploy/ensure-units.sh):
#   1. PostgreSQL dump + uploaded files (the app's files volume) into
#      /var/backups/journal, the last BACKUP_KEEP_DAYS days (default 7);
#   2. the database dump is also emailed to the administrator (off-site copy),
#      when email (Resend) is connected.
# By hand: cd /opt/journal && ./scripts/backup.sh   ·   log: journalctl -u journal-backup
# Env: BACKUP_DIR, BACKUP_KEEP_DAYS, BACKUP_EMAIL=0 (do not email).
set -euo pipefail
cd "$(dirname "$0")/.."

DIR="${BACKUP_DIR:-/var/backups/journal}"
KEEP="${BACKUP_KEEP_DAYS:-7}"
COMPOSE="${COMPOSE:-docker compose -f docker-compose.yml -f docker-compose.prod.yml}"
TS="$(date +%Y%m%d-%H%M%S)"
MIN_FREE_MB=1500 # keep the small disk from filling up

free_mb() { df -Pm "$DIR" | awk 'NR==2{print $4}'; }

mkdir -p "$DIR"
chmod 700 "$DIR"
# Old backups first, then make room if the disk is still short.
find "$DIR" -maxdepth 1 \( -name 'db-*.dump' -o -name 'files-*.tar.gz' \) -mtime +"$KEEP" -delete
while [ "$(free_mb)" -lt "$MIN_FREE_MB" ]; do
  oldest=$(ls -1tr "$DIR"/files-*.tar.gz 2>/dev/null | head -1 || true)
  [ -n "$oldest" ] || oldest=$(ls -1tr "$DIR"/db-*.dump 2>/dev/null | head -1 || true)
  [ -n "$oldest" ] || break
  echo "[$TS] low disk: removing $(basename "$oldest")"
  rm -f "$oldest"
done

echo "[$TS] database…"
$COMPOSE exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner' \
  >"$DIR/db-$TS.dump.part"
mv "$DIR/db-$TS.dump.part" "$DIR/db-$TS.dump"

if [ "$(free_mb)" -ge "$MIN_FREE_MB" ]; then
  echo "[$TS] files…"
  $COMPOSE exec -T app sh -c 'tar -C /app/.data -cf - .' | gzip >"$DIR/files-$TS.tar.gz.part"
  mv "$DIR/files-$TS.tar.gz.part" "$DIR/files-$TS.tar.gz"
else
  echo "[$TS] files skipped: less than ${MIN_FREE_MB} MB free"
fi
chmod 600 "$DIR"/db-*.dump "$DIR"/files-*.tar.gz 2>/dev/null || true

if [ "${BACKUP_EMAIL:-1}" = 1 ]; then
  $COMPOSE exec -T app node .docker/mail-backup.mjs "db-$TS.dump" <"$DIR/db-$TS.dump" ||
    echo "[$TS] email copy failed (the local copy is kept)"
fi

echo "[$TS] done: $(du -sh "$DIR/db-$TS.dump" | cut -f1) database$(
  [ -f "$DIR/files-$TS.tar.gz" ] && echo ", $(du -sh "$DIR/files-$TS.tar.gz" | cut -f1) files"
), $(free_mb) MB free"
