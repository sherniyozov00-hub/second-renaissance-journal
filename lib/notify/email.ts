import "server-only";
import nodemailer from "nodemailer";
import { getSecret } from "@/lib/secrets";

export type EmailMessage = { to: string; subject: string; text: string; html?: string };

/**
 * Email behind one interface (TZ 4: SMTP or Resend adapter).
 * SMTP_URL → SMTP; RESEND_API_KEY → Resend HTTP API; otherwise messages are logged.
 */
export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

class MockEmailProvider implements EmailProvider {
  readonly name = "mock";
  async send(m: EmailMessage) {
    console.info(`[email:mock] to ${m.to}: ${m.subject}\n${m.text}`);
  }
}

class SmtpEmailProvider implements EmailProvider {
  readonly name = "smtp";
  private readonly transport;
  constructor(
    url: string,
    private readonly from: string,
  ) {
    this.transport = nodemailer.createTransport(url);
  }
  async send(m: EmailMessage) {
    await this.transport.sendMail({ from: this.from, ...m });
  }
}

class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}
  async send(m: EmailMessage) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: this.from,
        to: [m.to],
        subject: m.subject,
        text: m.text,
        html: m.html,
      }),
    });
    if (!res.ok) throw new Error(`Resend failed: ${res.status}`);
  }
}

let provider: { sig: string; impl: EmailProvider } | null = null;

/**
 * SMTP_URL → SMTP; RESEND_API_KEY (env or admin panel) → Resend; else logged.
 * Rebuilt when the keys change, so a key pasted in the admin panel applies
 * without a restart.
 */
export async function getEmailProvider(): Promise<EmailProvider> {
  const smtp = process.env.SMTP_URL ?? "";
  const resend = smtp ? "" : await getSecret("RESEND_API_KEY");
  const from = (await getSecret("EMAIL_FROM")) || "no-reply@localhost";
  const sig = `${smtp}|${resend}|${from}`;
  if (provider?.sig === sig) return provider.impl;
  const impl = smtp
    ? new SmtpEmailProvider(smtp, from)
    : resend
      ? new ResendEmailProvider(resend, from)
      : new MockEmailProvider();
  provider = { sig, impl };
  return impl;
}
