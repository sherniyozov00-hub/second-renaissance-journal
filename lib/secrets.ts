import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Integration keys an administrator can paste in the admin panel
 * (/admin/integratsiyalar) instead of editing .env on the server. An
 * environment variable with the same name always wins. Values are stored in
 * the Setting table encrypted with AES-256-GCM under a key derived from
 * AUTH_SECRET, and are never sent back to the browser.
 */
export const SECRET_KEYS = [
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "ANTHROPIC_API_KEY",
] as const;
export type SecretKey = (typeof SECRET_KEYS)[number];

/** Not secret: shown in full in the admin panel. */
export const PUBLIC_KEYS: readonly SecretKey[] = ["EMAIL_FROM", "AUTH_GOOGLE_ID"];

const PREFIX = "secret:";
const TTL_MS = 30_000;
let cache: { at: number; values: Map<SecretKey, string> } | null = null;

function key() {
  const base = process.env.AUTH_SECRET || "dev-only-secret";
  return createHash("sha256").update(`integration-secrets:${base}`).digest();
}

type Sealed = { iv: string; tag: string; data: string };

function seal(plain: string): Sealed {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return {
    iv: iv.toString("base64"),
    tag: c.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  };
}

function open(s: Sealed): string | null {
  try {
    const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(s.iv, "base64"));
    d.setAuthTag(Buffer.from(s.tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(s.data, "base64")), d.final()]).toString("utf8");
  } catch {
    return null; // AUTH_SECRET changed: the value must be entered again
  }
}

async function stored(): Promise<Map<SecretKey, string>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.values;
  const values = new Map<SecretKey, string>();
  try {
    const rows = await db.setting.findMany({
      where: { key: { in: SECRET_KEYS.map((k) => PREFIX + k) } },
    });
    for (const r of rows) {
      const v = open(r.value as Sealed);
      if (v) values.set(r.key.slice(PREFIX.length) as SecretKey, v);
    }
  } catch (err) {
    console.error("[secrets] read failed", err);
  }
  cache = { at: Date.now(), values };
  return values;
}

/** The value from the environment, else from the admin panel, else "". */
export async function getSecret(name: SecretKey): Promise<string> {
  const env = process.env[name]?.trim();
  if (env) return env;
  return (await stored()).get(name) ?? "";
}

export type SecretStatus = {
  key: SecretKey;
  source: "env" | "panel" | "none";
  /** Full value for public keys, the last 4 characters for secrets. */
  hint: string;
};

export async function secretStatuses(): Promise<SecretStatus[]> {
  const values = await stored();
  return SECRET_KEYS.map((k) => {
    const env = process.env[k]?.trim();
    const value = env || values.get(k) || "";
    const source = env ? "env" : value ? "panel" : "none";
    const hint = !value ? "" : PUBLIC_KEYS.includes(k) ? value : `…${value.slice(-4)}`;
    return { key: k, source, hint };
  });
}

/** Saves (or with an empty value, removes) a key entered in the admin panel. */
export async function setSecret(name: SecretKey, value: string): Promise<void> {
  const v = value.trim();
  if (v) {
    const sealed = seal(v);
    await db.setting.upsert({
      where: { key: PREFIX + name },
      update: { value: sealed },
      create: { key: PREFIX + name, value: sealed },
    });
  } else {
    await db.setting.deleteMany({ where: { key: PREFIX + name } });
  }
  cache = null;
}
