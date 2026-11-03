#!/usr/bin/env bash
# Installs (or updates) the systemd timers of the journal server. Idempotent:
# called by install.sh and on every auto-deploy check, so new timers reach the
# server through a normal code update.
#   journal-update.timer  every 5 minutes: auto-deploy (deploy/auto-update.sh)
#   journal-backup.timer  every night 03:17 Tashkent time: scripts/backup.sh
set -euo pipefail
DIR="${1:-/opt/journal}"
changed=0

put() { # path content: writes only when different
  if [ "$(cat "$1" 2>/dev/null)" != "$2" ]; then
    printf '%s\n' "$2" >"$1"
    changed=1
  fi
}

put /etc/systemd/system/journal-update.service "[Unit]
Description=Journal auto-deploy (new image from GitHub Actions)
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/bin/bash $DIR/deploy/auto-update.sh"

put /etc/systemd/system/journal-update.timer "[Unit]
Description=Check for a new journal version every 5 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
RandomizedDelaySec=30s

[Install]
WantedBy=timers.target"

put /etc/systemd/system/journal-backup.service "[Unit]
Description=Journal nightly backup (database + files; database emailed to the admin)
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
Nice=10
ExecStart=/usr/bin/bash $DIR/scripts/backup.sh"

# 22:17 UTC = 03:17 in Tashkent (UTC+5). Persistent: runs after a missed night.
put /etc/systemd/system/journal-backup.timer "[Unit]
Description=Journal backup every night

[Timer]
OnCalendar=*-*-* 22:17:00 UTC
Persistent=true
RandomizedDelaySec=10min

[Install]
WantedBy=timers.target"

if [ "$changed" = 1 ]; then
  systemctl daemon-reload
fi
for t in journal-update.timer journal-backup.timer; do
  systemctl is-enabled --quiet "$t" 2>/dev/null || systemctl enable --now "$t" >/dev/null 2>&1
done
