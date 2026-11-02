#!/usr/bin/env bash
# One-command install on a fresh Ubuntu 22.04/24.04 server (docs/deploy.md, "Tez o‘rnatish").
#
#   sudo bash install.sh <domain> <admin-phone> [git-branch]
#   e.g. sudo bash install.sh journal.uz +998901234567
#
# Private repository: export GITHUB_TOKEN=<read-only token> before running.
# Safe to run again: it updates the code and restarts, keeping .env and data.
set -euo pipefail

DOMAIN="${1:-}"
ADMIN_PHONE="${2:-}"
BRANCH="${3:-main}"
REPO="github.com/sherniyozov00-hub/second-renaissance-journal.git"
DIR=/opt/journal

say() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31mXato: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" = 0 ] || die "root sifatida ishga tushiring: sudo bash install.sh ..."
[ -n "$DOMAIN" ] || die "domen ko‘rsatilmagan. Misol: sudo bash install.sh journal.uz +998901234567"
DOMAIN="${DOMAIN#http://}"; DOMAIN="${DOMAIN#https://}"; DOMAIN="${DOMAIN#www.}"; DOMAIN="${DOMAIN%/}"
if [ ! -f "$DIR/.env" ]; then
  [[ "$ADMIN_PHONE" =~ ^\+998[0-9]{9}$ ]] || die "admin telefoni +998XXXXXXXXX ko‘rinishida bo‘lsin"
fi

# ── 1. Swap: the server has little RAM; building the site needs ~3 GB ───────
if ! swapon --show | grep -q .; then
  say "Swap (3 GB) qo‘shilmoqda"
  fallocate -l 3G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=3072
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
  sysctl -q vm.swappiness=10
  echo 'vm.swappiness=10' >/etc/sysctl.d/99-journal.conf
fi

# ── 2. Packages and Docker ───────────────────────────────────────────────────
say "Paketlar o‘rnatilmoqda"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl openssl ca-certificates >/dev/null
if ! command -v docker >/dev/null; then
  say "Docker o‘rnatilmoqda"
  curl -fsSL https://get.docker.com | sh >/dev/null
fi
systemctl enable --now docker >/dev/null 2>&1 || true
docker compose version >/dev/null || die "docker compose topilmadi"

# Keep container logs from filling the small disk.
if [ ! -f /etc/docker/daemon.json ]; then
  echo '{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}' >/etc/docker/daemon.json
  systemctl restart docker
fi

# ── 3. Firewall: only SSH, HTTP and HTTPS ────────────────────────────────────
# Enabled only when SSH listens on the standard port, so we never lock ourselves out.
if command -v ufw >/dev/null && ss -ltn | grep -qE ':22\s'; then
  ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443 >/dev/null
  ufw --force enable >/dev/null
fi

# ── 4. Code ──────────────────────────────────────────────────────────────────
URL="https://$REPO"
[ -n "${GITHUB_TOKEN:-}" ] && URL="https://x-access-token:${GITHUB_TOKEN}@$REPO"
if [ -d "$DIR/.git" ]; then
  say "Kod yangilanmoqda"
  git -C "$DIR" remote set-url origin "$URL"
  git -C "$DIR" fetch -q origin "$BRANCH"
  git -C "$DIR" checkout -q -B "$BRANCH" "origin/$BRANCH"
else
  say "Kod yuklab olinmoqda"
  git clone -q --depth 1 -b "$BRANCH" "$URL" "$DIR" || die "kodni yuklab bo‘lmadi (repo yopiq bo‘lsa GITHUB_TOKEN kerak)"
fi
# Do not keep the token on disk.
git -C "$DIR" remote set-url origin "https://$REPO"
cd "$DIR"

# ── 5. .env (created once; secrets are generated here and never leave it) ──
if [ ! -f .env ]; then
  say ".env yaratilmoqda"
  cp .env.example .env
  set_env() { # key value
    local v="${2//\\/\\\\}"; v="${v//&/\\&}"; v="${v//|/\\|}"
    if grep -q "^$1=" .env; then sed -i "s|^$1=.*|$1=$v|" .env; else echo "$1=$2" >>.env; fi
  }
  PGPASS=$(openssl rand -hex 24)
  set_env DOMAIN "$DOMAIN"
  set_env NEXT_PUBLIC_SITE_URL "https://$DOMAIN"
  set_env AUTH_SECRET "$(openssl rand -base64 48 | tr -d '\n')"
  set_env POSTGRES_PASSWORD "$PGPASS"
  set_env S3_ACCESS_KEY "journal$(openssl rand -hex 4)"
  set_env S3_SECRET_KEY "$(openssl rand -hex 24)"
  set_env SEED_DEMO false
  set_env SEED_ADMIN_PHONE "$ADMIN_PHONE"
  set_env SEED_ADMIN_EMAIL "admin@$DOMAIN"
  set_env OTP_MOCK_CODE ""
  set_env PAYMENTS_MODE sandbox
  chmod 600 .env
fi

# ── 6. Build and start ──────────────────────────────────────────────────────
DC="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
say "Sayt yig‘ilmoqda (kichik serverda 10–25 daqiqa ketadi)"
$DC build
say "Sayt ishga tushirilmoqda"
$DC up -d --remove-orphans

# Free the build cache: the disk is small.
docker builder prune -af >/dev/null 2>&1 || true
docker image prune -f >/dev/null 2>&1 || true

ADMIN_PHONE=$(grep '^SEED_ADMIN_PHONE=' .env | cut -d= -f2-)
say "Tekshirilmoqda"
for _ in $(seq 60); do
  if $DC exec -T app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
    OK=1; break
  fi
  sleep 5
done
[ "${OK:-}" = 1 ] || { $DC ps; die "sayt javob bermayapti: $DC logs app"; }

cat <<EOF

$(printf '\033[1;32m')Tayyor!$(printf '\033[0m') Sayt ishlayapti.

  Manzil:  https://$DOMAIN
  (DNS hali tarqalmagan bo‘lsa, HTTPS bir necha daqiqadan keyin ishlaydi.)

Admin bo‘lib kirish: https://$DOMAIN/kirish — $ADMIN_PHONE raqamini kiriting.
SMS xizmati hali ulanmagan, kodni serverda shu buyruq ko‘rsatadi:
  cd $DIR && $DC logs app | grep 'sms:mock' | tail -1

Holat:     cd $DIR && $DC ps
Yangilash: sudo bash $DIR/deploy/install.sh $DOMAIN
EOF
