import { test as setup } from "@playwright/test";
import { login, USERS } from "./helpers";

// One sign-in per role (OTP sending is rate limited); the specs reuse the sessions.
setup("author signs in with an SMS code", async ({ page }) => {
  await login(page, USERS.author, "/kabinet");
  await page.context().storageState({ path: "tests/e2e/.auth/author.json" });
});

setup("admin signs in", async ({ page }) => {
  await login(page, USERS.admin, "/admin");
  await page.context().storageState({ path: "tests/e2e/.auth/admin.json" });
});
