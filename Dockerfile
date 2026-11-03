# syntax=docker/dockerfile:1

# One small runtime image: the Next.js standalone server, headless Chromium for
# PDFs, and two bundled scripts (migrations, seed). Background jobs run inside
# the app process (JOBS_MODE=inline), so there is no separate worker, Redis or
# MinIO: files live in a volume. It fits a 1 vCPU / 2 GB / 20 GB server, and it
# is built by GitHub Actions (ghcr.io), so the server never builds anything.

# ── Build (postinstall generates the Prisma client) ─────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# The Prisma CLI (client generation at install time) looks for OpenSSL.
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends openssl >/dev/null \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build && npm run build:tools

# ── Runtime ─────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
# Links the ghcr.io package to the repository (and its public visibility).
LABEL org.opencontainers.image.source=https://github.com/sherniyozov00-hub/second-renaissance-journal
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    JOBS_MODE=inline \
    APP_INTERNAL_URL=http://127.0.0.1:3000

# Chromium headless shell and its libraries only (not the three full browsers).
COPY --from=builder /app/node_modules/playwright-core /tmp/playwright-core
RUN node /tmp/playwright-core/cli.js install --with-deps --only-shell chromium \
 && rm -rf /tmp/playwright-core /var/lib/apt/lists/* /var/cache/apt/archives/*.deb \
 && mkdir -p /app/.data && chown node:node /app/.data

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# The standalone trace keeps only part of playwright-core (no browsers.json);
# the full package is ~10 MB.
COPY --from=builder /app/node_modules/playwright-core ./node_modules/playwright-core
COPY --from=builder /app/.docker ./.docker
COPY --from=builder /app/prisma/migrations ./.docker/migrations
COPY deploy/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

USER node
EXPOSE 3000
# Uploaded manuscripts, generated PDFs and certificates.
VOLUME ["/app/.data"]
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["docker-entrypoint.sh"]
