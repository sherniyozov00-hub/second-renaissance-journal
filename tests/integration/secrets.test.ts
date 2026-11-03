import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getSecret, secretStatuses, setSecret } from "@/lib/secrets";
import { getSettings } from "@/lib/settings/get";

afterAll(async () => {
  await setSecret("RESEND_API_KEY", "");
  await setSecret("EMAIL_FROM", "");
  await db.$disconnect();
});

describe("integration keys from the admin panel", () => {
  it("stores keys encrypted, reads them back and never exposes them", async () => {
    delete process.env.RESEND_API_KEY;
    await setSecret("RESEND_API_KEY", "  re_test_1234567890abcd  ");
    await setSecret("EMAIL_FROM", "Jurnal <no-reply@example.uz>");

    expect(await getSecret("RESEND_API_KEY")).toBe("re_test_1234567890abcd");
    const row = await db.setting.findUniqueOrThrow({ where: { key: "secret:RESEND_API_KEY" } });
    expect(JSON.stringify(row.value)).not.toContain("re_test");

    const status = (await secretStatuses()).find((s) => s.key === "RESEND_API_KEY");
    expect(status).toMatchObject({ source: "panel", hint: "…abcd" });
    expect((await secretStatuses()).find((s) => s.key === "EMAIL_FROM")?.hint).toBe(
      "Jurnal <no-reply@example.uz>",
    );
    // Not part of the public settings that pages render.
    expect(Object.keys(await getSettings()).some((k) => k.startsWith("secret:"))).toBe(false);
  });

  it("lets the environment win and removes a key with an empty value", async () => {
    process.env.RESEND_API_KEY = "re_from_env";
    expect(await getSecret("RESEND_API_KEY")).toBe("re_from_env");
    delete process.env.RESEND_API_KEY;

    await setSecret("RESEND_API_KEY", "");
    expect(await getSecret("RESEND_API_KEY")).toBe("");
  });
});
