import { expect, test } from "@playwright/test";
import { makeDocx, sampleManuscript } from "../fixtures/docx";

const TITLE = `E2E sinovi: bug‘doy hosilini bashorat qilish ${Date.now().toString(36)}`;

test.describe.serial("submission to publication (TZ 7, 18)", () => {
  test("author submits, pays in the sandbox and the article goes to review", async ({
    browser,
  }) => {
    const page = await (
      await browser.newContext({ storageState: "tests/e2e/.auth/author.json" })
    ).newPage();
    await page.goto("/kabinet/yuborish");
    await page.getByLabel("Sarlavha (o‘zbekcha)").fill(TITLE);
    await page.getByLabel("Sarlavha (inglizcha)").fill("E2E: forecasting wheat yield");
    await page
      .getByLabel(/^Annotatsiya150/)
      .fill(Array.from({ length: 170 }, (_, i) => `so‘z${i}`).join(" "));
    await page.getByLabel(/^Kalit so‘zlar/).fill("bug‘doy, hosil, NDVI, bashorat, sun’iy yo‘ldosh");
    await page.getByLabel(/^Kalit so‘zlar/).blur();

    await page
      .locator("input[type=file]")
      .first()
      .setInputFiles({
        name: "maqola.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        buffer: await makeDocx(sampleManuscript()),
      });
    await expect(page.getByText("Tayyor")).toBeVisible({ timeout: 60_000 });

    await page
      .getByLabel("Maqola avval hech qayerda chop etilmaganini va originalligini tasdiqlayman")
      .check();
    await page.getByLabel(/Ommaviy oferta va nashr siyosati/).check();
    await page.getByLabel("Payme").check();
    await page.getByRole("button", { name: /so‘m to‘lash/ }).click();
    await page.waitForURL(/kabinet\/tolov\//);
    await page.getByRole("button", { name: "To‘lovni tasdiqlash" }).click();
    await page.waitForURL(/tolandi=1/);
    const card = page.locator("article").filter({ hasText: TITLE });
    await expect(card).toContainText("Taqrizda");
  });

  test("editor accepts and publishes; the article gets its public page", async ({ browser }) => {
    const page = await (
      await browser.newContext({ storageState: "tests/e2e/.auth/admin.json" })
    ).newPage();
    await page.goto(`/admin/maqolalar?q=${encodeURIComponent("E2E sinovi")}`);
    await page
      .getByRole("row")
      .filter({ hasText: TITLE })
      .getByRole("link", { name: "Ochish" })
      .click();
    await page.waitForURL(/\/admin\/maqolalar\/.+/);
    await page.getByRole("button", { name: "Biriktirish" }).click();
    await expect(page.getByText("Taqrizchi biriktirildi.")).toBeVisible();
    await page.getByRole("button", { name: "Qabul qilish" }).click();
    await expect(page.getByText("Maqola qabul qilindi.")).toBeVisible();
    const issue = page.getByLabel("Jurnal soni");
    const value = await issue.locator("option").nth(1).getAttribute("value");
    await issue.selectOption(value!);
    await page.getByLabel("Bet (dan)").fill("200");
    await page.getByLabel("Bet (gacha)").fill("209");
    await page.getByRole("button", { name: "Saqlash" }).click();
    await expect(page.getByText("Nashr ma’lumotlari saqlandi.")).toBeVisible();
    await page.getByRole("button", { name: "Nashr qilish" }).click();
    await expect(page.getByText("Maqola nashr qilindi", { exact: false })).toBeVisible({
      timeout: 120_000,
    });
    const link = await page.getByRole("link", { name: /^\/maqola\// }).innerText();
    await page.goto(link);
    await expect(page.locator("h1")).toHaveText(TITLE);
  });
});
