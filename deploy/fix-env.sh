#!/usr/bin/env bash
# One-off corrections of the server's .env that code updates bring along
# (called by install.sh and by every auto-deploy check). Idempotent.
#   - PAYMENTS_MODE=sandbox on a real domain → live: the sandbox checkout lets
#     anyone mark a payment paid, so production must not run it.
# Restarts the app when something changed (unless --no-restart).
set -euo pipefail
DIR="${1:-/opt/journal}"
cd "$DIR"
[ -f .env ] || exit 0
changed=0

domain=$(grep -s '^DOMAIN=' .env | cut -d= -f2- || true)
if [ -n "$domain" ] && [ "$domain" != "localhost" ] && grep -q '^PAYMENTS_MODE=sandbox' .env; then
  sed -i 's/^PAYMENTS_MODE=sandbox/PAYMENTS_MODE=live/' .env
  echo ".env: PAYMENTS_MODE=live"
  changed=1
fi

if [ "$changed" = 1 ] && [ "${2:-}" != "--no-restart" ]; then
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-build app
fi
