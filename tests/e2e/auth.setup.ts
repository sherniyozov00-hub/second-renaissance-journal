import { test as setup } from "@playwright/test";
import { login, staffLogin, USERS } from "./helpers";

// One sign-in per role (OTP sending is rate limited); the specs reuse the sessions.
setup("author signs in with an SMS code", async ({ page }) => {
  await login(page, USERS.author, "/kabinet");
  await page.context().storageState({ path: "tests/e2e/.auth/author.json" });
});

setup("admin signs in to the admin panel with its own password", async ({ page }) => {
  // A site session alone does not open /admin.
  await login(page, USERS.admin, "/kabinet");
  await page.goto("/admin");
  await page.waitForURL(/\/admin\/kirish/);
  await staffLogin(page);
  await page.context().storageState({ path: "tests/e2e/.auth/admin.json" });
});
