/**
 * Background worker (TZ 4): PDF generation and notifications.
 * Run with `npm run worker`; in docker compose it is the `worker` service.
 */
import "dotenv/config";
import { getBoss, QUEUES, type JobData, type QueueName } from "../lib/jobs";
import { runJob } from "../lib/jobs/handlers";

async function main() {
  const boss = await getBoss();
  for (const queue of QUEUES) {
    await boss.work<JobData[QueueName]>(queue, { batchSize: 1 }, async (jobs) => {
      for (const job of jobs) {
        console.info(`[worker] ${queue} ${job.id}`);
        await runJob(queue, job.data);
      }
    });
  }
  console.info(`[worker] listening on ${QUEUES.join(", ")}`);
  const stop = async () => {
    await boss.stop({ graceful: true, timeout: 20_000 });
    process.exit(0);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
