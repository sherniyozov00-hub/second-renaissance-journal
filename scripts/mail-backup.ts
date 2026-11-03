/**
 * Off-site copy of the nightly database backup: reads the pg_dump file from
 * stdin and emails it to the administrator (SEED_ADMIN_EMAIL) through Resend,
 * with the key from the environment or the admin panel. Runs inside the app
 * container (bundled into .docker/mail-backup.mjs):
 *
 *   docker compose exec -T app node .docker/mail-backup.mjs db-….dump < db-….dump
 *
 * Exits 0 without sending when email is not connected or the dump is too big
 * for an attachment: the local copy on the server is still there.
 */
import "dotenv/config";
import { getSecret } from "@/lib/secrets";
import { siteConfig } from "@/lib/site";

const MAX_BYTES = 30 * 1024 * 1024; // Resend: 40 MB per message after base64

async function readStdin(): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(c as Buffer);
  return Buffer.concat(chunks);
}

async function main() {
  const name = process.argv[2] || "backup.dump";
  const to = (process.env.SEED_ADMIN_EMAIL || "").trim();
  const [key, from] = await Promise.all([getSecret("RESEND_API_KEY"), getSecret("EMAIL_FROM")]);
  const dump = await readStdin();
  if (!to || !key) return console.info("[backup] email is not connected: not sent");
  if (!dump.length) throw new Error("empty dump");
  if (dump.length > MAX_BYTES)
    return console.info(`[backup] ${(dump.length / 1e6).toFixed(1)} MB: too big to email`);

  const date = new Date().toISOString().slice(0, 10);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: from || "no-reply@localhost",
      to: [to],
      subject: `${siteConfig.name}: zaxira nusxa ${date}`,
      text: [
        `Baza zaxira nusxasi (${(dump.length / 1e6).toFixed(2)} MB) ilova qilingan.`,
        "Saqlab qo‘ying; tiklash: docs/deploy.md → “Zaxira nusxadan tiklash”.",
        "Yuklangan fayllar (qo‘lyozmalar, PDF) serverda: /var/backups/journal.",
      ].join("\n"),
      attachments: [{ filename: name, content: dump.toString("base64") }],
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  console.info(`[backup] emailed ${name} to ${to}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`[backup] email failed: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  });
