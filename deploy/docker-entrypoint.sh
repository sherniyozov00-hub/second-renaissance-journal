#!/bin/sh
# Container start: apply migrations, seed (idempotent), then serve the site.
set -e
node .docker/migrate.mjs .docker/migrations
if [ "${SEED_ON_START:-true}" = "true" ]; then
  node .docker/seed.mjs
fi
exec node server.js
