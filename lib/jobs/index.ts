import "server-only";
import { PgBoss } from "pg-boss";

/**
 * Background jobs (TZ 4): pg-boss on the same PostgreSQL — no extra service.
 * JOBS_MODE=inline runs handlers immediately (tests, single-process setups).
 */
export const QUEUES = ["pdf.article", "pdf.certificate", "notify", "issue.announce"] as const;
export type QueueName = (typeof QUEUES)[number];

export type JobData = {
  "pdf.article": { articleId: string };
  "pdf.certificate": { certificateId: string };
  notify: { userId: string; event: import("@/lib/notify/templates").NotifyEvent };
  "issue.announce": { issueId: string };
};

let boss: Promise<PgBoss> | null = null;

export function getBoss(): Promise<PgBoss> {
  boss ??= (async () => {
    const b = new PgBoss({ connectionString: process.env.DATABASE_URL, schema: "pgboss" });
    b.on("error", (err) => console.error("[jobs]", err));
    await b.start();
    for (const q of QUEUES) await b.createQueue(q);
    return b;
  })();
  return boss;
}

export async function enqueue<Q extends QueueName>(queue: Q, data: JobData[Q]): Promise<void> {
  if (process.env.JOBS_MODE === "inline") {
    try {
      const { runJob } = await import("./handlers");
      await runJob(queue, data);
    } catch (err) {
      console.error(`[jobs] inline ${queue} failed`, err);
    }
    return;
  }
  try {
    await (
      await getBoss()
    ).send(queue, data, { retryLimit: 3, retryDelay: 30, retryBackoff: true });
  } catch (err) {
    // A failed enqueue must never break the editorial action itself.
    console.error(`[jobs] enqueue ${queue} failed`, err);
  }
}
