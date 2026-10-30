# syntax=docker/dockerfile:1

# Build stages use the full Debian image: it ships OpenSSL, which the Prisma
# CLI (migrate) needs. The runtime image stays slim — Prisma Client 7 talks to
# PostgreSQL through the `pg` driver adapter and needs no native engine.

# ── Dependencies (postinstall also generates the Prisma client) ─────────────
FROM node:22-bookworm AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# ── Build ────────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY . .
RUN npm run build

# ── Migrator: applies migrations and optionally seeds, then exits ───────────
FROM builder AS migrator
CMD ["sh", "-c", "npx prisma migrate deploy && if [ \"$SEED_ON_START\" = \"true\" ]; then npx prisma db seed; fi"]

# ── Runtime: minimal standalone Next.js server ──────────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
