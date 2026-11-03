#!/usr/bin/env bash
# Auto-deploy (systemd timer, every 5 minutes; installed by install.sh).
#
# GitHub Actions publishes ghcr.io/…:latest only after every check on `main`
# has passed. This script pulls it; when the image changed, it updates the
# code (compose files, Caddyfile) and restarts the app. If the new version is
# not healthy within 3 minutes, it rolls back to the previous image.
#
#   journalctl -u journal-update -n 50     # what it did
#   systemctl disable --now journal-update.timer   # turn auto-deploy off
set -euo pipefail

# Inside a function: bash reads it whole, so `git reset` below may safely
# replace this very file.
main() {
DIR=/opt/journal
cd "$DIR"
exec 9>/run/journal-update.lock
flock -n 9 || exit 0 # an update (or install.sh) is already running

DC="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
IMAGE=$(grep -s '^APP_IMAGE=' .env | cut -d= -f2- || true)
IMAGE="${IMAGE:-ghcr.io/sherniyozov00-hub/second-renaissance-journal:latest}"
REPO_IMAGE="${IMAGE%:*}"
BAD=/var/lib/journal-bad-image # a version that failed: not retried

old=$(docker image inspect -f '{{.Id}}' "$IMAGE" 2>/dev/null || true)
docker pull -q "$IMAGE" >/dev/null || { echo "pull failed (offline?)"; exit 0; }
new=$(docker image inspect -f '{{.Id}}' "$IMAGE")
[ "$old" != "$new" ] || exit 0
if [ "$new" = "$(cat "$BAD" 2>/dev/null)" ]; then
  [ -n "$old" ] && docker tag "$old" "$IMAGE" # keep running the good one
  exit 0
fi

echo "new version: ${new:7:12} (was ${old:7:12})"
[ -n "$old" ] && docker tag "$old" "$REPO_IMAGE:previous"
git fetch -q origin main && git reset -q --hard origin/main
$DC up -d --no-build --remove-orphans

healthy() {
  local cid status
  for _ in $(seq 36); do
    cid=$($DC ps -q app)
    status=$(docker inspect -f '{{.State.Health.Status}}' "$cid" 2>/dev/null || echo none)
    [ "$status" = healthy ] && return 0
    sleep 5
  done
  return 1
}

if healthy; then
  docker image prune -f >/dev/null 2>&1 || true
  echo "deployed ${new:7:12}"
elif [ -n "$old" ]; then
  echo "new version is not healthy, rolling back to ${old:7:12}"
  echo "$new" >"$BAD"
  $DC logs --tail 40 app || true
  docker tag "$old" "$IMAGE"
  $DC up -d --no-build
  exit 1
fi
}

main "$@"
