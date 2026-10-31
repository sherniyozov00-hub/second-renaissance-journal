#!/usr/bin/env bash
# Restore from scripts/backup.sh output (docs/deploy.md → Zaxira nusxadan tiklash).
#   ./scripts/restore.sh /var/backups/journal/db-20261031-031700.dump [/var/backups/journal/files-20261031-031700.tar.gz]
# The site is stopped while restoring; the database is replaced, not merged.
set -euo pipefail

DB_DUMP="${1:?Usage: restore.sh <db-*.dump> [files-*.tar.gz]}"
FILES="${2:-}"
COMPOSE="${COMPOSE:-docker compose -f docker-compose.yml -f docker-compose.prod.yml}"

read -r -p "This replaces the current database${FILES:+ and files}. Type YES to continue: " ok
[ "$ok" = "YES" ] || { echo "Cancelled."; exit 1; }

$COMPOSE stop app worker
echo "database…"
$COMPOSE exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' \
  < "$DB_DUMP"
if [ -n "$FILES" ]; then
  echo "files…"
  gunzip -c "$FILES" | $COMPOSE exec -T minio sh -c 'tar -C /bitnami/minio/data -xf -'
fi
# Migrations newer than the dump are applied again; then the site starts.
$COMPOSE up -d migrate app worker
echo "Restored. Check: curl -fsS https://\$DOMAIN/api/health"
