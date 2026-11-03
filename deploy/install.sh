#!/usr/bin/env bash
# One-command install on a fresh Ubuntu 22.04/24.04 server (docs/deploy.md, "Tez o‘rnatish").
#
#   sudo bash install.sh <domain> <admin-email>
#   e.g. sudo bash install.sh journal.uz admin@gmail.com
# The administrator signs in with this email (a code is sent to it, or with
# Google). Passing a new email later moves the admin role to it.
#
# Nothing is built on the server: it downloads the ready image that GitHub
# Actions publishes to ghcr.io (~1 GB on disk with the database and Caddy).
# Safe to run again: it updates the code and the image, keeping .env and data.
set -euo pipefail

REPO="https://github.com/sherniyozov00-hub/second-renaissance-journal.git"
DIR=/opt/journal

say() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31mXato: %s\033[0m\n' "$*" >&2; exit 1; }
# On any failure show free disk and memory: the usual causes on a small server.
trap 'rc=$?; [ $rc = 0 ] || { echo; df -h / | tail -1; free -h | sed -n 2,3p; }' EXIT

# Everything runs inside main(): bash reads the whole function before running
# it, so updating this very file (git reset below) cannot confuse it.
main() {
  local DOMAIN="${1:-}" ADMIN="${2:-}"
  [ "$(id -u)" = 0 ] || die "root sifatida ishga tushiring: sudo bash install.sh ..."
  [ -n "$DOMAIN" ] || die "domen ko‘rsatilmagan. Misol: bash install.sh journal.uz +998901234567"
  DOMAIN="${DOMAIN#http://}"; DOMAIN="${DOMAIN#https://}"; DOMAIN="${DOMAIN#www.}"; DOMAIN="${DOMAIN%/}"
  ADMIN="${ADMIN,,}"
  if [ -n "$ADMIN" ] && ! [[ "$ADMIN" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$ ]]; then
    die "admin emaili noto‘g‘ri: $ADMIN (misol: admin@gmail.com)"
  fi
  if [ ! -f "$DIR/.env" ] && [ -z "$ADMIN" ]; then
    die "admin emailini yozing. Misol: bash install.sh $DOMAIN admin@gmail.com"
  fi

  # ── 1. Swap: a safety net for 2 GB of RAM (nothing is compiled here) ──────
  if ! swapon --show | grep -q .; then
    say "Swap (1 GB) qo‘shilmoqda"
    fallocate -l 1G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=1024
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
    sysctl -q vm.swappiness=10
    echo 'vm.swappiness=10' >/etc/sysctl.d/99-journal.conf
  fi

  # ── 2. Packages and Docker ─────────────────────────────────────────────────
  say "Paketlar o‘rnatilmoqda"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq git curl openssl ca-certificates >/dev/null
  apt-get clean
  if ! command -v docker >/dev/null; then
    say "Docker o‘rnatilmoqda"
    curl -fsSL https://get.docker.com | sh >/dev/null
  fi
  systemctl enable --now docker >/dev/null 2>&1 || true
  docker compose version >/dev/null || die "docker compose topilmadi"

  # Small disk: classic overlay2 storage (the containerd image store keeps every
  # layer twice) and capped container logs. Switching stores hides old images
  # without deleting them, so remove them first.
  if ! grep -q containerd-snapshotter /etc/docker/daemon.json 2>/dev/null; then
    say "Docker kichik disk uchun sozlanmoqda"
    docker ps -aq | xargs -r docker rm -f >/dev/null 2>&1 || true
    docker system prune -af >/dev/null 2>&1 || true
    docker builder prune -af >/dev/null 2>&1 || true
    cat >/etc/docker/daemon.json <<'JSON'
{
  "features": { "containerd-snapshotter": false },
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
JSON
    systemctl restart docker
  fi

  # ── 3. Firewall: only SSH, HTTP and HTTPS ──────────────────────────────────
  # Enabled only when SSH listens on the standard port, so we never lock ourselves out.
  if command -v ufw >/dev/null && ss -ltn | grep -qE ':22\s'; then
    ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443 >/dev/null
    ufw --force enable >/dev/null
  fi

  # ── 4. Code (compose files, Caddyfile, scripts) ────────────────────────────
  if [ -d "$DIR/.git" ]; then
    say "Kod yangilanmoqda"
    git -C "$DIR" remote set-url origin "$REPO"
    git -C "$DIR" fetch -q origin main
    git -C "$DIR" reset -q --hard origin/main
  else
    say "Kod yuklab olinmoqda"
    git clone -q --depth 1 "$REPO" "$DIR" || die "kodni yuklab bo‘lmadi"
  fi
  cd "$DIR"
  # Do not let the auto-deploy timer run while we install.
  exec 9>/run/journal-update.lock
  flock 9

  # ── 5. .env (created once; secrets are generated here and never leave it) ──
  if [ ! -f .env ]; then
    say ".env yaratilmoqda"
    cp .env.example .env
    set_env DOMAIN "$DOMAIN"
    set_env NEXT_PUBLIC_SITE_URL "https://$DOMAIN"
    set_env AUTH_SECRET "$(openssl rand -base64 48 | tr -d '\n')"
    set_env POSTGRES_PASSWORD "$(openssl rand -hex 24)"
    set_env SEED_DEMO false
    set_env SEED_ADMIN_PHONE ""
    set_env OTP_MOCK_CODE ""
    set_env PAYMENTS_MODE sandbox
    chmod 600 .env
  fi
  [ -n "$ADMIN" ] && set_env SEED_ADMIN_EMAIL "$ADMIN"
  ADMIN=$(grep '^SEED_ADMIN_EMAIL=' .env | cut -d= -f2-)

  # ── 6. Download the image and start ────────────────────────────────────────
  local DC="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
  # Containers and volumes of the old layout (worker, MinIO, Redis) are not used.
  $DC down --remove-orphans >/dev/null 2>&1 || true
  docker volume rm -f second-renaissance-journal_minio-data second-renaissance-journal_redis-data >/dev/null 2>&1 || true
  docker system prune -af >/dev/null 2>&1 || true

  say "Sayt yuklab olinmoqda (bir necha daqiqa). Bo‘sh joy: $(df -h / | awk 'NR==2{print $4}')"
  $DC pull --quiet || die "rasm (image) yuklanmadi. GitHub’da Packages → second-renaissance-journal → Package settings → Change visibility → Public qiling"
  say "Sayt ishga tushirilmoqda"
  $DC up -d --no-build --remove-orphans

  say "Tekshirilmoqda (birinchi ishga tushishda 1–2 daqiqa)"
  local cid status=""
  cid=$($DC ps -q app)
  for _ in $(seq 60); do
    status=$(docker inspect -f '{{.State.Health.Status}}' "$cid" 2>/dev/null || echo none)
    [ "$status" = healthy ] && break
    sleep 5
  done
  if [ "$status" != healthy ]; then
    $DC ps
    $DC logs --tail 30 app
    die "sayt javob bermayapti (yuqoridagi yozuvlarni skrinshot qiling)"
  fi
  docker image prune -f >/dev/null 2>&1 || true

  # ── 7. Auto-deploy: every 5 minutes, take the version CI has published ────
  cat >/etc/systemd/system/journal-update.service <<UNIT
[Unit]
Description=Journal auto-deploy (new image from GitHub Actions)
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/bin/bash $DIR/deploy/auto-update.sh
UNIT
  cat >/etc/systemd/system/journal-update.timer <<'UNIT'
[Unit]
Description=Check for a new journal version every 5 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
RandomizedDelaySec=30s

[Install]
WantedBy=timers.target
UNIT
  systemctl daemon-reload
  systemctl enable --now journal-update.timer >/dev/null 2>&1

  cat <<EOF

$(printf '\033[1;32m')Tayyor!$(printf '\033[0m') Sayt ishlayapti.

  Manzil:  https://$DOMAIN
  (DNS hali tarqalmagan bo‘lsa, HTTPS bir necha daqiqadan keyin ishlaydi.)

Admin bo‘lib kirish: https://$DOMAIN/kirish — $ADMIN emailini kiriting.
Email xizmati ulanmaguncha kirish kodini serverda shu buyruq ko‘rsatadi:
  bash $DIR/deploy/login-code.sh

Disk: $(df -h / | awk 'NR==2{print $3" band, "$4" bo‘sh"}')
Avtodeploy yoqilgan: GitHub’dagi har bir yangi versiya 5 daqiqa ichida o‘zi o‘rnatiladi.
  Jurnal: journalctl -u journal-update -n 30
EOF
}

set_env() { # key value: replaces the line in .env or appends it
  local v="${2//\\/\\\\}"; v="${v//&/\\&}"; v="${v//|/\\|}"
  if grep -q "^$1=" .env; then sed -i "s|^$1=.*|$1=$v|" .env; else echo "$1=$2" >>.env; fi
}

main "$@"
