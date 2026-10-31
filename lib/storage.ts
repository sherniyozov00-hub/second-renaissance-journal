import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * File storage (TZ 4): S3-compatible in production (MinIO locally). Without
 * S3_* settings files go to ./.data/uploads — handy for tests. Stored files are
 * private; they are read through short-lived signed URLs (TZ 17).
 */
export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  signedUrl(key: string, ttlSec?: number): Promise<string>;
}

class S3Storage implements Storage {
  private readonly client: S3Client;
  constructor(private readonly bucket: string) {
    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? "",
        secretAccessKey: process.env.S3_SECRET_KEY ?? "",
      },
    });
  }
  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }
  async get(key: string) {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return Buffer.from(await res.Body!.transformToByteArray());
  }
  signedUrl(key: string, ttlSec = 300) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: ttlSec,
    });
  }
}

const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");

function localSignature(key: string, exp: number) {
  return createHmac("sha256", process.env.AUTH_SECRET || "dev-only-secret")
    .update(`${key}:${exp}`)
    .digest("hex");
}

/** Validates a signed local file URL (used by /api/files). */
export function verifyLocalSignature(key: string, exp: number, sig: string): boolean {
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  const a = Buffer.from(localSignature(key, exp), "hex");
  const b = Buffer.from(sig, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

class LocalStorage implements Storage {
  private file(key: string) {
    const p = path.resolve(LOCAL_ROOT, key);
    if (!p.startsWith(LOCAL_ROOT + path.sep)) throw new Error("Invalid storage key");
    return p;
  }
  async put(key: string, body: Buffer) {
    const p = this.file(key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, body);
  }
  get(key: string) {
    return readFile(this.file(key));
  }
  async signedUrl(key: string, ttlSec = 300) {
    const exp = Math.floor(Date.now() / 1000) + ttlSec;
    return `/api/files/${key}?exp=${exp}&sig=${localSignature(key, exp)}`;
  }
}

let storage: Storage | null = null;

export function getStorage(): Storage {
  if (storage) return storage;
  storage =
    process.env.S3_ENDPOINT && process.env.S3_BUCKET
      ? new S3Storage(process.env.S3_BUCKET)
      : new LocalStorage();
  return storage;
}
