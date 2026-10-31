import { expect, test } from "@playwright/test";

test.describe("Xorazmiy AI (Ekran 3)", () => {
  test("a guest checks a paragraph once a day", async ({ browser }) => {
    const page = await (await browser.newContext()).newPage();
    await page.goto("/xorazmiy-ai#sinov");
    const box = page.getByRole("textbox", { name: "Bepul sinab ko‘ring" });
    await box.fill(
      "Paxta O‘zbekistonning asosiy qishloq xo‘jaligi ekinlaridan biri hisoblanadi. Tomchilatib sug‘orish 2010-yilda ixtiro qilingan.",
    );
    await page.getByRole("button", { name: "Faktlarni tekshirish" }).click();
    const wrong = page.locator("li").filter({ hasText: "Noto‘g‘ri" }).first();
    await expect(wrong).toBeVisible();
    // TZ 10.2: every "incorrect" verdict carries a real source link.
    await expect(wrong.locator('a[href^="https://"]')).not.toHaveCount(0);
    await box.fill("Ikkinchi sinov 2020-yilda.");
    await page.getByRole("button", { name: "Faktlarni tekshirish" }).click();
    await expect(page.getByText("AI limiti tugadi", { exact: false })).toBeVisible();
  });

  test.describe("workspace", () => {
    test.use({ storageState: "tests/e2e/.auth/author.json" });

    test("fact check marks the text and edits are tracked changes", async ({ page }) => {
      await page.goto("/kabinet/yozish");
      await page.getByLabel("Maqola mavzusi").fill("E2E: tomchilatib sug‘orish");
      await page.getByRole("button", { name: "Yaratish" }).click();
      await page.waitForURL(/\/kabinet\/yozish\/.+/);
      const editor = page.locator(".ai-editor");
      await editor.click();
      await page.keyboard.press("Control+End");
      await page.keyboard.type(
        "Tomchilatib sug‘orish 2010-yilda ixtiro qilingan va bugun keng qo‘llaniladi. Ushbu maqolada biz shuni ko‘rib chiqamizki usul baholanadi.",
      );
      await page.getByRole("button", { name: "Fakt tekshiruvi" }).click();
      await page.getByRole("button", { name: "Faktlarni tekshirish" }).click();
      await expect(page.locator(".fact-incorrect")).toHaveText(
        "Tomchilatib sug‘orish 2010-yilda ixtiro qilingan",
      );
      const card = page.locator("article").filter({ hasText: "Noto‘g‘ri" }).first();
      await expect(card.locator('a[href^="https://"]')).not.toHaveCount(0);

      await page.getByRole("tab", { name: "Tahrir" }).click();
      await page.getByRole("button", { name: "Tahrir takliflarini olish" }).click();
      const edit = page.locator("article").filter({ hasText: "Ortiqcha kirish" }).first();
      await expect(edit).toBeVisible();
      await expect(editor.locator("del")).not.toHaveCount(0);
      await edit.getByRole("button", { name: "Qabul qilish" }).click();
      await expect(editor).not.toContainText("biz shuni ko‘rib chiqamizki");
    });
  });
});
