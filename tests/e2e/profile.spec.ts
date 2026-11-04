import { expect, test } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/author.json" });

test("author fills the profile and uploads a photo; the phone stays private", async ({ page }) => {
  await page.goto("/kabinet/profil");
  const picture = await page.screenshot({
    type: "png",
    clip: { x: 0, y: 0, width: 400, height: 300 },
  });
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "me.png", mimeType: "image/png", buffer: picture });
  await expect(page.getByRole("button", { name: "Rasmni almashtirish" })).toBeVisible();

  await page.getByLabel("Telefon raqam").fill("90 765 43 21");
  await page.getByLabel("Qiziqishlar va hobbilar").fill("E2E: shaxmat, tarix");
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByText("Saqlandi")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Telefon raqam")).toHaveValue("+998907654321");
  const avatar = await page.locator('img[src^="/api/avatar/"]').first().getAttribute("src");
  const res = await page.request.get(avatar!);
  expect(res.headers()["content-type"]).toBe("image/jpeg");

  const href = await page.locator('a[href*="/muallif/"]').first().getAttribute("href");
  await page.goto(href!);
  await expect(page.getByText("E2E: shaxmat, tarix")).toBeVisible();
  expect(await page.content()).not.toContain("907654321");
});
