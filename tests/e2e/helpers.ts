import { expect, type Page } from "@playwright/test";

/** Seed users (prisma/seed.ts); OTP_MOCK_CODE=123456 in the test environment. */
export const USERS = {
  admin: "90 000 00 01",
  editor: "90 000 00 02",
  reviewer: "90 000 00 03",
  author: "90 000 00 04",
} as const;

export async function login(page: Page, phone: string, next: string) {
  await page.goto(`/kirish?next=${encodeURIComponent(next)}`);
  // Phone sign-in is a second tab (email is the default) in the test setup.
  await page.getByRole("tab", { name: "Telefon" }).click();
  await page.getByLabel("Telefon raqami").fill(phone);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Kod yuborish" }).click();
  await page.getByLabel("6 xonali kod").fill(process.env.OTP_MOCK_CODE ?? "123456");
  await page.getByRole("button", { name: "Kirish", exact: true }).click();
  await page.waitForURL((u) => u.pathname === next.split("?")[0], { timeout: 60_000 });
}

/** Demo staff password (prisma/seed.ts, SEED_STAFF_PASSWORD in CI). */
export const STAFF_PASSWORD = process.env.SEED_STAFF_PASSWORD ?? "Demo-Admin-2026";

/** The admin panel has its own sign-in: email + admin password at /admin/kirish. */
export async function staffLogin(page: Page, email = "admin@example.com") {
  await page.goto("/admin/kirish");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Admin paroli").fill(STAFF_PASSWORD);
  await page.getByRole("button", { name: "Kirish", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/admin", { timeout: 60_000 });
}

/** TZ 17: nothing scrolls sideways at 360 px. */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}
