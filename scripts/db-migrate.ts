/**
 * Applies prisma/migrations to the database, like `prisma migrate deploy`,
 * without shipping the Prisma CLI (~200 MB with its dependencies) in the
 * server image. Bundled into .docker/migrate.mjs by `npm run build:tools`.
 *
 * Writes the same `_prisma_migrations` table, so the Prisma CLI can take over
 * at any time (`prisma migrate status` / `deploy` see these as applied).
 *
 *   node migrate.mjs [migrations-dir]      # DATABASE_URL from the environment
 */
import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const LOCK_KEY = 72707369; // any constant: one migrator at a time

async function main() {
  const dir = path.resolve(process.argv[2] ?? "prisma/migrations");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const db = new Client({ connectionString: url });
  await db.connect();
  try {
    await db.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
    await db.query(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )`);

    const { rows } = await db.query<{ migration_name: string; finished_at: Date | null }>(
      `SELECT migration_name, finished_at FROM "_prisma_migrations" WHERE rolled_back_at IS NULL`,
    );
    const failed = rows.find((r) => !r.finished_at);
    if (failed) {
      throw new Error(
        `Migration ${failed.migration_name} failed earlier; fix it by hand (prisma migrate resolve)`,
      );
    }
    const applied = new Set(rows.map((r) => r.migration_name));

    const names = (await readdir(dir, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    let count = 0;
    for (const name of names) {
      if (applied.has(name)) continue;
      const sql = await readFile(path.join(dir, name, "migration.sql"), "utf8");
      const id = randomUUID();
      const checksum = createHash("sha256").update(sql).digest("hex");
      await db.query(
        `INSERT INTO "_prisma_migrations" (id, checksum, migration_name) VALUES ($1, $2, $3)`,
        [id, checksum, name],
      );
      try {
        // One simple-protocol query: the whole file runs as one transaction.
        await db.query(sql);
      } catch (err) {
        await db.query(`UPDATE "_prisma_migrations" SET logs = $2 WHERE id = $1`, [
          id,
          String(err),
        ]);
        throw new Error(`Migration ${name} failed: ${(err as Error).message}`);
      }
      await db.query(
        `UPDATE "_prisma_migrations" SET finished_at = now(), applied_steps_count = 1 WHERE id = $1`,
        [id],
      );
      console.info(`[migrate] applied ${name}`);
      count++;
    }
    console.info(count ? `[migrate] ${count} migration(s) applied` : "[migrate] up to date");
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error(`[migrate] ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
