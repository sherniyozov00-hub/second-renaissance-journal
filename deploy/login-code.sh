#!/usr/bin/env bash
# Until an email (or SMS) provider is connected, sign-in codes are only written to
# the app log. This prints the latest one: bash /opt/journal/deploy/login-code.sh
cd "$(dirname "$0")/.." || exit 1
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --no-color app 2>/dev/null \
  | grep -E '\[(sms|email):mock\]' -A1 | tail -2
