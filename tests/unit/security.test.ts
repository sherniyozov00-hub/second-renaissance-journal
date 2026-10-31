import { describe, expect, it } from "vitest";
import { clientIp, isSameOriginJson, tooMany } from "@/lib/security/request";

const req = (headers: Record<string, string>) =>
  new Request("http://journal.uz/api/ai/factcheck", { method: "POST", headers });

describe("CSRF guard for JSON endpoints", () => {
  it("accepts same-origin JSON and refuses forms and other sites", () => {
    expect(
      isSameOriginJson(
        req({
          "content-type": "application/json",
          origin: "http://journal.uz",
          host: "journal.uz",
        }),
      ),
    ).toBe(true);
    expect(isSameOriginJson(req({ "content-type": "application/json", host: "journal.uz" }))).toBe(
      true,
    );
    // A cross-site <form> can only send text/plain, urlencoded or multipart.
    expect(isSameOriginJson(req({ "content-type": "text/plain", host: "journal.uz" }))).toBe(false);
    expect(
      isSameOriginJson(
        req({
          "content-type": "application/json",
          origin: "https://evil.example",
          host: "journal.uz",
        }),
      ),
    ).toBe(false);
    expect(
      isSameOriginJson(
        req({ "content-type": "application/json", origin: "null", host: "journal.uz" }),
      ),
    ).toBe(false);
  });
});

describe("rate limit and client IP", () => {
  it("allows N requests a minute per key", () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) expect(tooMany("k", 3, t + i)).toBe(false);
    expect(tooMany("k", 3, t + 10)).toBe(true);
    expect(tooMany("other", 3, t + 10)).toBe(false);
    expect(tooMany("k", 3, t + 61_000)).toBe(false);
  });

  it("reads the first forwarded address", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
    expect(clientIp(new Headers({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientIp(new Headers())).toBe("0");
  });
});
