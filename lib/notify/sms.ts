import "server-only";

/**
 * SMS behind one interface (TZ 4: Eskiz.uz or similar, via an adapter).
 * SMS_PROVIDER=mock (default) logs messages instead of sending them.
 */
export interface SmsProvider {
  readonly name: string;
  send(phone: string, text: string): Promise<void>;
}

class MockSmsProvider implements SmsProvider {
  readonly name = "mock";
  async send(phone: string, text: string) {
    console.info(`[sms:mock] to ${phone}: ${text}`);
  }
}

/** Eskiz.uz notify API: token login, then message/sms/send. */
class EskizSmsProvider implements SmsProvider {
  readonly name = "eskiz";
  private token: { value: string; expires: number } | null = null;
  private readonly base = "https://notify.eskiz.uz/api";

  constructor(
    private readonly email: string,
    private readonly password: string,
    private readonly from: string,
  ) {}

  private async getToken(): Promise<string> {
    if (this.token && this.token.expires > Date.now()) return this.token.value;
    const body = new FormData();
    body.set("email", this.email);
    body.set("password", this.password);
    const res = await fetch(`${this.base}/auth/login`, { method: "POST", body });
    if (!res.ok) throw new Error(`Eskiz login failed: ${res.status}`);
    const json = (await res.json()) as { data?: { token?: string } };
    if (!json.data?.token) throw new Error("Eskiz login returned no token");
    // Tokens live 30 days; refresh daily to be safe.
    this.token = { value: json.data.token, expires: Date.now() + 24 * 3600 * 1000 };
    return this.token.value;
  }

  async send(phone: string, text: string) {
    const body = new FormData();
    body.set("mobile_phone", phone.replace(/^\+/, ""));
    body.set("message", text);
    body.set("from", this.from);
    const res = await fetch(`${this.base}/message/sms/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await this.getToken()}` },
      body,
    });
    if (!res.ok) throw new Error(`Eskiz send failed: ${res.status}`);
  }
}

let provider: SmsProvider | null = null;

export function getSmsProvider(): SmsProvider {
  if (provider) return provider;
  const { SMS_PROVIDER, SMS_ESKIZ_EMAIL, SMS_ESKIZ_PASSWORD, SMS_ESKIZ_FROM } = process.env;
  provider =
    SMS_PROVIDER === "eskiz" && SMS_ESKIZ_EMAIL && SMS_ESKIZ_PASSWORD
      ? new EskizSmsProvider(SMS_ESKIZ_EMAIL, SMS_ESKIZ_PASSWORD, SMS_ESKIZ_FROM || "4546")
      : new MockSmsProvider();
  return provider;
}
